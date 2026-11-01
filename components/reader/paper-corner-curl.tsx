'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'

type PaperCornerCurlProps = {
  visible: boolean
  className?: string
}

/**
 * Kağıt (Kindle / E-Kitap) Temasına Özel Sağ Alt Köşe Sayfa Kıvrımı (Dog-Ear Page Curl)
 * - Ekranın en sağ alt köşesine yerleşir.
 * - Bağlam yazısını (ContextPeek) ve alt kontrolleri etkilemeyecek boyuttadır (~32px - 44px).
 * - pointer-events-none ile hiçbir tıklama veya dokunma hareketini engellemez.
 * - Hem açık (krem parşömen) hem koyu (eski antika kağıt) modlara uyumludur.
 */
export const PaperCornerCurl = memo(function PaperCornerCurl({
  visible,
  className,
}: PaperCornerCurlProps) {
  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none fixed bottom-0 right-0 z-20 select-none',
        'animate-in fade-in zoom-in-95 duration-500 ease-out',
        className,
      )}
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-8 sm:size-10 md:size-11 drop-shadow-[-2px_-2px_4px_rgba(45,35,20,0.22)] dark:drop-shadow-[-2px_-2px_6px_rgba(0,0,0,0.6)]"
      >
        <defs>
          {/* Katlanan kağıdın arka yüzey gradyanı (Açık mod) */}
          <linearGradient id="paper-curl-face-light" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c8b58f" />
            <stop offset="30%" stopColor="#decfae" />
            <stop offset="65%" stopColor="#efe5ce" />
            <stop offset="100%" stopColor="#faf5e8" />
          </linearGradient>

          {/* Katlanan kağıdın arka yüzey gradyanı (Koyu mod) */}
          <linearGradient id="paper-curl-face-dark" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e1710" />
            <stop offset="35%" stopColor="#31261a" />
            <stop offset="70%" stopColor="#443525" />
            <stop offset="100%" stopColor="#554430" />
          </linearGradient>

          {/* Kaldırılan sayfa köşesinin arkasında kalan boşluğun iç gölgesi */}
          <linearGradient id="paper-curl-crevice" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(40,25,12,0.4)" />
            <stop offset="50%" stopColor="rgba(40,25,12,0.18)" />
            <stop offset="100%" stopColor="rgba(40,25,12,0.04)" />
          </linearGradient>
        </defs>

        {/* 1. Köşe boşluğu (Sayfa kaldırılınca arkada beliren zemin üçgeni) */}
        <path
          d="M 0 48 L 48 48 L 48 0 C 36 14, 14 36, 0 48 Z"
          fill="url(#paper-curl-crevice)"
        />

        {/* 2. Kıvrılan sayfa kanadı (3D silindirik kağıt kıvrımı) */}
        {/* Açık Mod */}
        <path
          d="M 0 48 C 14 36, 36 14, 48 0 C 32 3, 16 3, 6 6 C 3 16, 3 32, 0 48 Z"
          fill="url(#paper-curl-face-light)"
          className="dark:hidden"
        />
        {/* Koyu Mod */}
        <path
          d="M 0 48 C 14 36, 36 14, 48 0 C 32 3, 16 3, 6 6 C 3 16, 3 32, 0 48 Z"
          fill="url(#paper-curl-face-dark)"
          className="hidden dark:block"
        />

        {/* 3. Katlanma kıvrım çizgisi boyunca ince parıltı (Crease shine) */}
        <path
          d="M 1 47 C 14 35, 35 14, 47 1"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="0.8"
          strokeLinecap="round"
          className="dark:stroke-white/20"
        />

        {/* 4. Kıvrılan kanat kenarındaki ince mürekkep hat */}
        <path
          d="M 48 0 C 32 3, 16 3, 6 6 C 3 16, 3 32, 0 48"
          stroke="rgba(90,65,40,0.25)"
          strokeWidth="0.6"
          strokeLinecap="round"
          className="dark:stroke-black/50"
        />
      </svg>
    </div>
  )
})
