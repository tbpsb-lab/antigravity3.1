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
 * - Orijinal yüksek çözünürlüklü render görselinden kayıpsız ayıklanan fotogerçekçi neon tüpleri ve kıvrık yüzey.
 * - Siyah zemin plakası, canlı mor/eflatun/kırmızı neon tüpleri, spiralli elektrik kabloları ve mor atmosferik ışıma.
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
        'pointer-events-none fixed bottom-0 right-0 z-20 select-none overflow-hidden leading-none',
        'w-16 h-[4.7rem] sm:w-20 sm:h-[5.85rem] md:w-24 md:h-[7rem] landscape-short:w-14 landscape-short:h-16',
        'animate-in fade-in zoom-in-95 duration-500 ease-out',
        'drop-shadow-[-2px_-2px_12px_rgba(168,85,247,0.55)] drop-shadow-[0_0_20px_rgba(168,85,247,0.35)]',
        className,
      )}
    >
      <Image
        src={neonCornerCurlImg}
        alt="Neon Köşe Kıvrımı"
        width={96}
        height={112}
        priority
        className="w-full h-full object-contain object-bottom-right pointer-events-none select-none"
      />
    </div>
  )
})
