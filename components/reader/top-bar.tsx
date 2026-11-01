'use client'

import { FileText, Maximize, Minimize, Zap } from 'lucide-react'
import { useEffect, useState, type ReactNode, type Ref } from 'react'
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

// 1. Gerçek saydam cam lens (Yazısız, saf cam ve specular parlama)
function CamShape() {
  return (
    <span
      className="relative block size-6 sm:size-7 rounded-full backdrop-blur-md border border-white/70 dark:border-white/30 bg-gradient-to-br from-white/50 via-white/15 to-white/5 dark:from-white/20 dark:via-white/5 dark:to-transparent shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.8),0_2px_6px_rgba(0,0,0,0.06)] shrink-0 transition-transform duration-300"
    >
      <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-[1.5px] rounded-full bg-white/90 dark:bg-white/60 pointer-events-none" />
    </span>
  )
}

// 2. Derin siyah elips ve canlı neon ışık çizgisi
function NeonShape() {
  return (
    <span
      className="relative block w-7.5 sm:w-8.5 h-4.5 sm:h-5 rounded-full bg-black/95 dark:bg-[#08080a] border border-purple-500/80 shadow-[0_0_10px_rgba(168,85,247,0.5),inset_0_0_6px_rgba(168,85,247,0.3)] flex items-center justify-center shrink-0 transition-transform duration-300"
    >
      <span className="w-3.5 h-1 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc] pointer-events-none" />
    </span>
  )
}

// 3. Sıcak parşömen / kitap kağıdı dokulu yuvarlak kare
function KagitShape() {
  return (
    <span
      className="relative block size-5.5 sm:size-6.5 rounded-md sm:rounded-lg bg-[#fbf0d9] dark:bg-[#2e261d] border border-[#cfbe96] dark:border-[#524433] shadow-[0_1px_3px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.4)] flex flex-col items-center justify-center gap-[2.5px] shrink-0 transition-transform duration-300"
    >
      <span className="w-2.5 sm:w-3 h-[1px] bg-[#998664]/60 dark:bg-[#857357]/60 rounded-full pointer-events-none" />
      <span className="w-2 sm:w-2.5 h-[1px] bg-[#998664]/60 dark:bg-[#857357]/60 rounded-full pointer-events-none" />
    </span>
  )
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
  // Sayfa ilk yüklendiğinde 3 tema yan yana gösterilir (1.8s), ardından tekli butona birleşir
  const [isMerged, setIsMerged] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMerged(true)
    }, 1800)
    return () => clearTimeout(timer)
  }, [])

  const currentIdx = THEMES.findIndex((t) => t.id === theme)
  const nextTheme = THEMES[((currentIdx >= 0 ? currentIdx : 0) + 1) % THEMES.length]

  const handleCycleTheme = () => {
    onThemeChange(nextTheme.id)
  }

  const currentThemeLabel = theme === 'ios' ? 'Cam' : theme === 'linear' ? 'Neon' : 'Kağıt'

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
          {/* Hız Testi (Kalibrasyon) Butonu - Sade Nötr Renk */}
          {onOpenSpeedTest && (
            <button
              type="button"
              onClick={onOpenSpeedTest}
              className="ctl panel size-10 landscape-short:size-9 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Okuma Hızı Testi"
              title="Okuma Hızı Testi"
            >
              <Zap className="size-4" />
            </button>
          )}

          {/* Temalar: Yüklendiğinde 3'ü yan yana açılır, ardından tekte birleşir. Üzerine gelince sadece mevcut tema adı çıkar */}
          <div
            role="group"
            aria-label="Tasarım teması"
            onClick={isMerged ? handleCycleTheme : undefined}
            title={isMerged ? currentThemeLabel : undefined}
            className={cn(
              'panel flex items-center justify-center overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] select-none',
              !isMerged
                ? 'h-10 px-2.5 gap-2 max-w-[140px] opacity-100 landscape-short:h-9'
                : 'h-10 px-2 gap-0 max-w-[52px] landscape-short:h-9 cursor-pointer hover:scale-105 active:scale-95'
            )}
          >
            {/* Cam Butonu (Yuvarlak Lens) */}
            <button
              type="button"
              onClick={(e) => {
                if (!isMerged) {
                  e.stopPropagation()
                  onThemeChange('ios')
                }
              }}
              className={cn(
                'flex items-center justify-center transition-all duration-500 ease-out outline-none cursor-pointer',
                theme === 'ios'
                  ? 'scale-100 opacity-100 shrink-0'
                  : isMerged
                  ? 'w-0 opacity-0 scale-50 pointer-events-none -mx-0 overflow-hidden'
                  : 'scale-90 opacity-55 hover:opacity-100 shrink-0'
              )}
              title="Cam"
              aria-label="Cam"
            >
              <CamShape />
            </button>

            {/* Neon Butonu (Elips) */}
            <button
              type="button"
              onClick={(e) => {
                if (!isMerged) {
                  e.stopPropagation()
                  onThemeChange('linear')
                }
              }}
              className={cn(
                'flex items-center justify-center transition-all duration-500 ease-out outline-none cursor-pointer',
                theme === 'linear'
                  ? 'scale-100 opacity-100 shrink-0'
                  : isMerged
                  ? 'w-0 opacity-0 scale-50 pointer-events-none -mx-0 overflow-hidden'
                  : 'scale-90 opacity-55 hover:opacity-100 shrink-0'
              )}
              title="Neon"
              aria-label="Neon"
            >
              <NeonShape />
            </button>

            {/* Kağıt Butonu (Yuvarlak Kare) */}
            <button
              type="button"
              onClick={(e) => {
                if (!isMerged) {
                  e.stopPropagation()
                  onThemeChange('kindle')
                }
              }}
              className={cn(
                'flex items-center justify-center transition-all duration-500 ease-out outline-none cursor-pointer',
                theme === 'kindle'
                  ? 'scale-100 opacity-100 shrink-0'
                  : isMerged
                  ? 'w-0 opacity-0 scale-50 pointer-events-none -mx-0 overflow-hidden'
                  : 'scale-90 opacity-55 hover:opacity-100 shrink-0'
              )}
              title="Kağıt"
              aria-label="Kağıt"
            >
              <KagitShape />
            </button>
          </div>

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
