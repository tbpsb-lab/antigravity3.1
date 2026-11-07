'use client'

import { BookOpen, FileText, Maximize, Minimize } from 'lucide-react'
import Image from 'next/image'
import { memo, useCallback, useEffect, useRef, useState, type ReactNode, type Ref } from 'react'
import { cn } from '@/lib/utils'
import { type ThemeId } from '@/lib/rsvp'
import logoCam from '@/assets/logos/logo-cam.png'
import logoNeon from '@/assets/logos/logo-neon.png'
import logoKagit from '@/assets/logos/logo-kagit.png'

type TopBarProps = {
  ref?: Ref<HTMLElement>
  theme: ThemeId
  onThemeChange?: (theme: ThemeId) => void
  onOpenText?: () => void
  textControl?: ReactNode
  onOpenSpeedTest?: () => void
  onOpenAbout?: () => void
  hidden: boolean
  fontControl: ReactNode
  docTitle?: string
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  neuroAudioEnabled?: boolean
  onToggleNeuroAudio?: () => void
}

// odak Vektörel Reticle Logosu
export function OdakWordmarkSvg({
  mode = 'cam',
  className,
}: {
  mode: 'cam' | 'neon' | 'kagit' | 'koyu-zemin' | 'acik-zemin'
  className?: string
}) {
  const isNeon = mode === 'neon'
  const isKagit = mode === 'kagit'
  const isKoyuZemin = mode === 'koyu-zemin'

  const textColor = isNeon
    ? '#a5f3fc'
    : isKagit
    ? '#4a3520'
    : isKoyuZemin
    ? '#ffffff'
    : '#1e293b'

  const bracketColor = isNeon
    ? '#a5f3fc'
    : isKagit
    ? '#4a3520'
    : isKoyuZemin
    ? '#ffffff'
    : '#1e293b'

  const pivotColor = isKagit ? '#b44c43' : '#ef4444'

  return (
    <svg
      viewBox="0 0 100 68"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-full h-full select-none', className)}
    >
      {/* Üst Dikey Kırmızı Lazer Çizgisi */}
      <line
        x1="50"
        y1="4"
        x2="50"
        y2="16"
        stroke={pivotColor}
        strokeWidth="3.6"
        strokeLinecap="round"
        className={isNeon ? 'drop-shadow-[0_0_6px_#ef4444]' : undefined}
      />

      {/* Alt Dikey Kırmızı Lazer Çizgisi */}
      <line
        x1="50"
        y1="52"
        x2="50"
        y2="64"
        stroke={pivotColor}
        strokeWidth="3.6"
        strokeLinecap="round"
        className={isNeon ? 'drop-shadow-[0_0_6px_#ef4444]' : undefined}
      />

      {/* 4 Köşe Vizör Parantezi */}
      <path
        d="M 38 13 H 25 A 12 12 0 0 0 13 25 V 27"
        stroke={bracketColor}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isNeon ? 'drop-shadow-[0_0_4px_#38bdf8]' : undefined}
      />
      <path
        d="M 62 13 H 75 A 12 12 0 0 1 87 25 V 27"
        stroke={bracketColor}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isNeon ? 'drop-shadow-[0_0_4px_#38bdf8]' : undefined}
      />
      <path
        d="M 13 41 V 43 A 12 12 0 0 0 25 55 H 38"
        stroke={bracketColor}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isNeon ? 'drop-shadow-[0_0_4px_#38bdf8]' : undefined}
      />
      <path
        d="M 87 41 V 43 A 12 12 0 0 1 75 55 H 62"
        stroke={bracketColor}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isNeon ? 'drop-shadow-[0_0_4px_#38bdf8]' : undefined}
      />

      {/* Bütüncül 'odak' Logosu */}
      <text
        x="51"
        y="43.5"
        textAnchor="middle"
        className="font-bold select-none"
        style={{
          fontFamily: 'var(--font-inter), Inter, system-ui, -apple-system, sans-serif',
          fontSize: '27px',
          fontWeight: 900,
          letterSpacing: '-1.1px',
        }}
      >
        <tspan fill={textColor} className={isNeon ? 'drop-shadow-[0_0_4px_#38bdf8]' : undefined}>
          o
        </tspan>
        <tspan fill={pivotColor} className={isNeon ? 'drop-shadow-[0_0_6px_#ef4444]' : undefined}>
          d
        </tspan>
        <tspan fill={textColor} className={isNeon ? 'drop-shadow-[0_0_4px_#38bdf8]' : undefined}>
          ak
        </tspan>
      </text>
    </svg>
  )
}

