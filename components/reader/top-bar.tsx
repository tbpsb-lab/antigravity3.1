'use client'

import { FileText, Maximize, Minimize, Zap } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState, type ReactNode, type Ref } from 'react'
import { cn } from '@/lib/utils'
import { THEMES, type ThemeId } from '@/lib/rsvp'
import logoCam from '@/assets/logos/logo-cam.png'
import logoNeon from '@/assets/logos/logo-neon.png'
import logoKagit from '@/assets/logos/logo-kagit.png'

type TopBarProps = {
  ref?: Ref<HTMLElement>
  theme: ThemeId
  onThemeChange: (theme: ThemeId) => void
  onOpenText: () => void
  onOpenSpeedTest?: () => void
  onOpenAbout?: () => void
  hidden: boolean
  fontControl: ReactNode
  docTitle?: string
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

// odak Vektörel Reticle Logosu (media_1793567364624_c3c8ac16.jpg ve media_1793568060338_3eb1a36e.jpg referansı)
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

  // Renk tanımları:
  // Neon: Elektrik cyan (#a5f3fc) ve neon kırmızı
  // Kağıt: Sepya koyu kahverengi (#4a3520) ve tuğla bordo (#b44c43)
  // Koyu Zemin: Tam beyaz (#ffffff) ve kırmızı (#ef4444)
  // Cam & Açık Zemin: Koyu antrasit (#1e293b) ve kırmızı (#ef4444) (media_1793568060338_3eb1a36e.jpg referansı)
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

      {/* 4 Köşe Vizör Parantezi (media_1793567364624_c3c8ac16.jpg geometrisi) */}
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

      {/* Bütüncül 'odak' Logosu - Kesintisiz, doğal harf aralıklı, biçimi bozulmayan vektör */}
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

// Temaya Uyum Sağlayan Özel Biçimli Mini Logo (1.5 kat büyütülmüş hali - media_1793569406285_e3e2edba.jpg)
function ThemedAppLogo({ theme, className }: { theme: ThemeId; className?: string }) {
  if (theme === 'linear') {
    // 2. NEON SİYAH: Mor Neon Elips Kapsül, Elektrik Cyan Çentikler & Neon Kırmızı Lazer
    return (
      <span
        aria-hidden="true"
        className={cn(
          'relative block h-[74px] w-[96px] sm:h-[86px] sm:w-[112px] shrink-0 transition-transform duration-300 select-none drop-shadow-[0_0_16px_rgba(168,85,247,0.55)]',
          className
        )}
      >
        <Image
          src={logoNeon}
          alt="odak Neon Logo"
          width={112}
          height={86}
          priority
          className="w-full h-full object-contain pointer-events-none select-none"
        />
      </span>
    )
  }

  if (theme === 'kindle') {
    // 3. KAĞIT: Parşömen Yuvarlak Kare, Sağ Alt Köşe Kıvrımı, Sepya Mürekkep Baskı & Bordo Lazer
    return (
      <span
        aria-hidden="true"
        className={cn(
          'relative block size-[74px] sm:size-[86px] shrink-0 transition-transform duration-300 select-none drop-shadow-[0_3px_10px_rgba(0,0,0,0.14)]',
          className
        )}
      >
        <Image
          src={logoKagit}
          alt="odak Kağıt Logo"
          width={86}
          height={86}
          priority
          className="w-full h-full object-contain pointer-events-none select-none"
        />
      </span>
    )
  }

  // 1. CAM (Varsayılan): Yuvarlak Saydam Cam Lens, Canlı Cyan Kırılma, Koyu Antrasit Tipografi & Kırmızı Odak
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative block size-[74px] sm:size-[86px] shrink-0 transition-transform duration-300 select-none drop-shadow-[0_4px_16px_rgba(56,189,248,0.4)]',
        className
      )}
    >
      <Image
        src={logoCam}
        alt="odak Cam Logo"
        width={86}
        height={86}
        priority
        className="w-full h-full object-contain pointer-events-none select-none"
      />
    </span>
  )
}

// 1. CAM Butonu: Saydam Cam Lens, Sağ Kenar Cyan Kırılma ve Çapraz Parlama
function CamShape() {
  return (
    <span
      className="relative block size-7 sm:size-8 rounded-full overflow-hidden shrink-0 transition-transform duration-300
        border border-white/80 dark:border-white/35
        bg-gradient-to-br from-white/95 via-white/50 to-white/10 dark:from-white/35 dark:via-white/15 dark:to-transparent
        shadow-[0_0_12px_rgba(56,189,248,0.5),inset_0_1.5px_2px_rgba(255,255,255,0.95)]"
    >
      {/* Sağ ve alt-sağ kenarda canlı cyan (açık mavi) cam kırılma hilali */}
      <span className="absolute -inset-0.5 rounded-full bg-[radial-gradient(circle_at_88%_60%,rgba(56,189,248,0.85)_0%,rgba(56,189,248,0.25)_40%,transparent_65%)] pointer-events-none" />

      {/* Çapraz kavisli cam parlaması (Diagonal lens gloss reflection) */}
      <span className="absolute -top-1.5 right-1 w-5 h-8 -rotate-[35deg] bg-gradient-to-b from-white/80 via-white/25 to-transparent pointer-events-none rounded-full blur-[0.4px]" />

      {/* Üst kenar ince specular parıltı */}
      <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-3.5 h-[1.5px] rounded-full bg-white/95 pointer-events-none shadow-[0_0_2px_rgba(255,255,255,0.9)]" />
    </span>
  )
}

