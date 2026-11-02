'use client'

import { Check, Copy, RotateCcw, Share2, Sparkles, Trophy, Upload, X, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { triggerHaptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

type CompletionModalProps = {
  open: boolean
  wordCount: number
  wpm: number
  elapsedSeconds: number
  onClose: () => void
  onRestart: () => void
  onOpenNewText: () => void
}

export function CompletionModal({
  open,
  wordCount,
  wpm,
  elapsedSeconds,
  onClose,
  onRestart,
  onOpenNewText,
}: CompletionModalProps) {
  if (!open) return null
  return (
    <CompletionModalBody
      wordCount={wordCount}
      wpm={wpm}
      elapsedSeconds={elapsedSeconds}
      onClose={onClose}
      onRestart={onRestart}
      onOpenNewText={onOpenNewText}
    />
  )
}

function CompletionModalBody({
  wordCount,
  wpm,
  elapsedSeconds,
  onClose,
  onRestart,
  onOpenNewText,
}: Omit<CompletionModalProps, 'open'>) {
  const [copied, setCopied] = useState(false)

  // Açıldığında haptik başarı ritmi
  useEffect(() => {
    triggerHaptic('success')
  }, [])

  // ESC ile kapatma
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Geleneksel okuma (200 WPM) ile kıyaslama hesabı
  const standardTimeSeconds = Math.round((wordCount / 200) * 60)
  const actualSeconds = Math.max(1, elapsedSeconds > 0 ? elapsedSeconds : Math.round((wordCount / Math.max(100, wpm)) * 60))
  const savedSeconds = Math.max(0, standardTimeSeconds - actualSeconds)

  // Önlenen göz sıçraması (sakkad): Kelime başı ortalama 1.25 mekanik göz atlaması
  const saccadesPrevented = Math.round(wordCount * 1.25)

  const formatDuration = (secs: number) => {
    if (secs < 60) return `${secs} saniye`
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return s > 0 ? `${m} dk ${s} sn` : `${m} dakika`
  }

  const shareText = `⚡ odak ile ${wordCount} kelimelik metni ${wpm} k/dk hızla ${formatDuration(actualSeconds)} içinde okudum! Geleneksel okumaya göre ${formatDuration(savedSeconds)} kazandım ve ${saccadesPrevented.toLocaleString('tr-TR')} göz sıçramasını sıfırladım.`

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'odak — Okuma Başarısı',
          text: shareText,
          url: 'https://tbpsb-lab.github.io/antigravity3.1/',
        })
        return
      } catch {}
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6 landscape-short:items-center landscape-short:p-2">
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="completion-title"
        className="panel relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto p-5 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200 rounded-t-3xl sm:rounded-3xl border border-border/80 text-foreground"
      >
        {/* Üst Kapatma ve Kutlama Başlığı */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 shadow-xs ring-1 ring-amber-500/30">
              <Trophy className="size-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Tamamlandı</span>
                <Sparkles className="size-3.5 text-amber-500" />
              </div>
              <h2 id="completion-title" className="text-base sm:text-lg font-bold tracking-tight">
                Tebrikler, harika bir odak!
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ctl size-8 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Kapat"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 4'lü Başarı Metrikleri Kartı */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {/* 1. Kelime Sayısı */}
          <div className="flex flex-col rounded-2xl border border-border/60 bg-muted/20 p-3 sm:p-3.5 text-center">
            <span className="text-[11px] font-medium text-muted-foreground">Okunan Hacim</span>
            <span className="mt-0.5 font-mono text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              {wordCount}
            </span>
            <span className="text-[10px] text-muted-foreground">kelime</span>
          </div>

          {/* 2. Ortalama Hız */}
          <div className="flex flex-col rounded-2xl border border-border/60 bg-muted/20 p-3 sm:p-3.5 text-center">
            <span className="text-[11px] font-medium text-muted-foreground">RSVP Hızı</span>
            <span className="mt-0.5 font-mono text-xl sm:text-2xl font-extrabold tracking-tight text-primary">
              {wpm}
            </span>
            <span className="text-[10px] text-primary/80">kelime / dakika</span>
          </div>

          {/* 3. Kazanılan Zaman */}
          <div className="flex flex-col rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 sm:p-3.5 text-center">
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Kazanılan Zaman</span>
            <span className="mt-0.5 font-mono text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
              {savedSeconds > 0 ? `+${formatDuration(savedSeconds)}` : formatDuration(actualSeconds)}
            </span>
            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
              standart okumaya göre
            </span>
          </div>

          {/* 4. Dinlenen Göz Kasları */}
          <div className="flex flex-col rounded-2xl border border-border/60 bg-muted/20 p-3 sm:p-3.5 text-center">
            <span className="text-[11px] font-medium text-muted-foreground">Önlenen Göz Sıçraması</span>
            <span className="mt-0.5 font-mono text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              {saccadesPrevented.toLocaleString('tr-TR')}
            </span>
            <span className="text-[10px] text-muted-foreground">mekanik sıçrama</span>
          </div>
        </div>

        {/* Bilgilendirici Bilişsel Kart */}
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            <strong className="text-foreground">Zihinsel Dinginlik:</strong> Göz kaslarınız satır taramak yerine tek bir odak noktasına kenetlendi. Beyniniz iç seslendirmeyi hafifleterek bilgiyi doğrudan kavramsal desenler halinde kaydetti.
          </p>
        </div>

        {/* Aksiyon Butonları */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onClose()
              onRestart()
            }}
            className="ctl flex h-11 w-full sm:w-auto sm:flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-xs font-semibold text-foreground hover:bg-muted/30 transition-colors cursor-pointer"
          >
            <RotateCcw className="size-3.5" />
            <span>Baştan Oku</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose()
              onOpenNewText()
            }}
            className="ctl ctl-primary flex h-11 w-full sm:w-auto sm:flex-1 items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-semibold shadow-md transition-all cursor-pointer hover:scale-[1.01]"
          >
            <Upload className="size-3.5" />
            <span>Yeni Metin Seç</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className={cn(
              'ctl flex h-11 w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors cursor-pointer',
              copied ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500' : 'border-border bg-background text-muted-foreground hover:text-foreground',
            )}
            title="Başarıyı Paylaş veya Kopyala"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-500" />
                <span>Kopyalandı!</span>
              </>
            ) : (
              <>
                <Share2 className="size-3.5" />
                <span className="sm:hidden">Paylaş</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
