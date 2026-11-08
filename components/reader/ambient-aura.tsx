'use client'

import { memo } from 'react'
import { type ThemeId } from '@/lib/rsvp'
import { cn } from '@/lib/utils'

export const AmbientAura = memo(function AmbientAura({
  theme,
  playing,
  className,
}: {
  theme: ThemeId
  playing: boolean
  className?: string
}) {
  const isNeon = theme === 'linear'
  const isKagit = theme === 'kindle'
  const isCam = theme === 'ios'

  return (
    <div
      aria-hidden="true"
      style={{ transform: 'translate3d(0, 0, 0)', contain: 'paint' }}
      className={cn(
        'pointer-events-none absolute inset-0 select-none overflow-hidden z-0 transition-opacity duration-700 ease-out',
        playing ? 'opacity-40 sm:opacity-50' : 'opacity-100',
        className,
      )}
    >
      {/* 1. CAM (iOS): Gökyüzü Mavisi / Saydam Cam Kırılması ve Kristal Parlama */}
      {isCam && (
        <>
          <div
            className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[120vw] max-w-[900px] h-[65vh] rounded-full blur-2xl sm:blur-3xl transition-opacity duration-700"
            style={{
              background:
                'radial-gradient(ellipse 65% 50% at 50% 30%, rgba(56, 189, 248, 0.14) 0%, rgba(186, 230, 253, 0.05) 50%, transparent 75%)',
            }}
          />
          <div
            className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] max-w-[550px] h-[40vh] rounded-full blur-xl sm:blur-2xl transition-opacity duration-700"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.12) 0%, rgba(56, 189, 248, 0.04) 60%, transparent 80%)',
            }}
          />
        </>
      )}

      {/* 2. NEON (Siyah): Derin Cyber Mor / Elektrik Cyan & Neon Kırmızı Atmosferik Buğu */}
      {isNeon && (
        <>
          <div
            className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[130vw] max-w-[950px] h-[70vh] rounded-full blur-2xl sm:blur-3xl transition-opacity duration-700"
            style={{
              background:
                'radial-gradient(ellipse 70% 55% at 50% 35%, rgba(168, 85, 247, 0.16) 0%, rgba(147, 51, 234, 0.05) 55%, transparent 80%)',
            }}
          />
          <div
            className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55vw] max-w-[420px] h-[35vh] rounded-full blur-xl sm:blur-2xl transition-opacity duration-700"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.08) 0%, rgba(168, 85, 247, 0.03) 60%, transparent 80%)',
            }}
          />
        </>
      )}

      {/* 3. KAĞIT (Kindle / Parşömen): Sıcak Okuma Lambası & Sepya Akşam Işıltısı */}
      {isKagit && (
        <>
          <div
            className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110vw] max-w-[850px] h-[65vh] rounded-full blur-2xl sm:blur-3xl transition-opacity duration-700"
            style={{
              background:
                'radial-gradient(ellipse 75% 55% at 50% 45%, rgba(217, 180, 130, 0.18) 0%, rgba(180, 130, 80, 0.06) 55%, transparent 80%)',
            }}
          />
          <div
            className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[60vw] max-w-[480px] h-[30vh] rounded-full blur-xl sm:blur-2xl transition-opacity duration-700"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(254, 243, 199, 0.15) 0%, transparent 70%)',
            }}
          />
        </>
      )}
    </div>
  )
})
