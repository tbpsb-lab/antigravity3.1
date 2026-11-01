'use client'

import {
  BookOpen,
  Check,
  Eye,
  Keyboard,
  Layers,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { ThemeId } from '@/lib/rsvp'

type AboutModalProps = {
  open: boolean
  onClose: () => void
  theme: ThemeId
}

// Modal Tepe Noktasında Sergilenen Yüksek Çözünürlüklü Büyük Tema Rozeti
function LargeThemedLogo({ theme }: { theme: ThemeId }) {
  if (theme === 'linear') {
    // 2. NEON SİYAH (Büyük Vitrin Rozeti)
    return (
      <div className="relative flex items-center justify-center py-2 animate-in fade-in zoom-in-95 duration-500">
        <div
          className={cn(
            'relative w-28 sm:w-32 h-18 sm:h-20 rounded-full p-[3px] bg-[#07060b] border-2 border-purple-500/60',
            'shadow-[0_0_28px_rgba(168,85,247,0.85),0_0_10px_rgba(192,132,252,0.6),inset_0_0_12px_rgba(168,85,247,0.5)]',
            'flex items-center justify-center shrink-0 select-none overflow-hidden transition-transform duration-500 hover:scale-105'
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="size-12 sm:size-14 transition-colors"
          >
            {/* 4 Köşe Vizör Parantezi (Cyan Neon) */}
            <path
              d="M 5.5 8.5 V 6.2 A 1.7 1.7 0 0 1 7.2 4.5 H 9.5"
              stroke="#a5f3fc"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_4px_#38bdf8]"
            />
            <path
              d="M 14.5 4.5 H 16.8 A 1.7 1.7 0 0 1 18.5 6.2 V 8.5"
              stroke="#a5f3fc"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_4px_#38bdf8]"
            />
            <path
              d="M 5.5 15.5 V 17.8 A 1.7 1.7 0 0 0 7.2 19.5 H 9.5"
              stroke="#a5f3fc"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_4px_#38bdf8]"
            />
            <path
              d="M 14.5 19.5 H 16.8 A 1.7 1.7 0 0 0 18.5 17.8 V 15.5"
              stroke="#a5f3fc"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_4px_#38bdf8]"
            />

            {/* Sol Hız Akış Kanatları */}
            <path
              d="M 10.2 10.1 L 5.6 10.5 L 10.2 10.9 A 0.4 0.4 0 0 0 10.2 10.1 Z"
              fill="#a5f3fc"
              stroke="#a5f3fc"
              strokeWidth="0.4"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_3px_#38bdf8]"
            />
            <path
              d="M 10.2 11.5 L 3.8 12.0 L 10.2 12.5 A 0.5 0.5 0 0 0 10.2 11.5 Z"
              fill="#a5f3fc"
              stroke="#a5f3fc"
              strokeWidth="0.5"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_4px_#38bdf8]"
            />
            <path
              d="M 10.2 13.1 L 5.6 13.5 L 10.2 13.9 A 0.4 0.4 0 0 0 10.2 13.1 Z"
              fill="#a5f3fc"
              stroke="#a5f3fc"
              strokeWidth="0.4"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_3px_#38bdf8]"
            />

            {/* Sağ Hız Akış Kanatları */}
            <path
              d="M 13.8 10.9 L 18.4 10.5 L 13.8 10.1 A 0.4 0.4 0 0 1 13.8 10.9 Z"
              fill="#a5f3fc"
              stroke="#a5f3fc"
              strokeWidth="0.4"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_3px_#38bdf8]"
            />
            <path
              d="M 13.8 12.5 L 20.2 12.0 L 13.8 11.5 A 0.5 0.5 0 0 1 13.8 12.5 Z"
              fill="#a5f3fc"
              stroke="#a5f3fc"
              strokeWidth="0.5"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_4px_#38bdf8]"
            />
            <path
              d="M 13.8 13.9 L 18.4 13.5 L 13.8 13.1 A 0.4 0.4 0 0 1 13.8 13.9 Z"
              fill="#a5f3fc"
              stroke="#a5f3fc"
              strokeWidth="0.4"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_3px_#38bdf8]"
            />

            {/* Merkez Dikey RSVP Kırmızı Neon Lazer Çizgisi */}
            <line
              x1="12"
              y1="4.5"
              x2="12"
              y2="19.5"
              stroke="#ef4444"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="drop-shadow-[0_0_6px_#ef4444]"
            />
          </svg>
        </div>
      </div>
    )
  }

  if (theme === 'kindle') {
    // 3. KAĞIT (Büyük Vitrin Rozeti)
    return (
      <div className="relative flex items-center justify-center py-2 animate-in fade-in zoom-in-95 duration-500">
        <div
          className={cn(
            'relative size-20 sm:size-22 rounded-2xl bg-[#fbf5e5] dark:bg-[#2c241a]',
            'border-2 border-[#cfbe96] dark:border-[#524433] shadow-[0_4px_16px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.8)]',
            'flex items-center justify-center shrink-0 select-none overflow-hidden transition-transform duration-500 hover:scale-105'
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="size-12 sm:size-14 transition-colors"
          >
            {/* 4 Köşe Vizör Parantezi (Sepya Mürekkep) */}
            <path
              d="M 5.5 8.5 V 6.2 A 1.7 1.7 0 0 1 7.2 4.5 H 9.5"
              stroke="#654a33"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 14.5 4.5 H 16.8 A 1.7 1.7 0 0 1 18.5 6.2 V 8.5"
              stroke="#654a33"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 5.5 15.5 V 17.8 A 1.7 1.7 0 0 0 7.2 19.5 H 9.5"
              stroke="#654a33"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 14.5 19.5 H 16.8 A 1.7 1.7 0 0 0 18.5 17.8 V 15.5"
              stroke="#654a33"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Sol Hız Akış Kanatları */}
            <path
              d="M 10.2 10.1 L 5.6 10.5 L 10.2 10.9 A 0.4 0.4 0 0 0 10.2 10.1 Z"
              fill="#654a33"
              stroke="#654a33"
              strokeWidth="0.4"
              strokeLinejoin="round"
            />
            <path
              d="M 10.2 11.5 L 3.8 12.0 L 10.2 12.5 A 0.5 0.5 0 0 0 10.2 11.5 Z"
              fill="#654a33"
              stroke="#654a33"
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
            <path
              d="M 10.2 13.1 L 5.6 13.5 L 10.2 13.9 A 0.4 0.4 0 0 0 10.2 13.1 Z"
              fill="#654a33"
              stroke="#654a33"
              strokeWidth="0.4"
              strokeLinejoin="round"
            />

            {/* Sağ Hız Akış Kanatları */}
            <path
              d="M 13.8 10.9 L 18.4 10.5 L 13.8 10.1 A 0.4 0.4 0 0 1 13.8 10.9 Z"
              fill="#654a33"
              stroke="#654a33"
              strokeWidth="0.4"
              strokeLinejoin="round"
            />
            <path
              d="M 13.8 12.5 L 20.2 12.0 L 13.8 11.5 A 0.5 0.5 0 0 1 13.8 12.5 Z"
              fill="#654a33"
              stroke="#654a33"
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
            <path
              d="M 13.8 13.9 L 18.4 13.5 L 13.8 13.1 A 0.4 0.4 0 0 1 13.8 13.9 Z"
              fill="#654a33"
              stroke="#654a33"
              strokeWidth="0.4"
              strokeLinejoin="round"
            />

            {/* Merkez Dikey RSVP Bordo Mürekkep Kılavuzu */}
            <line
              x1="12"
              y1="4.5"
              x2="12"
              y2="19.5"
              stroke="#b44c43"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>

          {/* Sağ Alt Köşe Büyük Sayfa Kıvrımı (Dog-Ear) */}
          <svg
            className="absolute bottom-0 right-0 size-6 sm:size-7 pointer-events-none"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path d="M 0 12 L 12 0 L 12 12 Z" fill="rgba(0,0,0,0.24)" />
            <path d="M 0 12 C 2 7, 7 2, 12 0 C 8 5, 5 8, 0 12 Z" fill="#d0bf98" />
            <path d="M 1 11 C 3 7, 7 3, 11 1 C 8 5, 5 8, 1 11 Z" fill="#f6ede0" />
          </svg>
        </div>
      </div>
    )
  }

  // 1. CAM (Büyük Vitrin Rozeti)
  return (
    <div className="relative flex items-center justify-center py-2 animate-in fade-in zoom-in-95 duration-500">
      <div
        className={cn(
          'relative size-20 sm:size-22 rounded-full',
          'border-2 border-white/85 dark:border-white/40',
          'bg-gradient-to-br from-white/95 via-white/50 to-white/10 dark:from-white/35 dark:via-white/15 dark:to-transparent backdrop-blur-md',
          'shadow-[0_0_24px_rgba(56,189,248,0.6),inset_0_2px_4px_rgba(255,255,255,0.95)]',
          'flex items-center justify-center shrink-0 select-none overflow-hidden transition-transform duration-500 hover:scale-105'
        )}
      >
        {/* Canlı cyan (açık mavi) cam kırılma hilali */}
        <span className="absolute -inset-1 rounded-full bg-[radial-gradient(circle_at_88%_60%,rgba(56,189,248,0.9)_0%,rgba(56,189,248,0.25)_40%,transparent_65%)] pointer-events-none" />

        {/* Çapraz kavisli cam parlaması */}
        <span className="absolute -top-2 right-1.5 w-12 h-20 -rotate-[35deg] bg-gradient-to-b from-white/90 via-white/25 to-transparent pointer-events-none rounded-full blur-[0.6px]" />

        {/* Üst kenar ince specular parıltı */}
        <span className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-white/95 pointer-events-none shadow-[0_0_3px_rgba(255,255,255,0.9)]" />

        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 size-12 sm:size-14 transition-colors"
        >
          {/* 4 Köşe Vizör Parantezi (Saydam Beyaz Cam) */}
          <path
            d="M 5.5 8.5 V 6.2 A 1.7 1.7 0 0 1 7.2 4.5 H 9.5"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]"
          />
          <path
            d="M 14.5 4.5 H 16.8 A 1.7 1.7 0 0 1 18.5 6.2 V 8.5"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]"
          />
          <path
            d="M 5.5 15.5 V 17.8 A 1.7 1.7 0 0 0 7.2 19.5 H 9.5"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]"
          />
          <path
            d="M 14.5 19.5 H 16.8 A 1.7 1.7 0 0 0 18.5 17.8 V 15.5"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]"
          />

          {/* Sol Hız Akış Kanatları */}
          <path
            d="M 10.2 10.1 L 5.6 10.5 L 10.2 10.9 A 0.4 0.4 0 0 0 10.2 10.1 Z"
            fill="white"
            stroke="white"
            strokeWidth="0.4"
            strokeLinejoin="round"
            className="drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]"
          />
          <path
            d="M 10.2 11.5 L 3.8 12.0 L 10.2 12.5 A 0.5 0.5 0 0 0 10.2 11.5 Z"
            fill="white"
            stroke="white"
            strokeWidth="0.5"
            strokeLinejoin="round"
            className="drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]"
          />
          <path
            d="M 10.2 13.1 L 5.6 13.5 L 10.2 13.9 A 0.4 0.4 0 0 0 10.2 13.1 Z"
            fill="white"
            stroke="white"
            strokeWidth="0.4"
            strokeLinejoin="round"
            className="drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]"
          />

          {/* Sağ Hız Akış Kanatları */}
          <path
            d="M 13.8 10.9 L 18.4 10.5 L 13.8 10.1 A 0.4 0.4 0 0 1 13.8 10.9 Z"
            fill="white"
            stroke="white"
            strokeWidth="0.4"
            strokeLinejoin="round"
            className="drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]"
          />
          <path
            d="M 13.8 12.5 L 20.2 12.0 L 13.8 11.5 A 0.5 0.5 0 0 1 13.8 12.5 Z"
            fill="white"
            stroke="white"
            strokeWidth="0.5"
            strokeLinejoin="round"
            className="drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]"
          />
          <path
            d="M 13.8 13.9 L 18.4 13.5 L 13.8 13.1 A 0.4 0.4 0 0 1 13.8 13.9 Z"
            fill="white"
            stroke="white"
            strokeWidth="0.4"
            strokeLinejoin="round"
            className="drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]"
          />

          {/* Merkez Dikey RSVP Kırmızı Lazer Odak Çizgisi */}
          <line
            x1="12"
            y1="4.5"
            x2="12"
            y2="19.5"
            stroke="#ef4444"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="drop-shadow-[0_0_5px_rgba(239,68,68,0.85)]"
          />
        </svg>
      </div>
    </div>
  )
}