// Temaya Uyum Sağlayan Özel Biçimli Mini Logo
function ThemedAppLogo({ theme, className }: { theme: ThemeId; className?: string }) {
  if (theme === 'linear') {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'relative block h-10 w-[62px] sm:h-11 sm:w-[82px] landscape-short:h-9 landscape-short:w-[58px] shrink-0 select-none overflow-visible origin-left transition-transform duration-300',
          className,
        )}
      >
        <span className="absolute top-0 left-0 w-[62px] h-[62px] sm:w-[82px] sm:h-[82px] landscape-short:w-[58px] landscape-short:h-[58px] drop-shadow-[0_0_16px_rgba(168,85,247,0.55)]">
          <Image
            src={logoNeon}
            alt="odak Neon Logo"
            width={82}
            height={82}
            priority
            className="w-full h-full object-contain pointer-events-none select-none"
          />
        </span>
      </span>
    )
  }

  if (theme === 'kindle') {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'relative block h-10 w-[62px] sm:h-11 sm:w-[82px] landscape-short:h-9 landscape-short:w-[58px] shrink-0 select-none overflow-visible origin-left transition-transform duration-300',
          className,
        )}
      >
        <span className="absolute top-0 left-0 w-[62px] h-[62px] sm:w-[82px] sm:h-[82px] landscape-short:w-[58px] landscape-short:h-[58px] drop-shadow-[0_3px_10px_rgba(0,0,0,0.14)]">
          <Image
            src={logoKagit}
            alt="odak Kağıt Logo"
            width={82}
            height={82}
            priority
            className="w-full h-full object-contain pointer-events-none select-none"
          />
        </span>
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative block h-10 w-[62px] sm:h-11 sm:w-[82px] landscape-short:h-9 landscape-short:w-[58px] shrink-0 select-none overflow-visible origin-left transition-transform duration-300',
        className,
      )}
    >
      <span className="absolute top-0 left-0 w-[62px] h-[62px] sm:w-[82px] sm:h-[82px] landscape-short:w-[58px] landscape-short:h-[58px] drop-shadow-[0_4px_16px_rgba(56,189,248,0.4)]">
        <Image
          src={logoCam}
          alt="odak Cam Logo"
          width={82}
          height={82}
          priority
          className="w-full h-full object-contain pointer-events-none select-none"
        />
      </span>
    </span>
  )
}

