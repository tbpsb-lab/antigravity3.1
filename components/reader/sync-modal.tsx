'use client'

import { memo, useMemo, useState, useEffect } from 'react'
import {
  QrCode,
  X,
  Check,
  Copy,
  Laptop,
  Smartphone,
  Tablet,
  RefreshCw,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateQRMatrix, qrMatrixToSvgPath } from '@/lib/qr-code'
import {
  getSyncVaultId,
  setSyncVaultId,
  sanitizeVaultId,
  getPairedDevices,
  removePairedDevice,
  generateSyncUrl,
  type SyncedDevice,
  type SyncUrlParams,
} from '@/lib/device-sync'
import { triggerHaptic } from '@/lib/haptics'

type SyncModalProps = {
  open: boolean
  onClose: () => void
  onManualSyncCodeApplied?: (newVaultId: string) => void
  onApplySyncUrlParams?: (params: { index?: number; pageNumber?: number; wpm?: number }) => void
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

  useEffect(() => {
    if (open) {
      const vId = getSyncVaultId()
      setVaultId(vId)
      setDevices(getPairedDevices())
    }
  }, [open])

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

  const handleApplyManualCode = (e: React.FormEvent) => {
    e.preventDefault()
    const input = manualCode.trim()
    if (!input) return

    // Kullanıcı tam bir bağlantı linki yapıştırdıysa içinden kodu ve okuma konumunu ayıkla
    if (input.includes('://') || input.includes('?')) {
      try {
        const full = input.startsWith('http') ? input : `https://${input}`
        const url = new URL(full)
        const s = url.searchParams.get('sync') || url.searchParams.get('s')
        const idx = url.searchParams.get('idx') || url.searchParams.get('i')
        const p = url.searchParams.get('p') || url.searchParams.get('page')
        const w = url.searchParams.get('wpm') || url.searchParams.get('w')

        const clean = sanitizeVaultId(s || input)
        if (clean) {
          setSyncVaultId(clean)
          setVaultId(clean)
          setManualCode('')
          setDevices(getPairedDevices())
          triggerHaptic('tap')
          onManualSyncCodeApplied?.(clean)

          if (idx || p || w) {
            onApplySyncUrlParams?.({
              index: idx ? parseInt(idx, 10) : undefined,
              pageNumber: p ? parseInt(p, 10) : undefined,
              wpm: w ? parseInt(w, 10) : undefined,
            })
          }
          return
        }
      } catch {}
    }

    // Normal kod girişi (örn: 4458 veya HZL-4458)
    const clean = sanitizeVaultId(input)
    if (!clean) return
    setSyncVaultId(clean)
    setVaultId(clean)
    setManualCode('')
    setDevices(getPairedDevices())
    triggerHaptic('tap')
    onManualSyncCodeApplied?.(clean)
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md rounded-3xl border border-border/80 bg-background/95 p-5 sm:p-6 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col gap-4 text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Üst Başlık */}
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
              <QrCode className="size-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold leading-tight">Cihaz Eşleştir</h3>
              <p className="text-[11px] text-muted-foreground">Ekranlar arası anında senkronizasyon</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ctl size-8 rounded-full border border-border/40 hover:bg-muted/50 text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Kapat"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Karekod Alanı */}
        <div className="flex flex-col items-center justify-center gap-2.5 py-1">
          <div className="relative p-4 sm:p-5 bg-white rounded-2xl shadow-md border border-neutral-200 flex items-center justify-center">
            {qrPath ? (
              <svg
                viewBox={`-4 -4 ${qrSize + 8} ${qrSize + 8}`}
                className="size-48 sm:size-52 shape-rendering-crispEdges text-neutral-900 fill-current"
                aria-label="Senkronizasyon Karekodu"
              >
                <path d={qrPath} />
              </svg>
            ) : (
              <div className="size-44 flex items-center justify-center text-muted-foreground text-xs">
                Karekod hazırlanıyor...
              </div>
            )}
          </div>

          {/* Karekod İçeriğindeki Anlık Konum ve Tercih Rozetleri */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10.5px] font-mono text-muted-foreground">
            {pageNumber ? (
              <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 font-semibold">
                Sayfa {pageNumber}
              </span>
            ) : null}
            {typeof index === 'number' ? (
              <span className="rounded-full bg-muted/60 border border-border/40 px-2 py-0.5">
                {index + 1}. Öbek
              </span>
            ) : null}
            {wpm ? (
              <span className="rounded-full bg-muted/60 border border-border/40 px-2 py-0.5">
                {wpm} k/dk
              </span>
            ) : null}
            {theme ? (
              <span className="rounded-full bg-muted/60 border border-border/40 px-2 py-0.5 capitalize">
                {theme === 'kindle' ? 'Kağıt' : theme === 'linear' ? 'Neon' : 'Cam'}
              </span>
            ) : null}
          </div>

          <p className="text-center text-[11.5px] text-muted-foreground leading-relaxed max-w-xs">
            Telefonunuzun kamerasını okutun; kaldığınız kelime, sayfa, hız ve ayarlarınız saniyesinde bağlansın.
          </p>
        </div>

        {/* Eşleme Kodu ve Kopyalama Eylemleri */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-2xl border border-border/60 bg-muted/20">
          <div className="min-w-0 flex-1 pl-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">
              Eşleme Kodu
            </span>
            <span className="font-mono text-sm sm:text-base font-bold text-foreground tracking-widest block truncate">
              {vaultId}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyCode}
              className="ctl inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border/80 bg-background hover:bg-muted/50 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-xs active:scale-95"
              title="Yalnızca 6 haneli eşleme kodunu kopyala"
            >
              {copiedCode ? (
                <>
                  <Check className="size-3.5 text-emerald-500" />
                  <span className="text-emerald-500 text-[11px]">Kopyalandı</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-muted-foreground" />
                  <span className="text-[11px]">Kodu Kopyala</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="ctl inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border/80 bg-background hover:bg-muted/50 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-xs active:scale-95"
              title="Doğrudan kaldığınız yeri açan bağlantı linkini kopyala"
            >
              {copiedLink ? (
                <>
                  <Check className="size-3.5 text-emerald-500" />
                  <span className="text-emerald-500 text-[11px]">Link Kopyalandı</span>
                </>
              ) : (
                <>
                  <ExternalLink className="size-3.5 text-muted-foreground" />
                  <span className="text-[11px]">Linki Kopyala</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Manuel Kod veya Link Girişi */}
        <form onSubmit={handleApplyManualCode} className="flex gap-1.5">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Başka cihazın kodunu veya linkini yapıştır"
            className="flex-1 min-w-0 h-9 px-3 rounded-xl border border-border/70 bg-background text-xs font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            disabled={!manualCode.trim()}
            className="ctl px-3.5 h-9 rounded-xl bg-primary text-primary-foreground font-semibold text-xs transition-opacity disabled:opacity-40 cursor-pointer shadow-xs shrink-0"
          >
            Bağla
          </button>
        </form>

        {/* Bağlı Cihazlar Listesi */}
        {devices.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Bağlı Cihazlar ({devices.length})
            </span>
            <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
              {devices.map((dev) => (
                <div
                  key={dev.id}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border border-border/40 bg-muted/15 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {dev.type === 'mobile' ? (
                      <Smartphone className="size-3.5 text-sky-500 shrink-0" />
                    ) : dev.type === 'tablet' ? (
                      <Tablet className="size-3.5 text-purple-500 shrink-0" />
                    ) : (
                      <Laptop className="size-3.5 text-emerald-500 shrink-0" />
                    )}
                    <span className="font-medium truncate text-[11.5px]">{dev.name}</span>
                  </div>
                  {!dev.isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDevice(dev.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      title="Bağlantıyı kes"
                      aria-label="Bağlantıyı kes"
                    >
                      <Trash2 className="size-3.5" />
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
