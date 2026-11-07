'use client'

import { memo } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import paperCornerCurlImg from '@/assets/logos/paper-corner-curl.png'

type PaperCornerCurlProps = {
  visible: boolean
  zen?: boolean
  className?: string
}

/**
  * Kağıt (Kindle / E-Kitap / Vintage Parchment) Temasına Özel Sağ Alt Köşe Sayfa Kıvrımı (Paper Page Curl)
  * - Ekranın en sağ alt köşesine yerleşir.
  * - Orijinal yüksek çözünürlüklü render görselinden kayıpsız ayıklanan fotogerçekçi sayfa kıvrımı.
  * - Dokulu parşömen kağıdı, 3D kıvrım derinliği ve yumuşak alt gölgesi retina kalitesinde net görünür.
  * - Zen (okuma) modunda dikkati dağıtmamak için %80 transparan (%20 görünür) hale gelir.
  * - pointer-events-none ile hiçbir tıklama veya dokunma hareketini engellemez.
  */
export const PaperCornerCurl = memo(function PaperCornerCurl({
  visible,
  zen = false,
  className,
}: PaperCornerCurlProps) {
  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none fixed bottom-0 right-0 z-10 select-none overflow-hidden leading-none',
        'w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 landscape-short:w-24 landscape-short:h-24',
        'animate-in fade-in zoom-in-95 duration-500 ease-out',
        className,
      )}
    >
      <Image
        src={paperCornerCurlImg}
        alt="Kağıt Köşe Kıvrımı"
        width={192}
        height={192}
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