export function AboutModal({ open, onClose, theme }: AboutModalProps) {
  const [activeTab, setActiveTab] = useState<'rsvp' | 'features' | 'shortcuts' | 'colophon'>('rsvp')

  // ESC ile kapatma
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-md animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={cn(
          'panel relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-8 shadow-2xl',
          'flex flex-col gap-6 border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] animate-in zoom-in-95',
          theme === 'linear' && 'border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.25)] bg-[#07060b]/95 text-slate-100',
          theme === 'kindle' && 'border-[#cfbe96] shadow-[0_8px_30px_rgba(0,0,0,0.15)] bg-[#fcf8ee] text-[#332a1f]',
          theme === 'ios' && 'border-white/80 dark:border-white/20 shadow-[0_8px_32px_rgba(56,189,248,0.15)] backdrop-blur-xl'
        )}
      >
        {/* Kapat Butonu */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 size-9 rounded-full panel grid place-items-center text-muted-foreground hover:text-foreground transition-all hover:scale-105 active:scale-95 cursor-pointer z-20"
          aria-label="Kapat"
        >
          <X className="size-4.5" />
        </button>

        {/* Üst Alan: Yüksek Çözünürlüklü Büyük Tema Rozeti & Başlık */}
        <div className="flex flex-col items-center text-center gap-3 pt-1">
          <LargeThemedLogo theme={theme} />
          <div>
            <h2 id="about-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight">
              Odak • Bilimsel Hızlı Okuma
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Göz kaslarının mekanik yorgunluğunu sıfırlayan, zihnin anlama hızını katlayan yeni nesil RSVP platformu.
            </p>
          </div>
        </div>

        {/* Sekme Butonları (Pill Tabs) */}
        <div className="flex items-center justify-center gap-1.5 p-1 rounded-2xl bg-muted/60 backdrop-blur-sm overflow-x-auto select-none border border-border/40">
          <button
            type="button"
            onClick={() => setActiveTab('rsvp')}
            className={cn(
              'flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer shrink-0',
              activeTab === 'rsvp'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Zap className="size-3.5 text-pivot" />
            <span>RSVP & Bilim</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={cn(
              'flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer shrink-0',
              activeTab === 'features'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Sparkles className="size-3.5 text-sky-500" />
            <span>Özellikler</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shortcuts')}
            className={cn(
              'flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer shrink-0',
              activeTab === 'shortcuts'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Keyboard className="size-3.5 text-purple-500" />
            <span>Kısayollar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('colophon')}
            className={cn(
              'flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer shrink-0',
              activeTab === 'colophon'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ShieldCheck className="size-3.5 text-emerald-500" />
            <span>Künye & Gizlilik</span>
          </button>
        </div>

        {/* Sekme İçerikleri */}
        <div className="text-sm leading-relaxed min-h-[260px]">
          {/* 1. RSVP & Bilim */}
          {activeTab === 'rsvp' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-300">
              <div className="panel p-4 rounded-2xl border border-border/50">
                <div className="flex items-center gap-2 font-semibold text-foreground mb-1.5">
                  <Eye className="size-4 text-pivot" />
                  <h4>Sakkad Hareketlerini Sıfırlama</h4>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Geleneksel okumada gözlerimiz satır üzerinde sürekli sağa-sola sıçrar (sakkad) ve istemsiz geriye dönüşlerle (regresyon) duraklar. Bu mekanik hareket, toplam okuma sürenizin yaklaşık %70&apos;ini boşa harcar. Odak, kelimeleri gözünüzün tam önüne getirerek göz kaslarını tamamen dinlendirir.
                </p>
              </div>

              <div className="panel p-4 rounded-2xl border border-border/50">
                <div className="flex items-center gap-2 font-semibold text-foreground mb-1.5">
                  <div className="size-2 rounded-full bg-pivot pivot-glow" />
                  <h4>ORP (Optimal Recognition Point / Optimal Tanıma Noktası)</h4>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  İnsan beyni bir kelimeyi ilk harfinden tanımaz; kelimenin ağırlık merkezindeki en ayırt edici harfe kilitlenerek kelimeyi bir bütün olarak algılar. Kırmızı dikey lazer eksenimiz, her kelimenin ORP harfini aynı yatay koordinata milimetrik sabitler.
                </p>
              </div>

              <div className="panel p-4 rounded-2xl border border-border/50">
                <div className="flex items-center gap-2 font-semibold text-foreground mb-1.5">
                  <Zap className="size-4 text-amber-500" />
                  <h4>İç Seslendirmeyi (Subvocalization) Kırma</h4>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Kafamızın içinde kelimeleri fısıldama alışkanlığı bizi konuşma hızına (dakikada ~200-250 kelime) kilitler. RSVP ile hızınızı kademeli olarak 400-600 WPM seviyesine çıkardığınızda, iç ses susar ve doğrudan görsel kavrama devreye girer.
                </p>
              </div>
            </div>
          )}

          {/* 2. Özellikler */}
          {activeTab === 'features' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="panel p-4 rounded-2xl border border-border/50">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 mb-1">
                    <Layers className="size-4 text-sky-500" />
                    3 Fiziksel Dünya Teması
                  </h4>
                  <p className="text-muted-foreground text-xs">
                    <strong>Cam:</strong> Saydam mineral lens derinliği.<br />
                    <strong>Neon:</strong> Gece ve OLED için derin siyah & mor neon.<br />
                    <strong>Kağıt:</strong> E-kitap ve sıcak kitap parşömeni.
                  </p>
                </div>

                <div className="panel p-4 rounded-2xl border border-border/50">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 mb-1">
                    <BookOpen className="size-4 text-emerald-500" />
                    Tüm Dosya Formatları
                  </h4>
                  <p className="text-muted-foreground text-xs">
                    PDF, EPUB, TXT veya doğrudan panodan kopyala-yapıştır metinler. Kesilen kelimeler, sayfa sonları ve dipnotlar otomatik olarak pürüzsüzleştirilir.
                  </p>
                </div>

                <div className="panel p-4 rounded-2xl border border-border/50">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 mb-1">
                    <Sparkles className="size-4 text-amber-500" />
                    Akıllı Ritmik Duraksama
                  </h4>
                  <p className="text-muted-foreground text-xs">
                    Nokta, soru işareti, iki nokta, virgül ve uzun teknik kelimelerde doğal nefes alma mikro-duraklamaları uygulanarak anlama kaybı engellenir.
                  </p>
                </div>

                <div className="panel p-4 rounded-2xl border border-border/50">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 mb-1">
                    <Zap className="size-4 text-pivot" />
                    Nirengi Hız Kalibrasyonu
                  </h4>
                  <p className="text-muted-foreground text-xs">
                    Üst bardaki şimşek simgesiyle 60 saniyede doğal okuma hızınızı ölçün; platform ideal RSVP başlangıç hızınızı otomatik hesaplar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3. Kısayollar & Rehber */}
          {activeTab === 'shortcuts' && (
            <div className="flex flex-col gap-3 animate-in fade-in duration-300">
              <div className="panel p-4 rounded-2xl border border-border/50">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Keyboard className="size-4 text-purple-500" />
                  Klavye & Fareyle Tam Kontrol
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                    <span className="text-muted-foreground">Başlat / Duraklat</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/60 text-xs font-mono font-semibold">Boşluk (Space)</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                    <span className="text-muted-foreground">Hız Değiştir (±25 WPM)</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/60 text-xs font-mono font-semibold">↑ / ↓ veya Scroll</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                    <span className="text-muted-foreground">1 Cümle Geri / İleri</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/60 text-xs font-mono font-semibold">← / →</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                    <span className="text-muted-foreground">1 Paragraf Atla</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/60 text-xs font-mono font-semibold">Shift + ← / →</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                    <span className="text-muted-foreground">Temaları Değiştir</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/60 text-xs font-mono font-semibold">1, 2, 3</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                    <span className="text-muted-foreground">Tam Ekran</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/60 text-xs font-mono font-semibold">F</kbd>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                İpucu: Okuma akarken dahi farenin tekerleğini ileri/geri kaydırarak hızınızı 25&apos;er kelime değiştirebilirsiniz.
              </p>
            </div>
          )}

          {/* 4. Künye & Gizlilik */}
          {activeTab === 'colophon' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-300">
              <div className="panel p-4 rounded-2xl border border-border/50">
                <div className="flex items-center gap-2 font-semibold text-foreground mb-1.5">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  <h4>%100 Cihaz İçi Gizlilik (Yerel İşleme)</h4>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Yüklediğiniz kitaplar, özel PDF&apos;ler veya çalışma metinleriniz <strong>kesinlikle hiçbir sunucuya yüklenmez</strong>. Tüm metin ayıklama, kelime dizimi ve RSVP motoru doğrudan tarayıcınızın kendi belleğinde (in-memory) çalışır. İnternet bağlantınızı kesseniz dahi kusursuz çalışmaya devam eder.
                </p>
              </div>

              <div className="panel p-4 rounded-2xl border border-border/50">
                <div className="flex items-center gap-2 font-semibold text-foreground mb-1.5">
                  <Check className="size-4 text-sky-500" />
                  <h4>Teknoloji & Mimari</h4>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Next.js, React, TypeScript, Tailwind CSS, Web Streams ve PDF.js kullanılarak yüksek tazeleme hızı (60fps/120fps) ve pürüzsüz animasyonlar için optimize edilmiştir.
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Sürüm 3.1 • Açık Kaynak Odak Motoru</span>
                <span>PWA • Masaüstü ve Mobil Uyumlu</span>
              </div>
            </div>
          )}
        </div>

        {/* Alt Kapatma Çubuğu */}
        <div className="flex items-center justify-end pt-2 border-t border-border/40">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer shadow-md"
          >
            Anladım, Okumaya Devam Et
          </button>
        </div>
      </div>
    </div>
  )
}
