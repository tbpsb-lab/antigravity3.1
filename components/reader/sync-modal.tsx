'use client'

import { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  QrCode,
  X,
  Check,
  Copy,
  ExternalLink,
  Camera,
  Laptop,
  Smartphone,
  Tablet,
  Trash2,
  Loader2,
  ZoomIn,
  Sun,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateQRMatrix, qrMatrixToSvgPath } from '@/lib/qr-code'
import {
  getSyncVaultId,
  setSyncVaultId,
  getPairedDevices,
  removePairedDevice,
  upsertPairedDevice,
  generateSyncUrl,
  parseSyncInput,
  type SyncedDevice,
  type ParsedSyncResult,
} from '@/lib/device-sync'
import { triggerHaptic } from '@/lib/haptics'

type SyncModalProps = {
  open: boolean
  onClose: () => void
  onManualSyncCodeApplied?: (newVaultId: string) => void
  onApplySyncUrlParams?: (params: ParsedSyncResult) => void
  onDeviceRemoved?: (deviceId: string, deviceName: string) => void
  index?: number
  pageNumber?: number
  wpm?: number
  chunkSize?: number
  theme?: string
  fontFace?: string
}

export const SyncModal = memo(function SyncModal({
  open,
  onClose,
  onManualSyncCodeApplied,
  onApplySyncUrlParams,
  onDeviceRemoved,
  index,
  pageNumber,
  wpm,
  chunkSize,
  theme,
  fontFace,
}: SyncModalProps) {
  const [vaultId, setVaultId] = useState<string>('')
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [devices, setDevices] = useState<SyncedDevice[]>([])

  // Kamera ile Karekod Tarama Durumları
  const [isScanning, setIsScanning] = useState(false)
  const [isCameraLoading, setIsCameraLoading] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [newlyConnectedDeviceId, setNewlyConnectedDeviceId] = useState<string | null>(null)
  const [connectedSuccessMsg, setConnectedSuccessMsg] = useState<string | null>(null)
  const [isQrZoomed, setIsQrZoomed] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanTimerRef = useRef<number | null>(null)
  const wakeLockRef = useRef<any>(null)
  const zoomMountedAtRef = useRef<number>(0)

  // Ekranı tam parlaklıkta ve açık tutma kontrolleri
  const requestBrightnessAndFullscreen = useCallback(() => {
    // 1. Ekran kararmasını önle (Screen Wake Lock)
    try {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && (navigator as any).wakeLock) {
        (navigator as any).wakeLock.request('screen').then((lock: any) => {
          wakeLockRef.current = lock
        }).catch(() => {})
      }
    } catch {}

    // 2. Tam Ekran modu ile tüm ekranı parlak beyaz ışığa dönüştür (Fullscreen API - Çapraz Tarayıcı & Webkit)
    try {
      const doc = typeof document !== 'undefined' ? (document as any) : null
      if (doc && !doc.fullscreenElement && !doc.webkitFullscreenElement) {
        const el = document.documentElement as any
        const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen
        if (req) {
          req.call(el).catch(() => {})
        }
      }
    } catch {}
  }, [])

  const releaseBrightnessAndFullscreen = useCallback(() => {
    // 1. Wake lock serbest bırak
    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release()
      } catch {}
      wakeLockRef.current = null
    }

    // 2. Tam ekrandan çık
    try {
      const doc = typeof document !== 'undefined' ? (document as any) : null
      if (doc && (doc.fullscreenElement || doc.webkitFullscreenElement)) {
        const exit = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen
        if (exit) {
          exit.call(doc).catch(() => {})
        }
      }
    } catch {}
  }, [])

  const handleCloseZoom = useCallback(() => {
    setIsQrZoomed(false)
    releaseBrightnessAndFullscreen()
    triggerHaptic('tap')
  }, [releaseBrightnessAndFullscreen])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop())
      } catch {}
      streamRef.current = null
    }
    if (scanTimerRef.current) {
      cancelAnimationFrame(scanTimerRef.current)
      scanTimerRef.current = null
    }
    setIsScanning(false)
    setIsCameraLoading(false)
    setScanError(null)
  }, [])

  useEffect(() => {
    if (open) {
      const vId = getSyncVaultId()
      setVaultId(vId)
      setDevices(getPairedDevices())
      setScanError(null)
      setConnectedSuccessMsg(null)
      setNewlyConnectedDeviceId(null)
    } else {
      stopCamera()
      setConnectedSuccessMsg(null)
      setIsQrZoomed(false)
      releaseBrightnessAndFullscreen()
    }
  }, [open, stopCamera, releaseBrightnessAndFullscreen])

  // Büyük karekod açıkken tam parlaklık & uyanık ekran modunu yönet ve Escape ile kapat
  useEffect(() => {
    if (!isQrZoomed) {
      releaseBrightnessAndFullscreen()
      return
    }

    requestBrightnessAndFullscreen()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setIsQrZoomed(false)
        releaseBrightnessAndFullscreen()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      releaseBrightnessAndFullscreen()
    }
  }, [isQrZoomed, requestBrightnessAndFullscreen, releaseBrightnessAndFullscreen])

  // Cihazlar arası varlık (presence) güncellemelerini anında yansıt
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ deviceId?: string; deviceName?: string; isNew?: boolean }>
      const updatedList = getPairedDevices()
      setDevices(updatedList)

      const devId = customEvent?.detail?.deviceId
      if (devId) {
        setNewlyConnectedDeviceId(devId)
        if (customEvent.detail?.isNew) {
          const devName = customEvent.detail?.deviceName || 'Yeni Cihaz'
          setConnectedSuccessMsg('✓ Bağlandı: ' + devName)
          triggerHaptic('success')

          setTimeout(() => {
            onClose()
          }, 1200)
        }
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'hizlioku_paired_devices') {
        setDevices(getPairedDevices())
      }
    }

    window.addEventListener('paired-devices-updated', handleUpdate)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('paired-devices-updated', handleUpdate)
      window.removeEventListener('storage', handleStorage)
    }
  }, [onClose])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  const syncUrl = useMemo(() => {
    if (!vaultId) return ''
    return generateSyncUrl(vaultId, {
      index,
      pageNumber,
      wpm,
      chunkSize,
      theme,
      fontFace,
    })
  }, [vaultId, index, pageNumber, wpm, chunkSize, theme, fontFace])

  const { path: qrPath, size: qrSize } = useMemo(() => {
    if (!syncUrl) return { path: '', size: 29 }
    const matrix = generateQRMatrix(syncUrl)
    return qrMatrixToSvgPath(matrix)
  }, [syncUrl])

  // Yalnızca temiz eşleme kodunu kopyalar (Örn: HZL-4458)
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(vaultId)
      setCopiedCode(true)
      triggerHaptic('tap')
      setTimeout(() => setCopiedCode(false), 2000)
    } catch {}
  }

  // Kaldığınız kelime ve sayfaya anında atlayan tam senkronizasyon linkini kopyalar
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(syncUrl || vaultId)
      setCopiedLink(true)
      triggerHaptic('tap')
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {}
  }

  // Kod veya link başarıyla tespit edildiğinde anında eşleştir ve bağla
  const applyExtractedSync = useCallback((rawInput: string) => {
    const parsed = parseSyncInput(rawInput)
    if (!parsed.vaultId) return false

    setSyncVaultId(parsed.vaultId)
    setVaultId(parsed.vaultId)
    setManualCode('')

    // Karekoddan karşı cihaz bilgisi geldiyse anında yerel listeye ekle ve vurgula
    if (parsed.remoteDeviceId && parsed.remoteDeviceName) {
      upsertPairedDevice({
        id: parsed.remoteDeviceId,
        name: parsed.remoteDeviceName,
        type: parsed.remoteDeviceType || 'desktop',
      })
      setNewlyConnectedDeviceId(parsed.remoteDeviceId)
    }

    setDevices(getPairedDevices())
    triggerHaptic('success')

    try {
      onManualSyncCodeApplied?.(parsed.vaultId)
    } catch {}

    try {
      if (
        typeof parsed.index === 'number' ||
        typeof parsed.pageNumber === 'number' ||
        typeof parsed.wpm === 'number' ||
        typeof parsed.chunkSize === 'number' ||
        parsed.theme ||
        parsed.fontFace
      ) {
        onApplySyncUrlParams?.(parsed)
      }
    } catch {}

    return true
  }, [onManualSyncCodeApplied, onApplySyncUrlParams])

  const handleApplyManualCode = (e: React.FormEvent) => {
    e.preventDefault()
    const input = manualCode.trim()
    if (!input) return

    const success = applyExtractedSync(input)
    if (success) {
      setConnectedSuccessMsg('✓ Eşleşti! Cihaz bağlandı')
      setDevices(getPairedDevices())
      setTimeout(() => {
        onClose()
      }, 800)
    }
  }

  const startDetection = useCallback(() => {
    let nativeDetector: any = null
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        nativeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
      } catch {
        nativeDetector = null
      }
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    let isProcessing = false

    const checkFrame = async () => {
      const video = videoRef.current
      if (!video || video.readyState < 2) {
        scanTimerRef.current = requestAnimationFrame(checkFrame)
        return
      }

      if (isProcessing) {
        scanTimerRef.current = requestAnimationFrame(checkFrame)
        return
      }

      isProcessing = true

      try {
        let codeData: string | null = null

        // 1. Native BarcodeDetector (Donanım hızlandırmalı & Anında algılama - Chrome Android & Desktop)
        if (nativeDetector) {
          try {
            const barcodes = await nativeDetector.detect(video)
            if (barcodes && barcodes.length > 0) {
              codeData = barcodes[0].rawValue
            }
          } catch {}
        }

        // 2. Fallback: jsQR (Safari / iOS ve BarcodeDetector olmayan sistemler)
        if (!codeData && ctx && video.videoWidth > 0 && video.videoHeight > 0) {
          const w = Math.min(480, video.videoWidth)
          const h = Math.round((w / video.videoWidth) * video.videoHeight)
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w
            canvas.height = h
          }
          ctx.drawImage(video, 0, 0, w, h)
          const imgData = ctx.getImageData(0, 0, w, h)
          try {
            const jsQRModule = await import('jsqr')
            const jsQR = jsQRModule.default || jsQRModule
            const res = jsQR(imgData.data, w, h, { inversionAttempts: 'attemptBoth' })
            if (res && res.data) {
              codeData = res.data
            }
          } catch {}
        }

        if (codeData) {
          stopCamera()
          const success = applyExtractedSync(codeData)
          if (success) {
            setConnectedSuccessMsg('✓ Eşleşti! Cihaz bağlandı')
            setDevices(getPairedDevices())
            setTimeout(() => {
              onClose()
            }, 800)
          }
          return
        }
      } catch {}

      isProcessing = false
      scanTimerRef.current = requestAnimationFrame(checkFrame)
    }

    scanTimerRef.current = requestAnimationFrame(checkFrame)
  }, [applyExtractedSync, stopCamera, onClose])

  // Kamera ile Karekod Oku Başlatma
  const startCamera = useCallback(async () => {
    setIsScanning(true)
    setIsCameraLoading(true)
    setScanError(null)

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Tarayıcınız kamera erişimini desteklemiyor.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        await videoRef.current.play()
      }

      setIsCameraLoading(false)
      startDetection()
    } catch (err: any) {
      setIsCameraLoading(false)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setScanError('Kamera izni verilmedi. Lütfen ayarlardan kameraya izin verin.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setScanError('Cihazda kamera bulunamadı.')
      } else {
        setScanError('Kamera başlatılamadı: ' + (err.message || 'Hata'))
      }
    }
  }, [startDetection])

  const handleToggleScanner = () => {
    triggerHaptic('tap')
    if (isScanning) {
      stopCamera()
    } else {
      startCamera()
    }
  }

  const handleRemoveDevice = (id: string, name?: string) => {
    const updated = removePairedDevice(id)
    setDevices(updated)
    triggerHaptic('tap')
    const devName = name || 'Cihaz'
    onDeviceRemoved?.(id, devName)
    setConnectedSuccessMsg(`${devName} eşleşmesi kaldırıldı`)
    setTimeout(() => {
      setConnectedSuccessMsg(null)
    }, 2000)
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cihaz Eşleştirme ve Senkronizasyon"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-background/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[340px] sm:max-w-[360px] rounded-2xl border border-border/80 bg-background/95 p-3 sm:p-3.5 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-150 overflow-hidden flex flex-col gap-2 text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Üst Başlık (Kompakt Tek Satır) */}
        <div className="flex items-center justify-between pb-1 border-b border-border/50">
          <div className="flex items-center gap-1.5">
            <div className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
              <QrCode className="size-3.5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold leading-tight">Cihaz Eşleştir</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ctl size-6 rounded-full border border-border/40 hover:bg-muted/50 text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Kapat"
          >
            <X className="size-3" />
          </button>
        </div>

        {/* Eşleşme Başarı Bildirimi */}
        {connectedSuccessMsg && (
          <div className="flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-in fade-in zoom-in-95 duration-150">
            <Check className="size-3.5 shrink-0" />
            <span>{connectedSuccessMsg}</span>
          </div>
        )}

        {/* Orta Alan (Yatay Yan Yana): Solda Karekod / Kamera, Sağda Belirgin Karekod Oku Butonu ve Konum Bilgileri */}
        <div className="flex items-center gap-2.5 py-0.5">
          {/* Sol: Kompakt Karekod veya Kamera Vizörü (~96px) */}
          <div className="shrink-0">
            {isScanning ? (
              <div className="relative size-24 rounded-xl overflow-hidden bg-black border border-primary/40 flex items-center justify-center shadow-md">
                {isCameraLoading && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-black/85 text-white text-[9.5px]">
                    <Loader2 className="size-3.5 animate-spin text-primary" />
                    <span>Açılıyor...</span>
                  </div>
                )}

                {scanError ? (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-1.5 text-center bg-background/95 text-xs text-destructive gap-1">
                    <p className="text-[9px] leading-tight font-medium">{scanError}</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="ctl px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[8.5px] font-semibold cursor-pointer"
                    >
                      Dene
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="size-full object-cover"
                    />

                    {/* Nişangah Köşeleri */}
                    <div className="pointer-events-none absolute inset-1.5 rounded-lg border border-primary/30 flex flex-col justify-between p-0.5">
                      <div className="flex justify-between">
                        <div className="size-2 border-t-2 border-l-2 border-primary" />
                        <div className="size-2 border-t-2 border-r-2 border-primary" />
                      </div>
                      <div className="flex justify-between">
                        <div className="size-2 border-b-2 border-l-2 border-primary" />
                        <div className="size-2 border-b-2 border-r-2 border-primary" />
                      </div>
                    </div>

                    {/* Lazer Tarama Çizgisi */}
                    <div className="pointer-events-none absolute inset-x-1 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-qr-scan" />

                    <div className="absolute bottom-1 inset-x-1 z-20 flex items-center justify-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/80 px-1.5 py-0.2 text-[8px] font-medium text-white backdrop-blur-xs">
                        <span className="size-1 rounded-full bg-emerald-400 animate-pulse" />
                        Hizalayın
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    if (qrPath) {
                      zoomMountedAtRef.current = Date.now()
                      setIsQrZoomed(true)
                      requestBrightnessAndFullscreen()
                      triggerHaptic('tap')
                    }
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation()
                  }}
                  className="relative p-1.5 bg-white rounded-xl shadow-xs border-2 border-neutral-200 hover:border-primary flex items-center justify-center cursor-pointer group/qr transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/40 select-none touch-manipulation pointer-events-auto"
                  title="Karekodu Büyüt & Parlaklığı Fulle (Dokunun)"
                  aria-label="Karekodu Büyüt ve Parlaklığı Fulle"
                >
                  {qrPath ? (
                    <>
                      <svg
                        viewBox={`-4 -4 ${qrSize + 8} ${qrSize + 8}`}
                        className="size-24 shape-rendering-crispEdges text-neutral-900 fill-current transition-transform group-hover/qr:scale-102 pointer-events-none"
                        aria-label="Senkronizasyon Karekodu"
                      >
                        <path d={qrPath} />
                      </svg>
                      {/* Büyütme İpucu Rozeti */}
                      <div className="absolute inset-0 rounded-xl bg-black/10 opacity-0 group-hover/qr:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="p-1 rounded-full bg-black/75 text-white shadow-xs pointer-events-none">
                          <ZoomIn className="size-3.5" />
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="size-24 flex items-center justify-center text-muted-foreground text-[10px]">
                      Hazırlanıyor...
                    </div>
                  )}
                </button>
                <span className="text-[9px] font-medium text-muted-foreground flex items-center gap-1 select-none pointer-events-none">
                  <ZoomIn className="size-2.5 text-primary" /> Dokun & Parlat
                </span>
              </div>
            )}
          </div>

          {/* Sağ: Belirgin Temalı Karekod Oku Butonu + Konum Rozetleri */}
          <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
            {/* Göz Alıcı, Belirgin ve Temaya Göre Renkli Karekod Oku Butonu */}
            <button
              type="button"
              onClick={handleToggleScanner}
              className={cn(
                'ctl group/cam relative flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 select-none w-full',
                isScanning
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 ring-1 ring-destructive/40'
                  : theme === 'kindle'
                    ? 'bg-amber-700 hover:bg-amber-800 text-amber-50 ring-1 ring-amber-600/50 shadow-amber-900/20'
                    : theme === 'linear'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold ring-1 ring-emerald-400/60 shadow-emerald-500/30'
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground ring-1 ring-primary/40 shadow-primary/20'
              )}
              title={isScanning ? 'Kamerayı Kapat' : 'Kamerayla Karekod Oku'}
              aria-label={isScanning ? 'Kamerayı Kapat' : 'Kamerayla Karekod Oku'}
            >
              {isScanning ? (
                <>
                  <X className="size-3.5 shrink-0" />
                  <span>Kamerayı Kapat</span>
                </>
              ) : (
                <>
                  <Camera className="size-4 shrink-0 transition-transform group-hover/cam:scale-110" />
                  <span>Karekod Oku</span>
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-ping shrink-0 ml-0.5" />
                </>
              )}
            </button>

            {/* Konum Rozetleri: Sayfa, Öbek, Hız, Tema (Karekodun Yanında) */}
            <div className="flex flex-wrap items-center gap-1 text-[9px] font-mono text-muted-foreground">
              {pageNumber ? (
                <span className="rounded-md bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 font-semibold leading-none">
                  Sf {pageNumber}
                </span>
              ) : null}
              {typeof index === 'number' ? (
                <span className="rounded-md bg-muted/60 border border-border/40 px-1.5 py-0.5 leading-none">
                  {index + 1}. Kelime
                </span>
              ) : null}
              {wpm ? (
                <span className="rounded-md bg-muted/60 border border-border/40 px-1.5 py-0.5 leading-none">
                  {wpm} k/dk
                </span>
              ) : null}
              {theme ? (
                <span className="rounded-md bg-muted/60 border border-border/40 px-1.5 py-0.5 capitalize leading-none">
                  {theme === 'kindle' ? 'Kağıt' : theme === 'linear' ? 'Neon' : 'Cam'}
                </span>
              ) : null}
            </div>

            <p className="text-[9.5px] text-muted-foreground leading-tight">
              {isScanning
                ? 'Kamerayı diğer ekrandaki karekoda tutun.'
                : 'Diğer cihazdan okutun ya da karekoda dokunup ekranı parlatın.'}
            </p>
          </div>
        </div>

        {/* Eşleme Kodu ve Link Kopyalama (Tek Satır, Çift Kopyalama Butonu Kaldırıldı) */}
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border border-border/60 bg-muted/20">
          <button
            type="button"
            onClick={handleCopyCode}
            className="group/code flex items-center gap-1.5 min-w-0 cursor-pointer text-left focus:outline-none"
            title="Eşleme Kodunu Kopyala (Tıklayın)"
          >
            <span className="text-[9px] uppercase font-bold text-muted-foreground/75 tracking-wider">KOD:</span>
            <span className="font-mono text-xs sm:text-sm font-bold text-foreground tracking-wider group-hover/code:text-primary transition-colors">
              {vaultId}
            </span>
            {copiedCode ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-500 animate-in fade-in">
                <Check className="size-3 shrink-0" /> Kopyalandı
              </span>
            ) : (
              <Copy className="size-3 text-muted-foreground/40 group-hover/code:text-muted-foreground shrink-0 transition-colors" />
            )}
          </button>

          {/* Sadece Linki Kopyala Butonu (Kodu kopyalama zaten sol tarafta kodun üzerine basılarak yapılıyor) */}
          <button
            type="button"
            onClick={handleCopyLink}
            className={cn(
              'ctl inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0',
              copiedLink
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                : 'border-border/60 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground'
            )}
            title="Kaldığınız yeri doğrudan açan bağlantıyı kopyala"
            aria-label="Linki Kopyala"
          >
            {copiedLink ? (
              <>
                <Check className="size-3 text-emerald-500" />
                <span className="text-[10px] text-emerald-500">Link Alındı</span>
              </>
            ) : (
              <>
                <ExternalLink className="size-3" />
                <span className="text-[10px]">Linki Kopyala</span>
              </>
            )}
          </button>
        </div>

        {/* Manuel Kod veya Link Girişi (Toleranslı) */}
        <form onSubmit={handleApplyManualCode} className="flex gap-1.5">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Kod veya link yapıştır (örn: 4458 veya link)"
            className="flex-1 min-w-0 h-7.5 px-2.5 rounded-xl border border-border/70 bg-background text-[11px] font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
          />
          <button
            type="submit"
            disabled={!manualCode.trim()}
            className="ctl px-3 h-7.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs transition-opacity disabled:opacity-40 cursor-pointer shadow-xs shrink-0"
          >
            Bağla
          </button>
        </form>

        {/* Bağlı Cihazlar Listesi (Kompakt) */}
        {devices.length > 0 && (
          <div className="pt-1 border-t border-border/40">
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">
              Bağlı Cihazlar ({devices.length})
            </span>
            <div className="flex flex-col gap-1 max-h-20 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
              {devices.map((dev) => {
                const isNew = dev.id === newlyConnectedDeviceId
                return (
                  <div
                    key={dev.id}
                    className={cn(
                      'flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg border text-xs transition-all duration-300',
                      isNew
                        ? 'border-emerald-500/80 bg-emerald-500/15 ring-2 ring-emerald-500/40 shadow-xs animate-pulse'
                        : 'border-border/30 bg-muted/10'
                    )}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="relative shrink-0">
                        {dev.type === 'mobile' ? (
                          <Smartphone className={cn('size-3.5', isNew ? 'text-emerald-500' : 'text-sky-500')} />
                        ) : dev.type === 'tablet' ? (
                          <Tablet className={cn('size-3.5', isNew ? 'text-emerald-500' : 'text-purple-500')} />
                        ) : (
                          <Laptop className={cn('size-3.5', isNew ? 'text-emerald-500' : 'text-emerald-500')} />
                        )}
                        {isNew && (
                          <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-emerald-400 animate-ping" />
                        )}
                      </div>
                      <span className={cn('truncate text-[10px]', isNew ? 'font-bold text-emerald-600 dark:text-emerald-300' : 'font-medium')}>
                        {dev.name} {dev.isCurrent && '(Bu Cihaz)'}
                      </span>
                      {isNew && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[8px] font-bold shadow-2xs leading-none shrink-0">
                          <Check className="size-2.5" /> Yeni
                        </span>
                      )}
                    </div>
                    {!dev.isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDevice(dev.id, dev.name)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-0.5 shrink-0"
                        title="Bağlantıyı kes"
                        aria-label="Bağlantıyı kes"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Kocaman ve Maksimum Parlak Ekran Karekod Görünümü (createPortal ile gövdeye bağlanır - Stacking Context & Ghost Click korumalı) */}
      {isQrZoomed && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tam Ekran Parlak Karekod"
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-between p-4 sm:p-6 select-none cursor-pointer animate-in fade-in zoom-in-95 duration-150"
          style={{
            backgroundColor: '#ffffff',
            color: '#000000',
          }}
          onClick={(e) => {
            // Dokunma sonrasındaki 400ms içinde gelen sentetik tıklamaları yut (Ghost-click engeli)
            if (Date.now() - zoomMountedAtRef.current < 400) return
            e.stopPropagation()
            handleCloseZoom()
          }}
        >
          {/* Üst Bar: Parlaklık Rozeti, Bilgi ve Kapat Butonu */}
          <div className="w-full flex items-center justify-between pt-2 px-1 max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-900 text-xs font-bold shadow-xs">
                <Sun className="size-4 text-amber-600 animate-spin-slow" />
                <span>Maksimum Parlaklık & Uyanık Ekran</span>
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleCloseZoom()
              }}
              className="size-10 sm:size-11 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 hover:text-black flex items-center justify-center cursor-pointer transition-all active:scale-90 shadow-sm border border-neutral-300"
              aria-label="Kapat"
            >
              <X className="size-6" />
            </button>
          </div>

          {/* Orta Alan: Kocaman ve Kristal Netliğinde Karekod */}
          <div className="flex-1 flex flex-col items-center justify-center gap-3 my-auto w-full" onClick={(e) => e.stopPropagation()}>
            {/* Eşleme Kodu */}
            <div className="text-center">
              <span className="text-[11px] font-bold tracking-widest uppercase text-neutral-500 block mb-0.5">
                CİHAZ EŞLEŞTİRME KODU
              </span>
              <span className="font-mono text-3xl sm:text-4xl md:text-5xl font-black tracking-widest text-black">
                {vaultId}
              </span>
            </div>

            {/* Kocaman Karekod (Maksimum Kontrast & Keskinlik) */}
            <div
              className="p-4 sm:p-6 bg-white rounded-3xl flex items-center justify-center shadow-xl border-2 border-neutral-200 cursor-pointer transition-transform hover:scale-[1.01] active:scale-98"
              onClick={handleCloseZoom}
              title="Kapatmak için dokunun"
            >
              {qrPath && (
                <svg
                  viewBox={`-4 -4 ${qrSize + 8} ${qrSize + 8}`}
                  className="w-72 h-72 sm:w-88 sm:h-88 md:w-[420px] md:h-[420px] max-w-[85vw] max-h-[60vh] shape-rendering-crispEdges text-black fill-current"
                  aria-label="Tam Ekran Senkronizasyon Karekodu"
                >
                  <path d={qrPath} />
                </svg>
              )}
            </div>

            {/* Konum ve Hız Rozetleri */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-mono text-neutral-700">
              {pageNumber && (
                <span className="px-3 py-1 rounded-xl bg-neutral-100 font-bold border border-neutral-300">
                  Sayfa {pageNumber}
                </span>
              )}
              {typeof index === 'number' && (
                <span className="px-3 py-1 rounded-xl bg-neutral-100 font-semibold border border-neutral-300">
                  {index + 1}. Kelime
                </span>
              )}
              {wpm && (
                <span className="px-3 py-1 rounded-xl bg-neutral-100 border border-neutral-300">
                  {wpm} k/dk
                </span>
              )}
            </div>
          </div>

          {/* Alt Bilgi: Kapatma İpucu */}
          <div className="pb-3 text-center" onClick={(e) => e.stopPropagation()}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-600 text-xs font-medium border border-neutral-200">
              Kapatmak için ekrana dokunun
            </span>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
})
