'use client'

import { memo } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import glassCornerCurlImg from '@/assets/logos/glass-corner-curl.png'

type GlassCornerCurlProps = {
  visible: boolean
  zen?: boolean
  className?: string
}

/**
 * Cam (Apple / iOS / Frosted Glass) Temasına Özel Sağ Alt Köşe Cam Kıvrımı (Glass Page Curl)
 * - Ekranın en sağ alt köşesine yerleşir.
 * - Orijinal 3B renderdan birebir ayıklanan yüksek çözünürlüklü fotogerçekçi saydam cam görseli.
 * - 2x büyüklükte (mobilde 64px, tablette 80px, masaüstünde 96px), optik cam kalınlığı,
 *   turkuaz kırılma çizgisi ve silindirik ışık parlaması retina kalitesinde net görünür.
 * - Zen (okuma) modunda dikkati dağıtmamak için %80 transparan (%20 görünür) hale gelir.
 * - pointer-events-none ile hiçbir tıklama veya dokunma hareketini engellemez.
 */
export const GlassCornerCurl = memo(function GlassCornerCurl({
  visible,
  zen = false,
  className,
}: GlassCornerCurlProps) {
  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none fixed bottom-0 right-0 z-10 select-none overflow-hidden leading-none',
        'w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 landscape-short:w-16 landscape-short:h-16',
        'animate-in fade-in zoom-in-95 duration-500 ease-out',
        'drop-shadow-[-2px_-2px_10px_rgba(56,189,248,0.4)] dark:drop-shadow-[-2px_-2px_14px_rgba(56,189,248,0.55)]',
        className,
      )}
    >
      <Image
        src={glassCornerCurlImg}
        alt="Cam Köşe Kıvrımı"
        width={128}
        height={128}
        priority
        unoptimized
        style={{ opacity: zen ? 0.2 : 1 }}
        className={cn(
          'w-full h-full object-contain object-bottom-right pointer-events-none select-none transition-opacity duration-500 ease-out',
          zen ? 'opacity-20' : 'opacity-100',
        )}
      />
    </div>
  )
})
