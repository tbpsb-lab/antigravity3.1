'use client'

import { memo } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import paperCornerCurlImg from '@/assets/logos/paper-corner-curl.png'

type PaperCornerCurlProps = {
  visible: boolean
  zen?: boolean
  canJumpPage?: boolean
  onPageCurlClick?: () => void
  className?: string
}

/**
 * Kağıt (Kindle / E-Kitap / Vintage Parchment) Temasına Özel Sağ Alt Köşe Sayfa Kıvrımı (Paper Page Curl)
 * - Ekranın en sağ alt köşesine yerleşir.
 * - Orijinal yüksek çözünürlüklü render görselinden kayıpsız ayıklanan fotogerçekçi sayfa kıvrımı.
 * - Dokulu parşömen kağıdı, 3D kıvrım derinliği ve yumuşak alt gölgesi retina kalitesinde net görünür.
 * - Zen (okuma) modunda dikkati dağıtmamak için %80 transparan (%20 görünür) hale gelir ve tıklanamaz.
 * - Kitap/PDF okurken tıklandığında bir sonraki sayfaya atlar.
 * - Arka planda kalır (z-0); tıklanınca etrafında kare çerçeve veya vurgu oluşmaz.
 */
export const PaperCornerCurl = memo(function PaperCornerCurl({
  visible,
  zen = false,
  canJumpPage = false,
  onPageCurlClick,
  className,
}: PaperCornerCurlProps) {
  if (!visible) return null

  const isClickable = !zen && canJumpPage && typeof onPageCurlClick === 'function'

  const content = (
    <Image
      src={paperCornerCurlImg}
      alt="Kağıt Köşe Kıvrımı"
      width={192}
      height={192}
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
        'fixed bottom-0 right-0 z-0 select-none overflow-hidden leading-none',
        'w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 landscape-short:w-24 landscape-short:h-24',
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