// 2. NEON Butonu: Canlı Mor Neon Tüp & Derin Siyah Elips Kapsül
function NeonShape() {
  return (
    <span
      className="relative block w-8.5 sm:w-9.5 h-5 sm:h-5.5 rounded-full p-[2px] bg-[#07060b] border border-purple-500/40
        shadow-[0_0_14px_rgba(168,85,247,0.65),0_0_4px_rgba(192,132,252,0.45)]
        flex items-center justify-center shrink-0 transition-transform duration-300"
    >
      {/* Çepeçevre dönen parlak neon mor tüp */}
      <span className="w-full h-full rounded-full border-[1.5px] border-purple-400 bg-[#050409] flex items-center justify-center shadow-[0_0_8px_#c084fc,inset_0_0_6px_rgba(192,132,252,0.65)]">
        {/* En içteki derin siyah merkez çekirdek */}
        <span className="w-full h-full rounded-full bg-black/95" />
      </span>
    </span>
  )
}

// 3. KAĞIT Butonu: Parşömen Yuvarlak Kare, 2 Metin Satırı ve Kıvrık Sağ Alt Köşe (Dog-Ear)
function KagitShape() {
  return (
    <span
      className="relative block size-7 sm:size-8 rounded-lg bg-[#fbf5e5] dark:bg-[#2b2319]
        border border-[#cbba92] dark:border-[#524433]
        shadow-[0_1.5px_4px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.6)]
        flex flex-col items-center justify-center gap-1.5 shrink-0 transition-transform duration-300 overflow-hidden"
    >
      {/* 2 Satır Kitap Metni Çizgisi */}
      <span className="w-3 sm:w-3.5 h-[1.75px] bg-[#968262] dark:bg-[#a89574] rounded-full pointer-events-none" />
      <span className="w-3 sm:w-3.5 h-[1.75px] bg-[#968262] dark:bg-[#a89574] rounded-full pointer-events-none" />

      {/* Sağ Alt Köşe Sayfa Kıvrımı (Curled Dog-Ear Page Fold) */}
      <svg
        className="absolute bottom-0 right-0 size-3 sm:size-3.5 pointer-events-none"
        viewBox="0 0 12 12"
        fill="none"
      >
        {/* Kıvrımın arkasında kalan derinlik gölgesi */}
        <path d="M 0 12 L 12 0 L 12 12 Z" fill="rgba(0,0,0,0.22)" />
        {/* Kıvrılan kağıt yaprağı (üst parlak parşömen yüzeyi) */}
        <path
          d="M 0 12 C 2 7, 7 2, 12 0 C 8 5, 5 8, 0 12 Z"
          fill="#d0bf98"
        />
        <path
          d="M 1 11 C 3 7, 7 3, 11 1 C 8 5, 5 8, 1 11 Z"
          fill="#f6ede0"
        />
      </svg>
    </span>
  )
}

export function TopBar({
  ref,
  theme,
  onThemeChange,
  onOpenText,
  onOpenSpeedTest,
  onOpenAbout,
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
          <button
            type="button"
            onClick={onOpenAbout}
            className="flex min-w-0 items-center gap-2.5 text-left group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl p-1 -m-1 transition-all active:scale-95"
            title="odak Hakkında, RSVP Mantığı ve Kılavuz"
            aria-label="odak Hakkında, RSVP Mantığı ve Kılavuz"
          >
            <ThemedAppLogo theme={theme} className="group-hover:scale-105 transition-transform" />
            <div className="leading-tight max-[359px]:sr-only max-w-[140px] min-[400px]:max-w-[200px] sm:max-w-xs md:max-w-sm truncate">
              <p className="text-sm font-semibold tracking-tight truncate group-hover:text-primary transition-colors" title={docTitle || 'odak'}>
                {docTitle || 'odak'}
              </p>
              <p className="hidden text-xs text-muted-foreground sm:block">Hızlı okuma penceresi</p>
            </div>
          </button>
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
                ? 'h-10 px-2.5 gap-2.5 max-w-[155px] opacity-100 landscape-short:h-9'
                : 'h-10 px-2 gap-0 max-w-[56px] landscape-short:h-9 cursor-pointer hover:scale-105 active:scale-95'
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
