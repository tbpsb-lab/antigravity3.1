'use client'

import { FileText } from 'lucide-react'
import Image from 'next/image'
import type { ReactNode, Ref } from 'react'
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

// Temaya Uyum Sağlayan Özel Biçimli Mini Logo (1.5 kat büyütülmüş, tek satırlık başlık çubuğunu daraltmadan aşağı taşan rozet)
function ThemedAppLogo({ theme, className }: { theme: ThemeId; className?: string }) {
  if (theme === 'linear') {
    // 2. NEON SİYAH: Mor Neon Elips Kapsül, Elektrik Cyan Çentikler & Neon Kırmızı Lazer
    return (
      <span
        aria-hidden="true"
        className={cn(
          'relative block h-10 w-[80px] sm:h-11 sm:w-[106px] landscape-short:h-9 landscape-short:w-[74px] shrink-0 select-none overflow-visible origin-left transition-transform duration-300',
          className
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
    // 3. KAĞIT: Parşömen Yuvarlak Kare, Sağ Alt Köşe Kıvrımı, Sepya Mürekkep Baskı & Bordo Lazer
    return (
      <span
        aria-hidden="true"
        className={cn(
          'relative block h-10 w-[62px] sm:h-11 sm:w-[82px] landscape-short:h-9 landscape-short:w-[58px] shrink-0 select-none overflow-visible origin-left transition-transform duration-300',
          className
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

  // 1. CAM (Varsayılan): Yuvarlak Saydam Cam Lens, Canlı Cyan Kırılma, Koyu Antrasit Tipografi & Kırmızı Odak
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative block h-10 w-[62px] sm:h-11 sm:w-[82px] landscape-short:h-9 landscape-short:w-[58px] shrink-0 select-none overflow-visible origin-left transition-transform duration-300',
        className
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

export function TopBar({
  ref,
  theme,
  onOpenText,
  onOpenAbout,
  hidden,
  fontControl,
  docTitle,
}: TopBarProps) {
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
        {/* Sol Alan: Tematik Rozet Logo ve Başlık */}
        <div className="flex min-w-0 items-center gap-2.5 overflow-visible">
          <button
            type="button"
            onClick={onOpenAbout}
            className="flex min-w-0 items-center gap-2.5 text-left group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl p-1 -m-1 transition-all active:scale-95 overflow-visible"
            title="odak Hakkında, RSVP Mantığı ve Kılavuz"
            aria-label="odak Hakkında, RSVP Mantığı ve Kılavuz"
          >
            <ThemedAppLogo theme={theme} className="group-hover:scale-105" />
            <div className="min-w-0 max-[359px]:sr-only max-w-[150px] min-[400px]:max-w-[220px] sm:max-w-xs md:max-w-sm truncate">
              <p
                className="text-xs sm:text-sm font-medium tracking-tight text-foreground/85 group-hover:text-primary transition-colors truncate"
                title={docTitle && docTitle !== 'odak' ? docTitle : 'Hızlı okuma penceresi'}
              >
                {docTitle && docTitle !== 'odak' ? docTitle : 'Hızlı okuma penceresi'}
              </p>
            </div>
          </button>
        </div>

        {/* Sağ Alan: Sade ve Lüks 2 Buton (Apple Books Modeli: 1. Aa Görünüm, 2. Metin Yükle) */}
        <div className="flex items-center gap-2">
          {/* 1. Görünüm & Okuma Ayarları (Aa: Tema + Tipografi + Boyut + Chunk + Dipnot + Kalibrasyon) */}
          {fontControl}

          {/* 2. Okuma ve İçerik Merkezi / Metin Yükle */}
          <button
            type="button"
            onClick={onOpenText}
            className="ctl panel size-10 landscape-short:size-9 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Okuma ve İçerik Merkezi (Metin Yükle)"
            title="Okuma ve İçerik Merkezi (Metin Yükle)"
          >
            <FileText className="size-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
