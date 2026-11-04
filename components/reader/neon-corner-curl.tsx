'use client'

import { memo } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import neonCornerCurlImg from '@/assets/logos/neon-corner-curl.png'

type NeonCornerCurlProps = {
  visible: boolean
  className?: string
}

/**
 * Neon (Linear / Raycast / Cyberpunk) Temasına Özel Sağ Alt Köşe Neon Kıvrımı (Neon Peel & Glow)
 * - Ekranın en sağ alt köşesine yerleşir.
 * - Cam kıvrımından 1.2 kat daha büyük (mobilde 77px, tablette 96px, masaüstünde 115px).
 * - Kıvrımın dış tarafında canlı mor neon ışıması ve tüpler, merkeze bakan iç tarafında ise sadece spiralli elektrik kabloları yer alır.
 * - pointer-events-none ile hiçbir tıklama veya dokunma hareketini engellemez.
 */
export const NeonCornerCurl = memo(function NeonCornerCurl({
  visible,
  className,
}: NeonCornerCurlProps) {
  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none fixed bottom-0 right-0 z-0 select-none overflow-hidden leading-none',
        'w-28 h-28 sm:w-36 sm:h-36 md:w-42 md:h-42 landscape-short:w-20 landscape-short:h-20',
        'animate-in fade-in zoom-in-95 duration-500 ease-out',
        className,
      )}
    >
      <Image
        src={neonCornerCurlImg}
        alt="Neon Köşe Kıvrımı"
        width={168}
        height={168}
        priority
        className="w-full h-full object-contain object-bottom-right pointer-events-none select-none"
      />
    </div>
  )
})
