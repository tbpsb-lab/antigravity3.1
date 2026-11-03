'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'

type GlassCornerCurlProps = {
  visible: boolean
  className?: string
}

/**
 * Cam (Apple / iOS / Frosted Glass) Temasına Özel Sağ Alt Köşe Cam Kıvrımı (Glass Page Curl)
 * - Ekranın en sağ alt köşesine yerleşir.
 * - Farklı ekranlarda (mobil dikey/yatay, tablet, masaüstü) bağlam yazısını (ContextPeek)
 *   ve alt kontrolleri engellemeyecek kompakt boyuttadır (28px - 44px).
 * - pointer-events-none ile hiçbir tıklama veya dokunma hareketini engellemez.
 * - Cam kenarındaki optik mavi/cyan kırılma (refraction bevel), silindirik kıvrım derinliği
 *   ve ışık parıltısı ile organik bir 3B cam hissi verir.
 */
export const GlassCornerCurl = memo(function GlassCornerCurl({
  visible,
  className,
}: GlassCornerCurlProps) {
  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none fixed bottom-0 right-0 z-20 select-none leading-none',
        'animate-in fade-in zoom-in-95 duration-500 ease-out',
        className,
      )}
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-8 sm:size-10 md:size-11 landscape-short:size-7 drop-shadow-[-2px_-2px_6px_rgba(56,189,248,0.38)] drop-shadow-[-1px_-1px_2px_rgba(15,23,42,0.15)] dark:drop-shadow-[-2px_-2px_8px_rgba(56,189,248,0.5)]"
      >
        <defs>
          {/* Cam kenarı optik cyan/turkuaz kırılma çizgisi gradyanı */}
          <linearGradient id="glass-curl-edge-cyan" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.85" />
            <stop offset="25%" stopColor="#38bdf8" stopOpacity="1" />
            <stop offset="55%" stopColor="#7dd3fc" stopOpacity="0.95" />
            <stop offset="85%" stopColor="#38bdf8" stopOpacity="1" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.9" />
          </linearGradient>

          {/* Kıvrılan camın dış dışbükey (convex) gövdesi (Açık mod) */}
          <linearGradient id="glass-curl-face-light" x1="15%" y1="85%" x2="85%" y2="15%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.78)" />
            <stop offset="30%" stopColor="rgba(224,242,254,0.45)" />
            <stop offset="60%" stopColor="rgba(255,255,255,0.92)" />
            <stop offset="85%" stopColor="rgba(186,230,253,0.55)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.72)" />
          </linearGradient>

          {/* Kıvrılan camın dış dışbükey gövdesi (Koyu mod) */}
          <linearGradient id="glass-curl-face-dark" x1="15%" y1="85%" x2="85%" y2="15%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="30%" stopColor="rgba(56,189,248,0.18)" />
            <stop offset="60%" stopColor="rgba(255,255,255,0.38)" />
            <stop offset="85%" stopColor="rgba(56,189,248,0.28)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.25)" />
          </linearGradient>

          {/* Silindirik rulo içi içbükey (concave) cam derinliği (Açık mod) */}
          <linearGradient id="glass-curl-underside-light" x1="30%" y1="70%" x2="70%" y2="30%">
            <stop offset="0%" stopColor="rgba(186,230,253,0.45)" />
            <stop offset="50%" stopColor="rgba(224,242,254,0.2)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.5)" />
          </linearGradient>

          {/* Silindirik rulo içi içbükey cam derinliği (Koyu mod) */}
          <linearGradient id="glass-curl-underside-dark" x1="30%" y1="70%" x2="70%" y2="30%">
            <stop offset="0%" stopColor="rgba(2,132,199,0.35)" />
            <stop offset="50%" stopColor="rgba(56,189,248,0.2)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
          </linearGradient>

          {/* Kaldırılan cam köşesinin arkasında kalan oyuğun alt gölgesi (Açık mod) */}
          <linearGradient id="glass-curl-crevice-light" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(2,132,199,0.35)" />
            <stop offset="40%" stopColor="rgba(56,189,248,0.18)" />
            <stop offset="80%" stopColor="rgba(148,163,184,0.08)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          {/* Kaldırılan cam köşesinin arkasında kalan oyuğun alt gölgesi (Koyu mod) */}
          <linearGradient id="glass-curl-crevice-dark" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.7)" />
            <stop offset="50%" stopColor="rgba(2,132,199,0.2)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>

          {/* Katlanma çizgisi boyunca optik ışık parlaması */}
          <linearGradient id="glass-curl-crease" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* 1. Köşe Boşluğu (Kaldırılan camın altındaki yumuşak kostik gölge) */}
        {/* Açık mod */}
        <path
          d="M 0 48 L 48 48 L 48 0 C 37 13, 13 37, 0 48 Z"
          fill="url(#glass-curl-crevice-light)"
          className="dark:hidden"
        />
        {/* Koyu mod */}
        <path
          d="M 0 48 L 48 48 L 48 0 C 37 13, 13 37, 0 48 Z"
          fill="url(#glass-curl-crevice-dark)"
          className="hidden dark:block"
        />

        {/* 2. Kıvrılan cam rulo gövdesi (3D silindirik saydam cam) */}
        {/* Açık mod */}
        <path
          d="M 0 48 C 8 47, 13 42, 15 36 C 16 27, 18 19, 24 16 C 36 14, 43 11, 46 8 C 47.5 5, 48 2, 48 0 C 37 13, 13 37, 0 48 Z"
          fill="url(#glass-curl-face-light)"
          className="dark:hidden"
        />
        {/* Koyu mod */}
        <path
          d="M 0 48 C 8 47, 13 42, 15 36 C 16 27, 18 19, 24 16 C 36 14, 43 11, 46 8 C 47.5 5, 48 2, 48 0 C 37 13, 13 37, 0 48 Z"
          fill="url(#glass-curl-face-dark)"
          className="hidden dark:block"
        />

        {/* 3. Silindirik rulo içi derinlik (İçbükey yansıma) */}
        {/* Açık mod */}
        <path
          d="M 3 45 C 9 41, 13 37, 15 32 C 16 25, 19 19, 24 17 C 33 16, 39 13, 44 8 C 36 15, 15 36, 3 45 Z"
          fill="url(#glass-curl-underside-light)"
          className="dark:hidden"
        />
        {/* Koyu mod */}
        <path
          d="M 3 45 C 9 41, 13 37, 15 32 C 16 25, 19 19, 24 17 C 33 16, 39 13, 44 8 C 36 15, 15 36, 3 45 Z"
          fill="url(#glass-curl-underside-dark)"
          className="hidden dark:block"
        />

        {/* 4. Katlanma ekseni parıltısı (Crease specular line) */}
        <path
          d="M 1 47 C 14 35, 35 14, 47 1"
          stroke="url(#glass-curl-crease)"
          strokeWidth="1.2"
          strokeLinecap="round"
          className="opacity-90 dark:opacity-60"
        />

        {/* 5. Cam rulosunun tepe kıvrım parıltısı (Highlight streak on cylindrical crest) */}
        <path
          d="M 15 36 C 16 27, 18 19, 24 16 C 32 14.5, 38 12.5, 43 9"
          stroke="rgba(255,255,255,0.95)"
          strokeWidth="0.8"
          strokeLinecap="round"
          className="dark:stroke-white/70"
        />

        {/* 6. Cam dış kenar kırılma çizgisi (Cyan optical refraction bevel) */}
        <path
          d="M 0 48 C 8 47, 13 42, 15 36 C 16 27, 18 19, 24 16 C 36 14, 43 11, 46 8 C 47.5 5, 48 2, 48 0"
          stroke="url(#glass-curl-edge-cyan)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
})
