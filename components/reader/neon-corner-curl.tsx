'use client'

import { memo } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import neonCornerCurlImg from '@/assets/logos/neon-corner-curl.png'

type NeonCornerCurlProps = {
  visible: boolean
  zen?: boolean
  canJumpPage?: boolean
  onPageCurlClick?: () => void
  className?: string
}

/**
 * Neon (Linear / Raycast / Cyberpunk) Temasına Özel Sağ Alt Köşe Neon Kıvrımı (Neon Peel & Glow)
 * - Ekranın en sağ alt köşesine yerleşir.
 * - Cam kıvrımından 1.2 kat daha büyük (mobilde 77px, tablette 96px, masaüstünde 115px).
 * - Kıvrımın dış tarafında canlı mor neon ışıması ve tüpler, merkeze bakan iç tarafında ise sadece spiralli elektrik kabloları yer alır.
 * - Zen (okuma) modunda dikkati dağıtmamak için %80 transparan (%20 görünür) hale gelir ve tıklanamaz.
 * - Kitap/PDF okurken tıklandığında bir sonraki sayfaya atlar.
 * - Arka planda kalır (z-0); tıklanınca etrafında kare çerçeve veya vurgu oluşmaz.
 */
export const NeonCornerCurl = memo(function NeonCornerCurl({
  visible,
  zen = false,
  canJumpPage = false,
  onPageCurlClick,
  className,
}: NeonCornerCurlProps) {
  if (!visible) return null

  const isClickable = !zen && canJumpPage && typeof onPageCurlClick === 'function'

  const content = (
    <Image
      src={neonCornerCurlImg}
      alt="Neon Köşe Kıvrımı"
      width={208}
      height={208}
      priority
      unoptimized
      draggable={false}
      style={{ opacity: zen ? 0.2 : 1 }}
      className={cn(
        'w-full h-full object-contain object-bottom-right pointer-events-none select-none transition-all duration-300 ease-out',
        zen ? 'opacity-20' : 'opacity-100',
        isClickable && 'group-hover:scale-[1.02] group-active:scale-[0.96]',
      )}
    />
  )

  return (
    <div
      data-wheel="page-nav"
      className={cn(
        'fixed bottom-0 right-0 z-30 select-none overflow-hidden leading-none',
        'w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 landscape-short:w-24 landscape-short:h-24',
        'animate-in fade-in zoom-in-95 duration-500 ease-out',
        isClickable ? 'pointer-events-auto' : 'pointer-events-none',
        className,
      )}
    >
      {isClickable ? (
        <button
          type="button"
          tabIndex={-1}
          data-wheel="page-nav"
          onClick={(e) => {
            e.stopPropagation()
            onPageCurlClick?.()
          }}
          aria-label="Sonraki kitap sayfasına atla"
          title="Sonraki sayfaya atla"
          className={cn(
            'group relative w-full h-full p-0 m-0 border-0 border-none outline-none ring-0',
            'focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0',
            'bg-transparent hover:bg-transparent active:bg-transparent focus:bg-transparent',
            '[-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]',
            'shadow-none select-none cursor-pointer overflow-hidden leading-none',
            'transition-transform duration-150',
          )}
        >
          {content}
        </button>
      ) : (
        <div aria-hidden="true" className="w-full h-full pointer-events-none select-none">
          {content}
        </div>
      )}
    </div>
  )
})
