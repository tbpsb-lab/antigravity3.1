'use client'

import { type ThemeId } from '@/lib/rsvp'
import { cn } from '@/lib/utils'

export function AtmosphericReticle({
  theme,
  className,
}: {
  theme: ThemeId
  className?: string
}) {
  const isNeon = theme === 'linear'
  const isKagit = theme === 'kindle'

  // Renk tanımları:
  // Neon: Elektrik cyan (#38bdf8) ve parlak neon kırmızı (#ef4444)
  // Kağıt: Sepya mürekkep (#5c452d) ve kiremit bordo (#b44c43)
  // Cam (iOS): Koyu antrasit / Slate (#334155 dark: #cbd5e1) ve lazer kırmızı (#ef4444)
  const bracketColor = isNeon
    ? '#38bdf8'
    : isKagit
    ? '#5c452d'
    : 'currentColor'

  const laserColor = isKagit ? '#b44c43' : '#ef4444'

  return (
    <svg
      viewBox="0 0 800 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-full h-full select-none pointer-events-none', className)}
    >
      {/* Üst Dikey Kırmızı Lazer Çizgisi */}
      <line
        x1="400"
        y1="10"
        x2="400"
        y2="46"
        stroke={laserColor}
        strokeWidth="3.5"
        strokeLinecap="round"
        className={isNeon ? 'drop-shadow-[0_0_8px_#ef4444]' : undefined}
      />

      {/* Alt Dikey Kırmızı Lazer Çizgisi */}
      <line
        x1="400"
        y1="314"
        x2="400"
        y2="350"
        stroke={laserColor}
        strokeWidth="3.5"
        strokeLinecap="round"
        className={isNeon ? 'drop-shadow-[0_0_8px_#ef4444]' : undefined}
      />

      {/* 4 Köşe Vizör Parantezi (Büyük optik odaklama çerçevesi) */}
      <path
        d="M 260 28 H 80 A 24 24 0 0 0 56 52 V 120"
        stroke={bracketColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isNeon ? 'drop-shadow-[0_0_6px_#38bdf8]' : undefined}
      />
      <path
        d="M 540 28 H 720 A 24 24 0 0 1 744 52 V 120"
        stroke={bracketColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isNeon ? 'drop-shadow-[0_0_6px_#38bdf8]' : undefined}
      />
      <path
        d="M 56 240 V 308 A 24 24 0 0 0 80 332 H 260"
        stroke={bracketColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isNeon ? 'drop-shadow-[0_0_6px_#38bdf8]' : undefined}
      />
      <path
        d="M 744 240 V 308 A 24 24 0 0 1 720 332 H 540"
        stroke={bracketColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isNeon ? 'drop-shadow-[0_0_6px_#38bdf8]' : undefined}
      />

      {/* Sol Kenar Hız / Frekans Çentikleri (Logonun karakteristik sol dalgaları) */}
      <line
        x1="18"
        y1="168"
        x2="44"
        y2="168"
        stroke={bracketColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        className={isNeon ? 'drop-shadow-[0_0_4px_#38bdf8]' : undefined}
      />
      <line
        x1="12"
        y1="180"
        x2="48"
        y2="180"
        stroke={bracketColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        className={isNeon ? 'drop-shadow-[0_0_4px_#38bdf8]' : undefined}
      />
      <line
        x1="18"
        y1="192"
        x2="44"
        y2="192"
        stroke={bracketColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        className={isNeon ? 'drop-shadow-[0_0_4px_#38bdf8]' : undefined}
      />

      {/* Sağ Kenar Hız / Frekans Çentikleri (Logonun karakteristik sağ dalgaları) */}
      <line
        x1="756"
        y1="168"
        x2="782"
        y2="168"
        stroke={bracketColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        className={isNeon ? 'drop-shadow-[0_0_4px_#38bdf8]' : undefined}
      />
      <line
        x1="752"
        y1="180"
        x2="788"
        y2="180"
        stroke={bracketColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        className={isNeon ? 'drop-shadow-[0_0_4px_#38bdf8]' : undefined}
      />
      <line
        x1="756"
        y1="192"
        x2="782"
        y2="192"
        stroke={bracketColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        className={isNeon ? 'drop-shadow-[0_0_4px_#38bdf8]' : undefined}
      />
    </svg>
  )
}
