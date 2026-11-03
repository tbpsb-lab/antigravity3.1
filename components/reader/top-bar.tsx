'use client'

import { FileText, Maximize, Minimize, Volume2, VolumeX } from 'lucide-react'
import Image from 'next/image'
import { memo, type ReactNode, type Ref } from 'react'
import { cn } from '@/lib/utils'
import { type ThemeId } from '@/lib/rsvp'
import logoCam from '@/assets/logos/logo-cam.png'
import logoNeon from '@/assets/logos/logo-neon.png'
import logoKagit from '@/assets/logos/logo-kagit.png'

type TopBarProps = {
  ref?: Ref<HTMLElement>
  theme: ThemeId
  onThemeChange?: (theme: ThemeId) => void
  onOpenText: () => void
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
          'relative block h-10 w-[80px] sm:h-11 sm:w-[106px] landscape-short:h-9 landscape-short:w-[74px] shrink-0 select-none overflow-visible origin-left transition-transform duration-300',
          className,
        )}
      >
        <span className="absolute top-0 left-0 w-[80px] h-[62px] sm:w-[106px] sm:h-[82px] landscape-short:w-[74px] landscape-short:h-[58px] drop-shadow-[0_0_16px_rgba(168,85,247,0.55)]">
          <Image
            src={logoNeon}
            alt="odak Neon Logo"
            width={106}
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
  onOpenAbout,
  hidden,
  fontControl,
  docTitle,
  isFullscreen = false,
  onToggleFullscreen,
  neuroAudioEnabled = false,
  onToggleNeuroAudio,
}: TopBarProps) {
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
        <div className="flex min-w-0 items-center gap-2.5 md:gap-3.5 overflow-visible">
          <button
            type="button"
            onClick={(e) => {
              ;(e.currentTarget as HTMLButtonElement)?.blur()
              onOpenAbout()
            }}
            className="flex min-w-0 items-center gap-2.5 md:gap-3.5 text-left group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl p-1 -m-1 transition-all active:scale-95 overflow-visible"
            title="odak Hakkında, RSVP Mantığı ve Kılavuz"
            aria-label="odak Hakkında, RSVP Mantığı ve Kılavuz"
          >
            <ThemedAppLogo theme={theme} className="group-hover:scale-105" />
            <div className="min-w-0 max-[359px]:sr-only max-w-[150px] min-[400px]:max-w-[220px] sm:max-w-xs md:max-w-sm truncate">
              <p
                className="text-xs sm:text-sm md:text-base font-medium tracking-tight text-foreground/85 group-hover:text-primary transition-colors truncate"
                title={docTitle && docTitle !== 'odak' ? docTitle : 'Hızlı okuma penceresi'}
              >
                {docTitle && docTitle !== 'odak' ? docTitle : 'Hızlı okuma penceresi'}
              </p>
            </div>
          </button>
        </div>

        {/* Sağ Alan: 1. Nöro-Odak Sesi, 2. Aa Görünüm, 3. Metin Yükle, 4. Tam Ekran (En Sağda) */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* 1. Nöroakustik Odak Sesi (40Hz Gama + Pembe Gürültü) */}
          {onToggleNeuroAudio && (
            <button
              type="button"
              onClick={(e) => {
                ;(e.currentTarget as HTMLButtonElement)?.blur()
                onToggleNeuroAudio()
              }}
              onPointerUp={(e) => {
                ;(e.currentTarget as HTMLButtonElement)?.blur()
              }}
              aria-pressed={neuroAudioEnabled}
              aria-label={
                neuroAudioEnabled
                  ? 'Nöroakustik odak sesini kapat (40Hz Gama + Pembe Gürültü — M)'
                  : 'Nöroakustik odak sesini aç (40Hz Gama + Pembe Gürültü — M)'
              }
              title={
                neuroAudioEnabled
                  ? 'Nöroakustik Odak Sesi Açık: 40Hz Gama + Pembe Gürültü (Kapatmak için tıklayın veya M)'
                  : 'Nöroakustik Odak Sesi Kapalı: 40Hz Gama + Pembe Gürültü (Açmak için tıklayın veya M)'
              }
              className={cn(
                'ctl panel relative size-10 md:size-12 landscape-short:size-9 transition-colors cursor-pointer',
                neuroAudioEnabled
                  ? 'text-primary border-primary/40 bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {neuroAudioEnabled ? (
                <>
                  <Volume2 className="size-4 md:size-5" />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary animate-pulse"
                  />
                </>
              ) : (
                <VolumeX className="size-4 md:size-5" />
              )}
            </button>
          )}

          {/* 2. Görünüm & Okuma Ayarları */}
          {fontControl}

          {/* 3. Okuma ve İçerik Merkezi / Metin Yükle */}
          <button
            type="button"
            onClick={(e) => {
              ;(e.currentTarget as HTMLButtonElement)?.blur()
              onOpenText()
            }}
            className="ctl panel size-10 md:size-12 landscape-short:size-9 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Okuma ve İçerik Merkezi (Metin Yükle)"
            title="Okuma ve İçerik Merkezi (Metin Yükle)"
          >
            <FileText className="size-4 md:size-5" />
          </button>

          {/* 4. Tam Ekran Butonu (En Sağda) */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={(e) => {
                ;(e.currentTarget as HTMLButtonElement)?.blur()
                onToggleFullscreen()
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
