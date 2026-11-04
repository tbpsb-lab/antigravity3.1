'use client'

import { memo } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import glassCornerCurlImg from '@/assets/logos/glass-corner-curl.png'

type GlassCornerCurlProps = {
  visible: boolean
  className?: string
}

/**
 * Cam (Apple / iOS / Frosted Glass) Temasına Özel Sağ Alt Köşe Cam Kıvrımı (Glass Page Curl)
 * - Ekranın en sağ alt köşesine yerleşir.
 * - Orijinal 3B renderdan birebir ayıklanan yüksek çözünürlüklü fotogerçekçi saydam cam görseli.
 * - 2x büyüklükte (mobilde 64px, tablette 80px, masaüstünde 96px), optik cam kalınlığı,
 *   turkuaz kırılma çizgisi ve silindirik ışık parlaması retina kalitesinde net görünür.
 * - pointer-events-none ile hiçbir tıklama veya dokunma hareketini engellemez.
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
        'pointer-events-none fixed bottom-0 right-0 z-20 select-none overflow-hidden leading-none',
        'w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 landscape-short:w-24 landscape-short:h-24',
        'animate-in fade-in zoom-in-95 duration-500 ease-out',
        'drop-shadow-[-2px_-2px_12px_rgba(56,189,248,0.45)] dark:drop-shadow-[-2px_-2px_16px_rgba(56,189,248,0.6)]',
        className,
      )}
    >
      <Image
        src={glassCornerCurlImg}
        alt="Cam Köşe Kıvrımı"
        width={160}
        height={160}
        priority
        className="w-full h-full object-contain object-bottom-right pointer-events-none select-none"
      />
    </div>
  )
})
