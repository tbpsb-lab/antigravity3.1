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
  getPairedDevices,
  removePairedDevice,
  generateSyncUrl,
  type SyncedDevice,
} from '@/lib/device-sync'
import { triggerHaptic } from '@/lib/haptics'

type SyncModalProps = {
  open: boolean
  onClose: () => void
  onManualSyncCodeApplied?: (newVaultId: string) => void
}

export const SyncModal = memo(function SyncModal({
  open,
  onClose,
  onManualSyncCodeApplied,
}: SyncModalProps) {
  const [vaultId, setVaultId] = useState<string>('')
  const [copied, setCopied] = useState(false)
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
    return generateSyncUrl(vaultId)
  }, [vaultId])

  const { path: qrPath, size: qrSize } = useMemo(() => {
    if (!syncUrl) return { path: '', size: 29 }
    const matrix = generateQRMatrix(syncUrl)
    return qrMatrixToSvgPath(matrix)
  }, [syncUrl])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(syncUrl || vaultId)
      setCopied(true)
      triggerHaptic('tap')
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleApplyManualCode = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    const clean = manualCode.trim().toUpperCase()
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
        <div className="flex flex-col items-center justify-center gap-3 py-1">
          <div className="relative p-3.5 bg-white rounded-2xl shadow-md border border-neutral-200 flex items-center justify-center">
            {qrPath ? (
              <svg
                viewBox={`-2 -2 ${qrSize + 4} ${qrSize + 4}`}
                className="size-44 sm:size-48 shape-rendering-crispEdges text-neutral-900 fill-current"
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

          <p className="text-center text-[11.5px] text-muted-foreground leading-relaxed max-w-xs">
            Diğer cihazınızın kamerasını okutun; kalınan yer, hız ve ayarlarınız saniyesinde bağlansın.
          </p>
        </div>

        {/* Eşleme Kodu ve Kopyalama */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl border border-border/60 bg-muted/20">
          <div className="min-w-0 flex-1 pl-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">
              Eşleme Kodu
            </span>
            <span className="font-mono text-sm sm:text-base font-bold text-foreground tracking-widest">
              {vaultId}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="ctl inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-background hover:bg-muted/50 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-xs active:scale-95"
            title="Bağlantı linkini kopyala"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-500" />
                <span className="text-emerald-500">Kopyalandı</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5 text-muted-foreground" />
                <span>Kopyala</span>
              </>
            )}
          </button>
        </div>

        {/* Manuel Kod Girişi */}
        <form onSubmit={handleApplyManualCode} className="flex gap-1.5">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Başka cihazın kodunu gir (örn: HZL-8429)"
            className="flex-1 min-w-0 h-9 px-3 rounded-xl border border-border/70 bg-background text-xs font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 uppercase"
          />
          <button
            type="submit"
            disabled={!manualCode.trim()}
            className="ctl px-3 h-9 rounded-xl bg-primary text-primary-foreground font-semibold text-xs transition-opacity disabled:opacity-40 cursor-pointer shadow-xs"
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
