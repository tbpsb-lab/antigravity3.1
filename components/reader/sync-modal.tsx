'use client'

import { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateQRMatrix, qrMatrixToSvgPath } from '@/lib/qr-code'
import {
  getSyncVaultId,
  setSyncVaultId,
  getPairedDevices,
  removePairedDevice,
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
  const [scanSuccess, setScanSuccess] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanTimerRef = useRef<number | null>(null)

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
      setScanSuccess(false)
      setScanError(null)
    } else {
      stopCamera()
    }
  }, [open, stopCamera])

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
    setDevices(getPairedDevices())
    triggerHaptic('success')

    onManualSyncCodeApplied?.(parsed.vaultId)

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

    return true
  }, [onManualSyncCodeApplied, onApplySyncUrlParams])

  const handleApplyManualCode = (e: React.FormEvent) => {
    e.preventDefault()
    const input = manualCode.trim()
    if (!input) return

    const success = applyExtractedSync(input)
    if (success) {
      onClose()
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
          setScanSuccess(true)
          stopCamera()
          const success = applyExtractedSync(codeData)
          if (success) {
            setTimeout(() => {
              onClose()
            }, 350)
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
    setScanSuccess(false)

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
        setScanError('Kamera izni verilmedi. Lütfen tarayıcı ayarlarından kameraya izin verin.')
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

  const handleRemoveDevice = (id: string) => {
    const updated = removePairedDevice(id)
    setDevices(updated)
    triggerHaptic('tap')
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cihaz Eşleştirme ve Senkronizasyon"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-background/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[330px] sm:max-w-[350px] rounded-2xl border border-border/80 bg-background/95 p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-150 overflow-hidden flex flex-col gap-2.5 text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Üst Başlık (Kompakt) */}
        <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
              <QrCode className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Cihaz Eşleştir</h3>
              <p className="text-[10px] text-muted-foreground leading-none">Ekranlar arası anında senkronizasyon</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ctl size-7 rounded-full border border-border/40 hover:bg-muted/50 text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Kapat"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Karekod veya Canlı Kamera Tarayıcı Alanı */}
        <div className="flex flex-col items-center justify-center gap-1.5 py-0.5">
          {isScanning ? (
            <div className="relative size-36 sm:size-40 rounded-xl overflow-hidden bg-black border border-primary/40 flex items-center justify-center shadow-md">
              {isCameraLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-black/85 text-white text-[11px]">
                  <Loader2 className="size-5 animate-spin text-primary" />
                  <span>Kamera açılıyor...</span>
                </div>
              )}

              {scanError ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-2.5 text-center bg-background/95 text-xs text-destructive gap-2">
                  <p className="text-[10.5px] leading-tight font-medium">{scanError}</p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="ctl px-2 py-0.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-semibold cursor-pointer"
                    >
                      Tekrar Dene
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="ctl px-2 py-0.5 rounded-lg bg-muted text-foreground text-[10px] font-semibold cursor-pointer"
                    >
                      Kapat
                    </button>
                  </div>
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

                  {/* Kamera Nişangah Köşeleri */}
                  <div className="pointer-events-none absolute inset-2 rounded-lg border border-primary/30 flex flex-col justify-between p-1">
                    <div className="flex justify-between">
                      <div className="size-3 border-t-2 border-l-2 border-primary" />
                      <div className="size-3 border-t-2 border-r-2 border-primary" />
                    </div>
                    <div className="flex justify-between">
                      <div className="size-3 border-b-2 border-l-2 border-primary" />
                      <div className="size-3 border-b-2 border-r-2 border-primary" />
                    </div>
                  </div>

                  {/* Lazer Tarama Çizgisi */}
                  <div className="pointer-events-none absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-qr-scan" />

                  {/* Kamerayı Kapat Butonu */}
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="absolute top-1.5 right-1.5 z-20 size-6 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
                    title="Kamerayı Kapat"
                    aria-label="Kamerayı Kapat"
                  >
                    <X className="size-3" />
                  </button>

                  {/* Canlı Tarama Rozeti */}
                  <div className="absolute bottom-1.5 inset-x-2 z-20 flex items-center justify-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-[9.5px] font-medium text-white backdrop-blur-xs">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Karekodu Hizalayın
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="relative p-2 bg-white rounded-xl shadow-xs border border-neutral-200 flex items-center justify-center">
              {qrPath ? (
                <svg
                  viewBox={`-4 -4 ${qrSize + 8} ${qrSize + 8}`}
                  className="size-32 sm:size-36 shape-rendering-crispEdges text-neutral-900 fill-current"
                  aria-label="Senkronizasyon Karekodu"
                >
                  <path d={qrPath} />
                </svg>
              ) : (
                <div className="size-32 flex items-center justify-center text-muted-foreground text-xs">
                  Karekod hazırlanıyor...
                </div>
              )}
            </div>
          )}

          {/* Konum Rozetleri (Kompakt Tek Satır) */}
          <div className="flex flex-wrap items-center justify-center gap-1 text-[9.5px] font-mono text-muted-foreground">
            {pageNumber ? (
              <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.2 font-semibold">
                Sayfa {pageNumber}
              </span>
            ) : null}
            {typeof index === 'number' ? (
              <span className="rounded-full bg-muted/60 border border-border/40 px-1.5 py-0.2">
                {index + 1}. Öbek
              </span>
            ) : null}
            {wpm ? (
              <span className="rounded-full bg-muted/60 border border-border/40 px-1.5 py-0.2">
                {wpm} k/dk
              </span>
            ) : null}
            {theme ? (
              <span className="rounded-full bg-muted/60 border border-border/40 px-1.5 py-0.2 capitalize">
                {theme === 'kindle' ? 'Kağıt' : theme === 'linear' ? 'Neon' : 'Cam'}
              </span>
            ) : null}
          </div>

          <p className="text-center text-[10px] text-muted-foreground leading-tight max-w-[270px]">
            {isScanning
              ? 'Diğer ekrandaki karekodu kameraya tutun, anında bağlanacaktır.'
              : 'Diğer cihazınızın kamerasıyla okutun veya siz taratın.'}
          </p>
        </div>

        {/* Eşleme Kodu ve Kompakt İşlem Simgeleri */}
        <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border border-border/60 bg-muted/20">
          <button
            type="button"
            onClick={handleCopyCode}
            className="group/code flex items-center gap-1.5 min-w-0 cursor-pointer text-left focus:outline-none"
            title="Eşleme Kodunu Kopyala (Tıklayın)"
          >
            <span className="text-[9.5px] uppercase font-bold text-muted-foreground/75 tracking-wider">KOD:</span>
            <span className="font-mono text-xs sm:text-sm font-bold text-foreground tracking-wider group-hover/code:text-primary transition-colors">
              {vaultId}
            </span>
            {copiedCode ? (
              <span className="inline-flex items-center gap-0.5 text-[9.5px] font-semibold text-emerald-500 animate-in fade-in">
                <Check className="size-3 shrink-0" /> Kopyalandı
              </span>
            ) : (
              <Copy className="size-3 text-muted-foreground/40 group-hover/code:text-muted-foreground shrink-0 transition-colors" />
            )}
          </button>

          <div className="flex items-center gap-1 shrink-0">
            {/* 1. Kodu Kopyala */}
            <button
              type="button"
              onClick={handleCopyCode}
              className={cn(
                'ctl size-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95',
                copiedCode
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                  : 'border-border/60 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground'
              )}
              title="Kodu Kopyala"
              aria-label="Kodu Kopyala"
            >
              {copiedCode ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </button>

            {/* 2. Linki Kopyala */}
            <button
              type="button"
              onClick={handleCopyLink}
              className={cn(
                'ctl size-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95',
                copiedLink
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                  : 'border-border/60 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground'
              )}
              title="Linki Kopyala (Kaldığınız Yeri Açar)"
              aria-label="Linki Kopyala"
            >
              {copiedLink ? <Check className="size-3.5" /> : <ExternalLink className="size-3.5" />}
            </button>

            {/* 3. Karekod Oku (Kamera) */}
            <button
              type="button"
              onClick={handleToggleScanner}
              className={cn(
                'ctl size-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95',
                isScanning
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'border-border/60 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground'
              )}
              title={isScanning ? 'Kamerayı Kapat' : 'Karekod Oku (Kamerayı Aç)'}
              aria-label={isScanning ? 'Kamerayı Kapat' : 'Karekod Oku (Kamerayı Aç)'}
            >
              {isScanning ? <X className="size-3.5" /> : <Camera className="size-3.5" />}
            </button>
          </div>
        </div>

        {/* Manuel Kod veya Link Girişi (Toleranslı) */}
        <form onSubmit={handleApplyManualCode} className="flex gap-1.5">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Kod veya link yapıştır (örn: 4458 veya link)"
            className="flex-1 min-w-0 h-8 px-2.5 rounded-xl border border-border/70 bg-background text-[11px] font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
          />
          <button
            type="submit"
            disabled={!manualCode.trim()}
            className="ctl px-3 h-8 rounded-xl bg-primary text-primary-foreground font-semibold text-xs transition-opacity disabled:opacity-40 cursor-pointer shadow-xs shrink-0"
          >
            Bağla
          </button>
        </form>

        {/* Bağlı Cihazlar Listesi (Kompakt) */}
        {devices.length > 0 && (
          <div className="pt-1 border-t border-border/40">
            <span className="text-[9.5px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Bağlı Cihazlar ({devices.length})
            </span>
            <div className="flex flex-col gap-1 max-h-20 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
              {devices.map((dev) => (
                <div
                  key={dev.id}
                  className="flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg border border-border/30 bg-muted/10 text-xs"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {dev.type === 'mobile' ? (
                      <Smartphone className="size-3 text-sky-500 shrink-0" />
                    ) : dev.type === 'tablet' ? (
                      <Tablet className="size-3 text-purple-500 shrink-0" />
                    ) : (
                      <Laptop className="size-3 text-emerald-500 shrink-0" />
                    )}
                    <span className="font-medium truncate text-[10.5px]">
                      {dev.name} {dev.isCurrent && '(Bu Cihaz)'}
                    </span>
                  </div>
                  {!dev.isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDevice(dev.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                      title="Bağlantıyı kes"
                      aria-label="Bağlantıyı kes"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
