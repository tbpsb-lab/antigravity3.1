'use client'

import {
  BookOpen,
  Bookmark,
  Compass,
  Eye,
  FileText,
  Keyboard,
  Layers,
  Maximize,
  MousePointer,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Touchpad,
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
  const [activeTab, setActiveTab] = useState<'rsvp' | 'features' | 'controls' | 'colophon'>('rsvp')

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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={cn(
          'panel theme-scrollbar relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl p-5 sm:p-8 shadow-2xl',
          'flex flex-col gap-5 border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] animate-in zoom-in-95',
          theme === 'linear' && 'border-purple-500/40 shadow-[0_0_40px_rgba(168,85,247,0.3)] bg-[#07060b]/95 text-slate-100',
          theme === 'kindle' && 'border-[#cfbe96] shadow-[0_8px_30px_rgba(0,0,0,0.15)] bg-[#fcf8ee] text-[#332a1f]',
          theme === 'ios' && 'border-white/80 dark:border-white/20 shadow-[0_8px_32px_rgba(56,189,248,0.2)] backdrop-blur-xl'
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
        <div className="flex flex-col items-center text-center gap-2 pt-1">
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

        {/* Ferah Sekme Butonları (Grid Layout: Asla Sıkışmaz ve Taşmaz) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full select-none">
          <button
            type="button"
            onClick={() => setActiveTab('rsvp')}
            className={cn(
              'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer border',
              activeTab === 'rsvp'
                ? theme === 'linear'
                  ? 'bg-purple-950/70 text-purple-200 border-purple-400/80 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                  : theme === 'kindle'
                  ? 'bg-[#ede3cf] dark:bg-[#3d3326] text-[#3d2f21] dark:text-[#f3ede1] border-[#b8a783]'
                  : 'bg-white/90 dark:bg-white/20 text-slate-900 dark:text-white border-white/80 shadow-sm ring-1 ring-sky-400/30'
                : 'panel text-muted-foreground hover:text-foreground opacity-75 hover:opacity-100 border-border/40'
            )}
          >
            <Zap className="size-4 text-pivot shrink-0" />
            <span className="truncate">RSVP & Bilim</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={cn(
              'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer border',
              activeTab === 'features'
                ? theme === 'linear'
                  ? 'bg-purple-950/70 text-purple-200 border-purple-400/80 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                  : theme === 'kindle'
                  ? 'bg-[#ede3cf] dark:bg-[#3d3326] text-[#3d2f21] dark:text-[#f3ede1] border-[#b8a783]'
                  : 'bg-white/90 dark:bg-white/20 text-slate-900 dark:text-white border-white/80 shadow-sm ring-1 ring-sky-400/30'
                : 'panel text-muted-foreground hover:text-foreground opacity-75 hover:opacity-100 border-border/40'
            )}
          >
            <Sparkles className="size-4 text-sky-500 shrink-0" />
            <span className="truncate">Özellikler</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('controls')}
            className={cn(
              'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer border',
              activeTab === 'controls'
                ? theme === 'linear'
                  ? 'bg-purple-950/70 text-purple-200 border-purple-400/80 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                  : theme === 'kindle'
                  ? 'bg-[#ede3cf] dark:bg-[#3d3326] text-[#3d2f21] dark:text-[#f3ede1] border-[#b8a783]'
                  : 'bg-white/90 dark:bg-white/20 text-slate-900 dark:text-white border-white/80 shadow-sm ring-1 ring-sky-400/30'
                : 'panel text-muted-foreground hover:text-foreground opacity-75 hover:opacity-100 border-border/40'
            )}
          >
            <Keyboard className="size-4 text-purple-500 shrink-0" />
            <span className="truncate">Kullanım & Tuşlar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('colophon')}
            className={cn(
              'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer border',
              activeTab === 'colophon'
                ? theme === 'linear'
                  ? 'bg-purple-950/70 text-purple-200 border-purple-400/80 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                  : theme === 'kindle'
                  ? 'bg-[#ede3cf] dark:bg-[#3d3326] text-[#3d2f21] dark:text-[#f3ede1] border-[#b8a783]'
                  : 'bg-white/90 dark:bg-white/20 text-slate-900 dark:text-white border-white/80 shadow-sm ring-1 ring-sky-400/30'
                : 'panel text-muted-foreground hover:text-foreground opacity-75 hover:opacity-100 border-border/40'
            )}
          >
            <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
            <span className="truncate">Künye & Hikâye</span>
          </button>
        </div>

        {/* Sekme İçerikleri */}
        <div className="text-sm leading-relaxed min-h-[300px]">
          {/* 1. RSVP & Bilim */}
          {activeTab === 'rsvp' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-300">
              <div className="panel p-4 sm:p-5 rounded-2xl border border-border/50">
                <div className="flex items-center gap-2.5 font-semibold text-foreground mb-2">
                  <Eye className="size-4.5 text-pivot shrink-0" />
                  <h4 className="text-base">Sakkad ve Regresyon Hareketlerini Sıfırlama</h4>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                  Geleneksel okumada insan gözü satır üzerinde düz bir hat izlemez; her kelimede mikro sıçramalar (<strong>sakkad</strong>) yapar ve istemsiz geriye dönüşlerle (<strong>regresyon</strong>) duraksar. Göz kaslarının bu yorucu mekanik hareketi, toplam okuma sürenizin <strong>%70 ila %80&apos;ini</strong> sessizce tüketir. Odak, kelimeleri doğrudan gözünüzün odaklandığı sabit noktaya taşıyarak göz kası yorgunluğunu sıfıra indirir.
                </p>
              </div>

              <div className="panel p-4 sm:p-5 rounded-2xl border border-border/50">
                <div className="flex items-center gap-2.5 font-semibold text-foreground mb-2">
                  <div className="size-2.5 rounded-full bg-pivot pivot-glow shrink-0" />
                  <h4 className="text-base">ORP (Optimal Tanıma Noktası) & Kırmızı Lazer</h4>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                  Bilişsel psikoloji araştırmaları, beynin bir kelimeyi ilk harfinden itibaren heceleyerek değil; kelimenin ağırlık merkezindeki en karakteristik harfe (genellikle kelimenin 1/3&apos;lük sol-orta noktası) kilitlenerek tanıdığını kanıtlamıştır. Platformdaki <strong>kırmızı dikey nirengi çizgisi</strong>, her kelimenin ORP harfini piksel hassasiyetiyle aynı dikey eksene hizalar. Gözünüz sabit kalır, algılama eşiği minimuma iner.
                </p>
              </div>

              <div className="panel p-4 sm:p-5 rounded-2xl border border-border/50">
                <div className="flex items-center gap-2.5 font-semibold text-foreground mb-2">
                  <Zap className="size-4.5 text-amber-500 shrink-0" />
                  <h4 className="text-base">İç Seslendirme (Subvocalization) Bariyerini Aşma</h4>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                  Pek çok okur, okurken kelimeleri zihninde fısıldar. Bu alışkanlık okuma hızınızı konuşma sınırına (dakikada ~200-250 kelime) kilitler. RSVP ile hızınızı kademeli olarak 400-600 WPM seviyesine çıkardığınızda, iç ses susar; zihniniz doğrudan görsel kavramaya geçer ve düşünce hızınızla okuma hızınız eşitlenir.
                </p>
              </div>
            </div>
          )}

          {/* 2. Derin Özellikler */}
          {activeTab === 'features' && (
            <div className="flex flex-col gap-3.5 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="panel p-4 rounded-2xl border border-border/50">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 mb-1.5 text-sm sm:text-base">
                    <Bookmark className="size-4 text-amber-500 shrink-0" />
                    Bölüm & Başlık Algılama
                  </h4>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    PDF, EPUB veya metinlerdeki tüm bölüm başlıklarını, Roma rakamlarını ve hiyerarşik başlıkları akıllı regex motoruyla otomatik tespit eder.
                  </p>
                </div>

                <div className="panel p-4 rounded-2xl border border-border/50">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 mb-1.5 text-sm sm:text-base">
                    <Compass className="size-4 text-sky-500 shrink-0" />
                    İlerleme Çubuğunda Başlık İmleri
                  </h4>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Alt ilerleme çubuğunda (scrubber) her bölümün konumunda özel dikey imler bulunur. Tıklayarak veya <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Shift+←/→</kbd> ile bölümler arasında sıçrayabilirsiniz.
                  </p>
                </div>

                <div className="panel p-4 rounded-2xl border border-border/50">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 mb-1.5 text-sm sm:text-base">
                    <RotateCcw className="size-4 text-emerald-500 shrink-0" />
                    Akıllı Cümle Başı & Context Peek
                  </h4>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Duraklatıldığında okunan cümlenin bağlamını (peek) sunar; geri sarma tuşuna basıldığında kelime kelime değil, akıllıca doğrudan cümlenin başına döner.
                  </p>
                </div>

                <div className="panel p-4 rounded-2xl border border-border/50">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 mb-1.5 text-sm sm:text-base">
                    <Layers className="size-4 text-purple-500 shrink-0" />
                    Kelime Bloklama (Chunking - &apos;C&apos;)
                  </h4>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    İleri düzey okuma için kelimeleri 1&apos;li, 2&apos;li, 3&apos;lü veya 4&apos;lü bloklar halinde akıtma imkanı. Tek tuşla (<kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">C</kbd>) blok boyutunu değiştirebilirsiniz.
                  </p>
                </div>

                <div className="panel p-4 rounded-2xl border border-border/50">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 mb-1.5 text-sm sm:text-base">
                    <MousePointer className="size-4 text-cyan-500 shrink-0" />
                    Çift Yönlü 25 WPM Hassas Scroll
                  </h4>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Farenin tekerleğiyle gerek masaüstü modunda gerekse okuma akışı devam ederken ritmi hiç bozmadan 25&apos;er kelimelik hassas hız kontrolü.
                  </p>
                </div>

                <div className="panel p-4 rounded-2xl border border-border/50">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 mb-1.5 text-sm sm:text-base">
                    <Sparkles className="size-4 text-pink-500 shrink-0" />
                    Ritmik Nefes Alma Algoritması
                  </h4>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Nokta, soru işareti, iki nokta, virgül ve uzun teknik kelimelerde doğal mikro-duraklamalar eklenerek okuma akışının edebi ritmi korunur.
                  </p>
                </div>
              </div>

              <div className="panel p-3.5 rounded-2xl border border-border/50 flex items-center gap-3">
                <FileText className="size-5 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong>Akıllı Metin Temizleme:</strong> Satır sonlarında kesilen kelimeleri (<span className="font-mono">ör- / nek → örnek</span>) otomatik birleştirir, sayfa numaralarını ve başlık artıklarını arındırır, dipnotları isteğe göre akışa katar.
                </p>
              </div>
            </div>
          )}

          {/* 3. Kullanım & Tuşlar (Masaüstü ve Mobil Ayrıntılı) */}
          {activeTab === 'controls' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-300">
              {/* Masaüstü Klavye ve Fare */}
              <div className="panel p-4 sm:p-5 rounded-2xl border border-border/50">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <Keyboard className="size-4.5 text-purple-500" />
                  Masaüstü: Klavye ve Fare Kısayolları
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                    <span className="text-muted-foreground">Başlat / Duraklat</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/60 text-xs font-mono font-semibold">Boşluk (Space)</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                    <span className="text-muted-foreground">Hız Kontrolü (±25 WPM)</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/60 text-xs font-mono font-semibold">↑ / ↓ veya Scroll</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                    <span className="text-muted-foreground">Akıllı Cümle Başına Sar</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/60 text-xs font-mono font-semibold">← (Sol Ok)</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                    <span className="text-muted-foreground">Önceki Başlığa / Bölüme Atla</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/60 text-xs font-mono font-semibold">Shift + ←</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                    <span className="text-muted-foreground">1 Kelime İleri Sar</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/60 text-xs font-mono font-semibold">→ (Sağ Ok)</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                    <span className="text-muted-foreground">Sonraki Başlığa / Bölüme Atla</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/60 text-xs font-mono font-semibold">Shift + →</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                    <span className="text-muted-foreground">Kelime Bloklama (1, 2, 3, 4)</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/60 text-xs font-mono font-semibold">C Tuşu</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                    <span className="text-muted-foreground">Temaları Değiştir (Cam, Neon, Kağıt)</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/60 text-xs font-mono font-semibold">1, 2, 3 Tuşları</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Maximize className="size-3.5 text-muted-foreground" />
                      Tam Ekran Modu
                    </span>
                    <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/60 text-xs font-mono font-semibold">F Tuşu</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                    <span className="text-muted-foreground">Durdur / Pencereleri Kapat</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/60 text-xs font-mono font-semibold">ESC Tuşu</kbd>
                  </div>
                </div>
              </div>

              {/* Mobil ve Tablet Dokunmatik Kullanım Rehberi */}
              <div className="panel p-4 sm:p-5 rounded-2xl border border-border/50">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <Smartphone className="size-4.5 text-sky-500" />
                  Mobil ve Tablet: Dokunmatik Ekran Kullanımı
                </h4>
                <div className="flex flex-col gap-2.5 text-xs sm:text-sm">
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                    <div className="font-semibold text-foreground flex items-center gap-2 mb-1">
                      <Touchpad className="size-4 text-emerald-500" />
                      3 Görünmez Dokunma Bölgesi (Tap Zones)
                    </div>
                    <ul className="text-muted-foreground text-xs space-y-1 pl-4 list-disc">
                      <li><strong>Ekranın Sol %25&apos;i:</strong> Cümlenin başına geri sarar.</li>
                      <li><strong>Ekranın Orta %50&apos;si:</strong> Okumayı anında başlatır veya duraklatır.</li>
                      <li><strong>Ekranın Sağ %25&apos;i:</strong> 1 kelime ileri atlar.</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                    <div className="font-semibold text-foreground flex items-center gap-2 mb-1">
                      <Zap className="size-4 text-amber-500" />
                      Dikey Kaydırma (Vertical Swipe) Hız Ayarı
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Okuma alanı üzerinde parmağınızı <strong>yukarı kaydırdığınızda</strong> hızınız 25&apos;er kelime artar, <strong>aşağı kaydırdığınızda</strong> azalır. Sayfanın yanlışlıkla yenilenmesini önleyen özel dokunmatik kilit mekanizması bulunur.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Künye & Geliştirici Hikâyesi */}
          {activeTab === 'colophon' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-300">
              <div className="panel p-5 sm:p-6 rounded-2xl border border-border/50 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-border/40 pb-3">
                  <div>
                    <h4 className="font-bold text-base text-foreground">Alper BEYAZ</h4>
                    <p className="text-xs text-muted-foreground">1 Kasım 2016 • Marmaris</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium w-fit">
                    Kişisel Tasarım & Geliştirme Notu
                  </span>
                </div>

                <div className="text-xs sm:text-sm text-foreground/90 space-y-3 leading-relaxed">
                  <p>
                    <em>&ldquo;Bu platformu, aktif üyesi olduğum kitap kulübümde kişisel okuma hızımı, anlama kapasitemi ve dikkat odaklanma süremi geliştirmek amacıyla tasarladım.</em>
                  </p>
                  <p>
                    <em>İnternette mevcut hızlı okuma araçlarını ve RSVP sitelerini uzun süre incelediğimde; çoğunun kullanıcı dostu olmaktan uzak, arayüz olarak hantal, gözü yoran reklamlarla dolu ya da Türkçe dilinin hece, ek ve kök yapısına uygunsuz olduğunu gördüm.</em>
                  </p>
                  <p>
                    <em>Bu arayış sonucunda; zihni hiçbir gereksiz unsurla meşgul etmeyen, göz kaslarının fiziksel sıçrama eforunu sıfırlayan, Türkçenin hece ritmine uyumlu ORP (Optimal Tanıma Noktası) dengesine sahip ve estetik açıdan kusursuz bir okuma vahası inşa etmeye karar verdim.</em>
                  </p>
                  <p>
                    <em>Odak; sayfalar dolusu düşünceye, zamandan bağımsız olarak en duru haliyle odaklanma sanatıdır.&rdquo;</em>
                  </p>
                </div>
              </div>

              <div className="panel p-4 rounded-2xl border border-border/50">
                <div className="flex items-center gap-2 font-semibold text-foreground mb-1.5 text-xs sm:text-sm">
                  <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                  <h4>%100 Cihaz İçi Gizlilik (Yerel Bellek)</h4>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Yüklediğiniz kitaplar, özel PDF&apos;ler veya çalışma notlarınız <strong>kesinlikle hiçbir sunucuya iletilmez</strong>. Tüm ayrıştırma, indeksleme ve RSVP akışı doğrudan cihazınızın tarayıcı belleğinde (in-memory) gerçekleşir. İnternetiniz kapalıyken bile tam performans çalışır.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground px-1 gap-1">
                <span>Mimari: Next.js • React • Tailwind CSS • Web Streams • PDF.js</span>
                <span>PWA • Masaüstü, Android ve iPad Uyumlu</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
