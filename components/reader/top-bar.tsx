'use client'

import { FileText, Maximize, Minimize, Zap } from 'lucide-react'
import type { ReactNode, Ref } from 'react'
import { cn } from '@/lib/utils'
import { THEMES, type ThemeId } from '@/lib/rsvp'

type TopBarProps = {
  ref?: Ref<HTMLElement>
  theme: ThemeId
  onThemeChange: (theme: ThemeId) => void
  onOpenText: () => void
  onOpenSpeedTest?: () => void
  hidden: boolean
  fontControl: ReactNode
  docTitle?: string
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

export function TopBar({
  ref,
  theme,
  onThemeChange,
  onOpenText,
  onOpenSpeedTest,
  hidden,
  fontControl,
  docTitle,
  isFullscreen,
  onToggleFullscreen,
}: TopBarProps) {
  // 3 Temayı tek bir döngüsel butonda topla (Cam -> Neon -> Kağıt -> Cam)
  const currentIdx = THEMES.findIndex((t) => t.id === theme)
  const currentTheme = THEMES[currentIdx >= 0 ? currentIdx : 0]
  const nextTheme = THEMES[((currentIdx >= 0 ? currentIdx : 0) + 1) % THEMES.length]

  const handleCycleTheme = () => {
    onThemeChange(nextTheme.id)
  }

  return (
    <header
      ref={ref}
      aria-hidden={hidden}
      inert={hidden}
      className={cn(
        'absolute inset-x-0 top-0 z-40 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] sm:px-6 sm:pt-5 landscape-short:pt-2',
        hidden && 'pointer-events-none -translate-y-6 opacity-0',
      )}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="panel grid size-9 place-items-center landscape-short:size-8"
          >
            <span className="size-2 rounded-full bg-pivot pivot-glow" />
          </span>
          <div className="leading-tight max-[359px]:sr-only max-w-[140px] min-[400px]:max-w-[200px] sm:max-w-xs md:max-w-sm truncate">
            <p className="text-sm font-semibold tracking-tight truncate" title={docTitle || 'Odak'}>
              {docTitle || 'Odak'}
            </p>
            <p className="hidden text-xs text-muted-foreground sm:block">Hızlı okuma penceresi</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Hız Testi (Kalibrasyon) Butonu */}
          {onOpenSpeedTest && (
            <button
              type="button"
              onClick={onOpenSpeedTest}
              className="ctl panel size-10 landscape-short:size-9 text-muted-foreground hover:text-amber-500 hover:border-amber-500/40 transition-colors cursor-pointer"
              aria-label="Okuma Hızı Testi"
              title="Okuma Hızı Testi & Kalibrasyon"
            >
              <Zap className="size-4 text-amber-500 fill-amber-500/25" />
            </button>
          )}

          {/* Tekil Döngüsel Tema Butonu (Cam: Daire, Neon: Elips, Kağıt: Kare) */}
          <button
            type="button"
            onClick={handleCycleTheme}
            className={cn(
              'ctl panel flex h-10 items-center gap-1.5 px-3 text-xs font-semibold tracking-tight cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] select-none landscape-short:h-9 landscape-short:px-2.5',
              theme === 'ios' && 'rounded-full border-sky-400/40 bg-sky-500/10 text-sky-700 dark:text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.15)]',
              theme === 'linear' && 'rounded-full border-purple-500/50 bg-purple-950/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.25)] px-3.5',
              theme === 'kindle' && 'rounded-xl border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 shadow-xs',
            )}
            title={`Mevcut Tema: ${currentTheme.label} (Tıkla: ${nextTheme.label}) [Kısayol: 1, 2, 3]`}
            aria-label={`Temayı değiştir: ${currentTheme.label}`}
          >
            {/* Şekilsel Tema Göstergesi */}
            {theme === 'ios' && (
              <span className="size-2.5 rounded-full bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.8)]" />
            )}
            {theme === 'linear' && (
              <span className="h-2 w-3.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.9)]" />
            )}
            {theme === 'kindle' && (
              <span className="size-2.5 rounded-xs bg-amber-700 dark:bg-amber-400 shadow-xs" />
            )}
            <span>{currentTheme.label}</span>
          </button>

          {fontControl}

          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="ctl panel size-10 landscape-short:size-9"
              aria-label={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran modu'}
              title={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran modu'}
            >
              {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenText}
            className="ctl panel size-10 landscape-short:size-9"
            aria-label="Okuma ve İçerik Merkezi"
            title="Okuma ve İçerik Merkezi"
          >
            <FileText className="size-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
