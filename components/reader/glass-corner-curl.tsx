'use client'

import { memo } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import glassCornerCurlImg from '@/assets/logos/glass-corner-curl.png'

type GlassCornerCurlProps = {
  visible: boolean
  zen?: boolean
  canJumpPage?: boolean
  onPageCurlClick?: () => void
  className?: string
}

/**
 * Cam (Apple / iOS / Frosted Glass) Temasına Özel Sağ Alt Köşe Cam Kıvrımı (Glass Page Curl)
 * - Ekranın en sağ alt köşesine yerleşir.
 * - Orijinal 3B renderdan birebir ayıklanan yüksek çözünürlüklü fotogerçekçi saydam cam görseli.
 * - 2x büyüklükte (mobilde 64px, tablette 80px, masaüstünde 96px), optik cam kalınlığı,
 *   turkuaz kırılma çizgisi ve silindirik ışık parlaması retina kalitesinde net görünür.
 * - Zen (okuma) modunda dikkati dağıtmamak için %80 transparan (%20 görünür) hale gelir ve tıklanamaz.
 * - Kitap/PDF okurken tıklandığında bir sonraki sayfaya atlar.
 * - Arka planda kalır (z-0); tıklanınca etrafında kare çerçeve veya vurgu oluşmaz.
 */
export const GlassCornerCurl = memo(function GlassCornerCurl({
  visible,
  zen = false,
  canJumpPage = false,
  onPageCurlClick,
  className,
}: GlassCornerCurlProps) {
  if (!visible) return null

  const isClickable = !zen && canJumpPage && typeof onPageCurlClick === 'function'

  const content = (
    <Image
      src={glassCornerCurlImg}
      alt="Cam Köşe Kıvrımı"
      width={128}
      height={128}
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
      className={cn(
        'fixed bottom-0 right-0 z-0 select-none overflow-hidden leading-none',
        'w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 landscape-short:w-16 landscape-short:h-16',
        'animate-in fade-in zoom-in-95 duration-500 ease-out',
        'drop-shadow-[-2px_-2px_10px_rgba(56,189,248,0.4)] dark:drop-shadow-[-2px_-2px_14px_rgba(56,189,248,0.55)]',
        isClickable ? 'pointer-events-auto' : 'pointer-events-none',
        className,
      )}
    >
      {isClickable ? (
        <button
          type="button"
          tabIndex={-1}
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
