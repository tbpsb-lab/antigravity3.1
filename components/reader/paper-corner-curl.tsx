'use client'

import { memo } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import paperCornerCurlImg from '@/assets/logos/paper-corner-curl.png'

type PaperCornerCurlProps = {
  visible: boolean
  className?: string
}

/**
  * Kağıt (Kindle / E-Kitap / Vintage Parchment) Temasına Özel Sağ Alt Köşe Sayfa Kıvrımı (Paper Page Curl)
  * - Ekranın en sağ alt köşesine yerleşir.
  * - Orijinal yüksek çözünürlüklü render görselinden kayıpsız ayıklanan fotogerçekçi sayfa kıvrımı.
  * - Dokulu parşömen kağıdı, 3D kıvrım derinliği ve yumuşak alt gölgesi retina kalitesinde net görünür.
  * - pointer-events-none ile hiçbir tıklama veya dokunma hareketini engellemez.
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
        'pointer-events-none fixed bottom-0 right-0 z-20 select-none overflow-hidden leading-none',
        'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 landscape-short:w-14 landscape-short:h-14',
        'animate-in fade-in zoom-in-95 duration-500 ease-out',
        'drop-shadow-[-2px_-2px_6px_rgba(45,35,20,0.22)] dark:drop-shadow-[-2px_-2px_8px_rgba(0,0,0,0.6)]',
        className,
      )}
    >
      <Image
        src={paperCornerCurlImg}
        alt="Kağıt Köşe Kıvrımı"
        width={96}
        height={96}
        priority
        className="w-full h-full object-contain object-bottom-right pointer-events-none select-none"
      />
    </div>
  )
})