export const TopBar = memo(function TopBar({
  ref,
  theme,
  onOpenText,
  textControl,
  onOpenAbout,
  hidden,
  fontControl,
  docTitle,
  isFullscreen = false,
  onToggleFullscreen,
  neuroAudioEnabled = false,
  onToggleNeuroAudio,
}: TopBarProps) {
  // İlk Ziyaret İçin Logo & Site Kılavuzu Cam Tanıtım Penceresi (Onboarding Callout)
  const [showGuideCallout, setShowGuideCallout] = useState(false)
  const [guideCalloutFading, setGuideCalloutFading] = useState(false)
  const guideCalloutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const guideCalloutFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const guideCalloutDismissedRef = useRef(false)
  const guideCalloutRef = useRef<HTMLDivElement>(null)

  const dismissGuideCallout = useCallback(() => {
    if (guideCalloutDismissedRef.current) return
    guideCalloutDismissedRef.current = true
    if (guideCalloutTimerRef.current) clearTimeout(guideCalloutTimerRef.current)
    if (guideCalloutFadeTimerRef.current) clearTimeout(guideCalloutFadeTimerRef.current)
    setGuideCalloutFading(true)
    try {
      localStorage.setItem('hasSeenTapGuide_v2', 'true')
      window.dispatchEvent(new Event('dismiss-onboarding'))
    } catch {}
    guideCalloutFadeTimerRef.current = setTimeout(() => {
      setShowGuideCallout(false)
    }, 350)
  }, [])

  useEffect(() => {
    // Okuma Merkezi (text-center-guide-completed) bittikten sonra Site Kılavuzu tanıtımını aç
    const handleTriggerGuide = () => {
      try {
        const hasSeen = localStorage.getItem('hasSeenTapGuide_v2')
        if (!hasSeen && !guideCalloutDismissedRef.current && !hidden) {
          setShowGuideCallout(true)
          if (guideCalloutTimerRef.current) clearTimeout(guideCalloutTimerRef.current)
          guideCalloutTimerRef.current = setTimeout(() => {
            dismissGuideCallout()
          }, 2200)
        }
      } catch {}
    }

    // Güvenlik yedek zamanlayıcısı: Önceki tanıtım adımları kaçırılırsa 9.8 sn sonra devreye girer
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null
    try {
      const hasSeen = localStorage.getItem('hasSeenTapGuide_v2')
      if (!hasSeen) {
        fallbackTimer = setTimeout(() => {
          handleTriggerGuide()
        }, 9800)
      }
    } catch {}

    window.addEventListener('text-center-guide-completed', handleTriggerGuide)
    return () => {
      window.removeEventListener('text-center-guide-completed', handleTriggerGuide)
      if (fallbackTimer) clearTimeout(fallbackTimer)
    }
  }, [hidden, dismissGuideCallout])

  // Dışarıdan tetiklenen onboarding kapatma olayını (merkez pencereye tıklama vb.) dinle
  useEffect(() => {
    const handleExternalDismiss = () => {
      if (guideCalloutDismissedRef.current) return
      guideCalloutDismissedRef.current = true
      try {
        localStorage.setItem('hasSeenTapGuide_v2', 'true')
      } catch {}
      if (guideCalloutTimerRef.current) clearTimeout(guideCalloutTimerRef.current)
      if (guideCalloutFadeTimerRef.current) clearTimeout(guideCalloutFadeTimerRef.current)
      setGuideCalloutFading(true)
      guideCalloutFadeTimerRef.current = setTimeout(() => {
        setShowGuideCallout(false)
      }, 350)
    }
    window.addEventListener('dismiss-onboarding', handleExternalDismiss)
    return () => {
      window.removeEventListener('dismiss-onboarding', handleExternalDismiss)
      if (guideCalloutTimerRef.current) clearTimeout(guideCalloutTimerRef.current)
      if (guideCalloutFadeTimerRef.current) clearTimeout(guideCalloutFadeTimerRef.current)
    }
  }, [])

  // Callout açıkken sayfanın herhangi bir yerine tıklandığında kapat
  useEffect(() => {
    if (!showGuideCallout) return

    const handlePointerDown = (e: PointerEvent) => {
      if (guideCalloutRef.current && !guideCalloutRef.current.contains(e.target as Node)) {
        dismissGuideCallout()
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [showGuideCallout, dismissGuideCallout])

  return (
    <header
      ref={ref}
      aria-hidden={hidden}
      inert={hidden}
      className={cn(
        'top-bar-stage absolute inset-x-0 top-0 z-40 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] sm:px-6 sm:pt-5 md:px-8 md:pt-6 landscape-short:pt-2',
        hidden && 'pointer-events-none -translate-y-6 opacity-0',
      )}
    >
      <div className="mx-auto flex max-w-5xl md:max-w-6xl items-center justify-between gap-3">
        {/* Sol Alan: Tematik Rozet Logo ve Başlık */}
        <div className="relative flex min-w-0 items-center gap-2.5 md:gap-3.5 overflow-visible">
          <button
            type="button"
            onClick={(e) => {
              ;(e.currentTarget as HTMLButtonElement)?.blur()
              if (showGuideCallout) {
                dismissGuideCallout()
              }
              onOpenAbout?.()
            }}
            className="flex min-w-0 items-center gap-2.5 md:gap-3.5 text-left group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl p-1 -m-1 transition-all active:scale-95 overflow-visible"
            title="odak Hakkında, RSVP Mantığı ve Kılavuz"
            aria-label="odak Hakkında, RSVP Mantığı ve Kılavuz"
          >
            <ThemedAppLogo theme={theme} className="group-hover:scale-105" />
            <div className="min-w-0 max-[359px]:sr-only max-w-[150px] min-[400px]:max-w-[220px] sm:max-w-xs md:max-w-sm truncate">
              <p
                className="text-xs sm:text-sm md:text-base font-medium tracking-tight text-foreground/85 group-hover:text-primary transition-colors truncate"
                title={docTitle && docTitle !== 'odak' ? docTitle : 'Hızlı Okuma Penceresi'}
              >
                {docTitle && docTitle !== 'odak' ? docTitle : 'Hızlı Okuma Penceresi'}
              </p>
            </div>
          </button>

          {/* İlk Ziyaret İçin Logo & Site Kılavuzu Cam Tanıtım Penceresi */}
          {showGuideCallout && (
            <div
              ref={guideCalloutRef}
              role="tooltip"
              aria-label="Site Kılavuzu Tanıtımı"
              onClick={(e) => {
                e.stopPropagation()
                dismissGuideCallout()
                onOpenAbout?.()
              }}
              className={cn(
                'panel absolute top-full mt-2.5 z-50 select-none cursor-pointer transition-all duration-300 ease-out',
                'left-0 w-[205px] sm:w-[220px]',
                'p-2 sm:p-2.5 rounded-2xl shadow-xl',
                'bg-[var(--panel)] border border-[var(--panel-border)] backdrop-blur-[var(--panel-blur)]',
                'text-foreground text-left',
                'animate-in fade-in zoom-in-95 duration-300',
                guideCalloutFading
                  ? 'opacity-0 scale-95 pointer-events-none'
                  : 'opacity-100 scale-100 pointer-events-auto',
              )}
            >
              {/* Logoyu İşaret Eden Yukarı Doğru Cam Ok (Arrow Pointer) */}
              <div
                className="absolute -top-1.5 left-6 sm:left-8 size-3 rotate-45 border-t border-l border-[var(--panel-border)] bg-[var(--panel)] shadow-2xs backdrop-blur-[var(--panel-blur)]"
                aria-hidden="true"
              />

              <div className="relative z-10 flex items-start gap-2">
                <div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen className="size-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground leading-tight">
                    Site Kılavuzu
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Tüm kısayollar ve özellikler.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sağ Alan: 1. Metin Yükle, 2. Aa Görünüm & Ayarlar, 3. Tam Ekran */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* 1. Okuma ve İçerik Merkezi / Metin Yükle */}
          {textControl ? (
            textControl
          ) : (
            <button
              type="button"
              onClick={(e) => {
                ;(e.currentTarget as HTMLButtonElement)?.blur()
                onOpenText?.()
              }}
              onPointerUp={(e) => {
                ;(e.currentTarget as HTMLButtonElement)?.blur()
              }}
              className="ctl panel size-10 md:size-12 landscape-short:size-9 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Okuma ve İçerik Merkezi (Metin Yükle)"
              title="Okuma ve İçerik Merkezi (Metin Yükle)"
            >
              <FileText className="size-4 md:size-5" />
            </button>
          )}

          {/* 2. Görünüm & Okuma Ayarları (Aa) */}
          {fontControl}

          {/* 3. Tam Ekran Butonu (En Sağda) */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={(e) => {
                ;(e.currentTarget as HTMLButtonElement)?.blur()
                onToggleFullscreen()
              }}
              onPointerUp={(e) => {
                ;(e.currentTarget as HTMLButtonElement)?.blur()
              }}
              className="ctl panel size-10 md:size-12 landscape-short:size-9 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label={isFullscreen ? 'Tam ekrandan çık (F)' : 'Tam ekran modu (F)'}
              title={isFullscreen ? 'Tam ekrandan çık (F)' : 'Tam ekran modu (F)'}
            >
              {isFullscreen ? (
                <Minimize className="size-4 md:size-5" />
              ) : (
                <Maximize className="size-4 md:size-5" />
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  )
})
