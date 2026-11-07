'use client'

import { memo } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import neonCornerCurlImg from '@/assets/logos/neon-corner-curl.png'

type NeonCornerCurlProps = {
  visible: boolean
  zen?: boolean
  className?: string
}

/**
 * Neon (Linear / Raycast / Cyberpunk) Temasına Özel Sağ Alt Köşe Neon Kıvrımı (Neon Peel & Glow)
 * - Ekranın en sağ alt köşesine yerleşir.
 * - Cam kıvrımından 1.2 kat daha büyük (mobilde 77px, tablette 96px, masaüstünde 115px).
 * - Kıvrımın dış tarafında canlı mor neon ışıması ve tüpler, merkeze bakan iç tarafında ise sadece spiralli elektrik kabloları yer alır.
 * - Zen (okuma) modunda dikkati dağıtmamak için %80 transparan (%20 görünür) hale gelir.
 * - pointer-events-none ile hiçbir tıklama veya dokunma hareketini engellemez.
 */
export const NeonCornerCurl = memo(function NeonCornerCurl({
  visible,
  zen = false,
  className,
}: NeonCornerCurlProps) {
  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none fixed bottom-0 right-0 z-0 select-none overflow-hidden leading-none',
        'w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 landscape-short:w-24 landscape-short:h-24',
        'animate-in fade-in zoom-in-95 duration-500 ease-out',
        className,
      )}
    >
      <Image
        src={neonCornerCurlImg}
        alt="Neon Köşe Kıvrımı"
        width={208}
        height={208}
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
