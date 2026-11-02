'use client'

import {
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
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { THEMES, type ThemeId } from '@/lib/rsvp'
import logoVectorDarkCard from '@/assets/logos/odak-vector-dark-card.png'
import logoVectorLightCard from '@/assets/logos/odak-vector-light-card.png'

type AboutModalProps = {
  open: boolean
  onClose: () => void
  theme: ThemeId
}

// Temaya Duyarlı Vektörel odak Rozeti (media_1793569995184_395e3cd8.jpg referansı - biçimi 1:1 korunmuştur)
function OdakModalLogo({ theme }: { theme: ThemeId }) {
  const isNeon = theme === 'linear'

  if (isNeon) {
    // 2. NEON TEMASI: Siyah fonlu vektörel logo (KOYU ZEMİN)
    return (
      <div className="relative shrink-0 w-24 sm:w-28 h-16 sm:h-18 rounded-2xl bg-[#1d1d1d] border border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.35)] p-1.5 flex items-center justify-center select-none transition-transform hover:scale-105 overflow-hidden">
        <Image
          src={logoVectorDarkCard}
          alt="odak Koyu Zemin Vektörel Logo"
          width={112}
          height={72}
          priority
          className="w-full h-full object-contain pointer-events-none select-none"
        />
      </div>
    )
  }

  // 1. CAM & 3. KAĞIT TEMASI: Beyaz fonlu vektörel logo (AÇIK ZEMİN) - fondan ayrıştırılmış rozet kartı
  return (
    <div
      className={cn(
        'relative shrink-0 w-24 sm:w-28 h-16 sm:h-18 rounded-2xl bg-[#f4f4f4] p-1.5 flex items-center justify-center select-none transition-transform hover:scale-105 overflow-hidden',
        theme === 'ios'
          ? 'border border-white/90 dark:border-white/30 shadow-[0_4px_16px_rgba(56,189,248,0.25)]'
          : 'border border-[#cfbe96] dark:border-[#524433] shadow-[0_2px_8px_rgba(0,0,0,0.12)]'
      )}
    >
      <Image
        src={logoVectorLightCard}
        alt="odak Açık Zemin Vektörel Logo"
        width={112}
        height={72}
        priority
        className="w-full h-full object-contain pointer-events-none select-none"
      />
    </div>
  )
}

const TABS = [
  { id: 'rsvp', label: 'RSVP & Bilim', icon: Zap, color: 'text-pivot' },
  { id: 'features', label: 'Özellikler', icon: Sparkles, color: 'text-sky-500' },
  { id: 'controls', label: 'Kullanım & Tuşlar', icon: Keyboard, color: 'text-purple-500' },
  { id: 'colophon', label: 'Künye & Hikâye', icon: ShieldCheck, color: 'text-emerald-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function AboutModal({ open, onClose, theme }: AboutModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('rsvp')

  const activeTabIndex = TABS.findIndex((t) => t.id === activeTab)

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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={cn(
          'panel relative w-full max-w-2xl rounded-3xl p-5 sm:p-7 shadow-2xl',
          'flex flex-col gap-4.5 border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] animate-in zoom-in-95',
          theme === 'linear' && 'border-purple-500/40 shadow-[0_0_40px_rgba(168,85,247,0.3)] bg-[#07060b]/95 text-slate-100',
          theme === 'kindle' && 'border-[#cfbe96] shadow-[0_8px_30px_rgba(0,0,0,0.15)] bg-[#fcf8ee] text-[#22180e]',
          theme === 'ios' && 'border-white/90 dark:border-white/25 shadow-[0_16px_50px_rgba(56,189,248,0.25)] bg-white/85 dark:bg-slate-900/85 backdrop-blur-3xl text-slate-900 dark:text-slate-100'
        )}
      >
        {/* Kapat Butonu */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 size-9 rounded-full panel grid place-items-center text-muted-foreground hover:text-foreground transition-all hover:scale-105 active:scale-95 cursor-pointer z-30"
          aria-label="Kapat"
        >
          <X className="size-4.5" />
        </button>

        {/* Üst Alan: Sol Tarafta Temaya Özel Vektör Logo Rozeti, Sağında Başlık & Açıklama */}
        <div className="flex flex-row items-center gap-3.5 sm:gap-4.5 pb-1">
          <OdakModalLogo theme={theme} />

          <div className="flex flex-col min-w-0 pr-8">
            <h2 id="about-modal-title" className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-foreground">odak</span>
              <span className={cn(
                'font-black',
                theme === 'ios' && 'text-sky-500',
                theme === 'linear' && 'text-purple-400',
                theme === 'kindle' && 'text-[#b44c43]'
              )}>•</span>
              <span className={cn(
                'font-bold',
                theme === 'ios' && 'bg-gradient-to-r from-sky-600 to-indigo-600 dark:from-sky-400 dark:to-cyan-300 bg-clip-text text-transparent',
                theme === 'linear' && 'text-purple-200',
                theme === 'kindle' && 'text-[#3c2a18] dark:text-[#f2ebe0]'
              )}>
                Bilimsel Hızlı Okuma
              </span>
            </h2>
            <p className={cn(
              'text-xs sm:text-sm mt-1 leading-snug font-medium',
              theme === 'ios' ? 'text-slate-600 dark:text-slate-300' : 'text-foreground/85 dark:text-foreground/80'
            )}>
              Göz kaslarının mekanik yorgunluğunu sıfırlayan, zihnin anlama hızını katlayan yeni nesil RSVP platformu.
            </p>
          </div>
        </div>

        {/* Entegre Dinamik Kompakt Sekme Çubuğu (Aktif sekme tam başlıkla açılır, diğerleri '...' noktası şeklinde kalır) */}
        <div className="flex items-center justify-between gap-1.5 p-1 rounded-2xl bg-foreground/5 border border-border/60 select-none pt-1">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center justify-center transition-all duration-300 cursor-pointer outline-none rounded-xl h-9.5',
                  isActive
                    ? 'flex-1 gap-2 px-3.5 bg-background text-foreground shadow-sm font-bold border border-border/80'
                    : 'size-9 text-muted-foreground hover:text-foreground hover:bg-foreground/10'
                )}
                title={tab.label}
                aria-label={tab.label}
              >
                {isActive ? (
                  <>
                    <Icon className={cn('size-4 shrink-0', tab.color)} />
                    <span className="text-xs sm:text-sm font-bold truncate">{tab.label}</span>
                  </>
                ) : (
                  <span className="size-2 rounded-full bg-foreground/35 hover:bg-foreground/75 transition-all" />
                )}
              </button>
            )
          })}
        </div>

        {/* Sekmeler Arası Yatay Scroll / Slider Alanı */}
        <div className="relative w-full overflow-hidden rounded-2xl">
          <div
            className="flex w-[400%] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ transform: `translateX(-${activeTabIndex * 25}%)` }}
          >
            {/* 1. SLIDE: RSVP & Bilim */}
            <div className="w-1/4 max-h-[50vh] sm:max-h-[52vh] overflow-y-auto theme-scrollbar px-1 text-sm leading-relaxed">
              <div className="flex flex-col gap-3.5">
                <div className={cn(
                  'p-4 sm:p-5 rounded-2xl border shadow-sm',
                  theme === 'ios' && 'bg-white/85 dark:bg-slate-900/85 border-sky-200/80 dark:border-sky-500/25 text-slate-900 dark:text-slate-100 shadow-sm backdrop-blur-md',
                  theme === 'linear' && 'bg-[#0e0c16] border-purple-500/40 text-slate-100',
                  theme === 'kindle' && 'bg-[#fbf5e5] dark:bg-[#2b2319] border-[#cbba92] text-[#2c2014] dark:text-[#f2ebe0]'
                )}>
                  <div className="flex items-center gap-2.5 font-bold mb-2 text-base text-foreground">
                    <Eye className="size-4.5 text-pivot shrink-0" />
                    <h4>Sakkad ve Regresyon Hareketlerini Sıfırlama</h4>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-foreground/90 font-normal">
                    Geleneksel okumada insan gözü satır üzerinde düz bir hat izlemez; her kelimede mikro sıçramalar (<strong>sakkad</strong>) yapar ve istemsiz geriye dönüşlerle (<strong>regresyon</strong>) duraksar. Göz kaslarının bu yorucu mekanik hareketi, toplam okuma sürenizin <strong>%70 ila %80&apos;ini</strong> sessizce tüketir. odak, kelimeleri doğrudan gözünüzün odaklandığı sabit noktaya taşıyarak göz kası yorgunluğunu sıfıra indirir.
                  </p>
                </div>

                <div className={cn(
                  'p-4 sm:p-5 rounded-2xl border shadow-sm',
                  theme === 'ios' && 'bg-white/85 dark:bg-slate-900/85 border-sky-200/80 dark:border-sky-500/25 text-slate-900 dark:text-slate-100 shadow-sm backdrop-blur-md',
                  theme === 'linear' && 'bg-[#0e0c16] border-purple-500/40 text-slate-100',
                  theme === 'kindle' && 'bg-[#fbf5e5] dark:bg-[#2b2319] border-[#cbba92] text-[#2c2014] dark:text-[#f2ebe0]'
                )}>
                  <div className="flex items-center gap-2.5 font-bold mb-2 text-base text-foreground">
                    <div className="size-2.5 rounded-full bg-pivot pivot-glow shrink-0" />
                    <h4>ORP (Optimal Tanıma Noktası) & Kırmızı Lazer</h4>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-foreground/90 font-normal">
                    Bilişsel psikoloji araştırmaları, beynin bir kelimeyi ilk harfinden itibaren heceleyerek değil; kelimenin ağırlık merkezindeki en karakteristik harfe (genellikle kelimenin 1/3&apos;lük sol-orta noktası) kilitlenerek tanıdığını kanıtlamıştır. Platformdaki <strong>kırmızı dikey nirengi çizgisi</strong>, her kelimenin ORP harfini piksel hassasiyetiyle aynı dikey eksene hizalar. Gözünüz sabit kalır, algılama eşiği minimuma iner.
                  </p>
                </div>

                <div className={cn(
                  'p-4 sm:p-5 rounded-2xl border shadow-sm',
                  theme === 'ios' && 'bg-white/85 dark:bg-slate-900/85 border-sky-200/80 dark:border-sky-500/25 text-slate-900 dark:text-slate-100 shadow-sm backdrop-blur-md',
                  theme === 'linear' && 'bg-[#0e0c16] border-purple-500/40 text-slate-100',
                  theme === 'kindle' && 'bg-[#fbf5e5] dark:bg-[#2b2319] border-[#cbba92] text-[#2c2014] dark:text-[#f2ebe0]'
                )}>
                  <div className="flex items-center gap-2.5 font-bold mb-2 text-base text-foreground">
                    <Zap className="size-4.5 text-amber-500 shrink-0" />
                    <h4>İç Seslendirme (Subvocalization) Bariyerini Aşma</h4>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-foreground/90 font-normal">
                    Pek çok okur, okurken kelimeleri zihninde fısıldar. Bu alışkanlık okuma hızınızı konuşma sınırına (dakikada ~200-250 kelime) kilitler. RSVP ile hızınızı kademeli olarak 400-600 WPM seviyesine çıkardığınızda, iç ses susar; zihniniz doğrudan görsel kavramaya geçer ve düşünce hızınızla okuma hızınız eşitlenir.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. SLIDE: Özellikler */}
            <div className="w-1/4 max-h-[50vh] sm:max-h-[52vh] overflow-y-auto theme-scrollbar px-1 text-sm leading-relaxed">
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className={cn(
                    'p-4 rounded-2xl border shadow-sm',
                    theme === 'ios' && 'bg-white/85 dark:bg-slate-900/85 border-sky-200/80 dark:border-sky-500/25 text-slate-900 dark:text-slate-100 shadow-sm backdrop-blur-md',
                    theme === 'linear' && 'bg-[#0e0c16] border-purple-500/40 text-slate-100',
                    theme === 'kindle' && 'bg-[#fbf5e5] dark:bg-[#2b2319] border-[#cbba92] text-[#2c2014] dark:text-[#f2ebe0]'
                  )}>
                    <h4 className="font-bold text-foreground flex items-center gap-2 mb-1.5 text-sm sm:text-base">
                      <Bookmark className="size-4 text-amber-500 shrink-0" />
                      Bölüm & Başlık Algılama
                    </h4>
                    <p className="text-xs leading-relaxed text-foreground/85">
                      PDF, EPUB veya metinlerdeki tüm bölüm başlıklarını, Roma rakamlarını ve hiyerarşik başlıkları akıllı regex motoruyla otomatik tespit eder.
                    </p>
                  </div>

                  <div className={cn(
                    'p-4 rounded-2xl border shadow-sm',
                    theme === 'ios' && 'bg-white/85 dark:bg-slate-900/85 border-sky-200/80 dark:border-sky-500/25 text-slate-900 dark:text-slate-100 shadow-sm backdrop-blur-md',
                    theme === 'linear' && 'bg-[#0e0c16] border-purple-500/40 text-slate-100',
                    theme === 'kindle' && 'bg-[#fbf5e5] dark:bg-[#2b2319] border-[#cbba92] text-[#2c2014] dark:text-[#f2ebe0]'
                  )}>
                    <h4 className="font-bold text-foreground flex items-center gap-2 mb-1.5 text-sm sm:text-base">
                      <Compass className="size-4 text-sky-500 shrink-0" />
                      İlerleme Çubuğunda Başlık İmleri
                    </h4>
                    <p className="text-xs leading-relaxed text-foreground/85">
                      Alt ilerleme çubuğunda (scrubber) her bölümün konumunda özel dikey imler bulunur. Tıklayarak veya <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Shift+←/→</kbd> ile bölümler arasında sıçrayabilirsiniz.
                    </p>
                  </div>

                  <div className={cn(
                    'p-4 rounded-2xl border shadow-sm',
                    theme === 'ios' && 'bg-white/85 dark:bg-slate-900/85 border-sky-200/80 dark:border-sky-500/25 text-slate-900 dark:text-slate-100 shadow-sm backdrop-blur-md',
                    theme === 'linear' && 'bg-[#0e0c16] border-purple-500/40 text-slate-100',
                    theme === 'kindle' && 'bg-[#fbf5e5] dark:bg-[#2b2319] border-[#cbba92] text-[#2c2014] dark:text-[#f2ebe0]'
                  )}>
                    <h4 className="font-bold text-foreground flex items-center gap-2 mb-1.5 text-sm sm:text-base">
                      <RotateCcw className="size-4 text-emerald-500 shrink-0" />
                      Akıllı Cümle Başı & Context Peek
                    </h4>
                    <p className="text-xs leading-relaxed text-foreground/85">
                      Duraklatıldığında okunan cümlenin bağlamını (peek) sunar; geri sarma tuşuna basıldığında kelime kelime değil, akıllıca doğrudan cümlenin başına döner.
                    </p>
                  </div>

                  <div className={cn(
                    'p-4 rounded-2xl border shadow-sm',
                    theme === 'ios' && 'bg-white/85 dark:bg-slate-900/85 border-sky-200/80 dark:border-sky-500/25 text-slate-900 dark:text-slate-100 shadow-sm backdrop-blur-md',
                    theme === 'linear' && 'bg-[#0e0c16] border-purple-500/40 text-slate-100',
                    theme === 'kindle' && 'bg-[#fbf5e5] dark:bg-[#2b2319] border-[#cbba92] text-[#2c2014] dark:text-[#f2ebe0]'
                  )}>
                    <h4 className="font-bold text-foreground flex items-center gap-2 mb-1.5 text-sm sm:text-base">
                      <Layers className="size-4 text-purple-500 shrink-0" />
                      Kelime Bloklama (Chunking - &apos;C&apos;)
                    </h4>
                    <p className="text-xs leading-relaxed text-foreground/85">
                      İleri düzey okuma için kelimeleri 1&apos;li, 2&apos;li, 3&apos;lü veya 4&apos;lü bloklar halinde akıtma imkanı. Tek tuşla (<kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">C</kbd>) blok boyutunu değiştirebilirsiniz.
                    </p>
                  </div>

                  <div className={cn(
                    'p-4 rounded-2xl border shadow-sm',
                    theme === 'ios' && 'bg-white/85 dark:bg-slate-900/85 border-sky-200/80 dark:border-sky-500/25 text-slate-900 dark:text-slate-100 shadow-sm backdrop-blur-md',
                    theme === 'linear' && 'bg-[#0e0c16] border-purple-500/40 text-slate-100',
                    theme === 'kindle' && 'bg-[#fbf5e5] dark:bg-[#2b2319] border-[#cbba92] text-[#2c2014] dark:text-[#f2ebe0]'
                  )}>
                    <h4 className="font-bold text-foreground flex items-center gap-2 mb-1.5 text-sm sm:text-base">
                      <MousePointer className="size-4 text-cyan-500 shrink-0" />
                      Çift Yönlü 25 WPM Hassas Scroll
                    </h4>
                    <p className="text-xs leading-relaxed text-foreground/85">
                      Farenin tekerleğiyle gerek masaüstü modunda gerekse okuma akışı devam ederken ritmi hiç bozmadan 25&apos;er kelimelik hassas hız kontrolü.
                    </p>
                  </div>

                  <div className={cn(
                    'p-4 rounded-2xl border shadow-sm',
                    theme === 'ios' && 'bg-white/85 dark:bg-slate-900/85 border-sky-200/80 dark:border-sky-500/25 text-slate-900 dark:text-slate-100 shadow-sm backdrop-blur-md',
                    theme === 'linear' && 'bg-[#0e0c16] border-purple-500/40 text-slate-100',
                    theme === 'kindle' && 'bg-[#fbf5e5] dark:bg-[#2b2319] border-[#cbba92] text-[#2c2014] dark:text-[#f2ebe0]'
                  )}>
                    <h4 className="font-bold text-foreground flex items-center gap-2 mb-1.5 text-sm sm:text-base">
                      <Sparkles className="size-4 text-pink-500 shrink-0" />
                      Ritmik Nefes Alma Algoritması
                    </h4>
                    <p className="text-xs leading-relaxed text-foreground/85">
                      Nokta, soru işareti, iki nokta, virgül ve uzun teknik kelimelerde doğal mikro-duraklamalar eklenerek okuma akışının edebi ritmi korunur.
                    </p>
                  </div>
                </div>

                <div className={cn(
                  'p-3.5 rounded-2xl border flex items-center gap-3',
                  theme === 'ios' && 'bg-white/85 dark:bg-slate-900/85 border-sky-200/80 dark:border-sky-500/25 shadow-sm backdrop-blur-md',
                  theme === 'linear' && 'bg-[#0e0c16] border-purple-500/40',
                  theme === 'kindle' && 'bg-[#fbf5e5] dark:bg-[#2b2319] border-[#cbba92]'
                )}>
                  <FileText className="size-5 text-muted-foreground shrink-0" />
                  <p className="text-xs text-foreground/90 leading-relaxed font-normal">
                    <strong>Akıllı Metin Temizleme:</strong> Satır sonlarında kesilen kelimeleri (<span className="font-mono">ör- / nek → örnek</span>) otomatik birleştirir, sayfa numaralarını ve başlık artıklarını arındırır, dipnotları isteğe göre akışa katar.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. SLIDE: Kullanım & Tuşlar */}
            <div className="w-1/4 max-h-[50vh] sm:max-h-[52vh] overflow-y-auto theme-scrollbar px-1 text-sm leading-relaxed">
              <div className="flex flex-col gap-3.5">
                {/* Masaüstü Klavye ve Fare */}
                <div className={cn(
                  'p-4 sm:p-5 rounded-2xl border shadow-sm',
                  theme === 'ios' && 'bg-white/85 dark:bg-slate-900/85 border-sky-200/80 dark:border-sky-500/25 text-slate-900 dark:text-slate-100 shadow-sm backdrop-blur-md',
                  theme === 'linear' && 'bg-[#0e0c16] border-purple-500/40 text-slate-100',
                  theme === 'kindle' && 'bg-[#fbf5e5] dark:bg-[#2b2319] border-[#cbba92] text-[#2c2014] dark:text-[#f2ebe0]'
                )}>
                  <h4 className="font-bold text-foreground mb-3 flex items-center gap-2 text-sm sm:text-base">
                    <Keyboard className="size-4.5 text-purple-500" />
                    Masaüstü: Klavye ve Fare Kısayolları
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                      <span className="text-foreground/90 font-medium">Başlat / Duraklat</span>
                      <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/80 text-xs font-mono font-semibold">Boşluk (Space)</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                      <span className="text-foreground/90 font-medium">Hız Kontrolü (±25 WPM)</span>
                      <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/80 text-xs font-mono font-semibold">↑ / ↓ veya Scroll</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                      <span className="text-foreground/90 font-medium">Akıllı Cümle Başına Sar</span>
                      <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/80 text-xs font-mono font-semibold">← (Sol Ok)</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                      <span className="text-foreground/90 font-medium">Önceki Başlığa / Bölüme Atla</span>
                      <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/80 text-xs font-mono font-semibold">Shift + ←</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                      <span className="text-foreground/90 font-medium">1 Kelime İleri Sar</span>
                      <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/80 text-xs font-mono font-semibold">→ (Sağ Ok)</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                      <span className="text-foreground/90 font-medium">Sonraki Başlığa / Bölüme Atla</span>
                      <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/80 text-xs font-mono font-semibold">Shift + →</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                      <span className="text-foreground/90 font-medium">Kelime Bloklama (1, 2, 3, 4)</span>
                      <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/80 text-xs font-mono font-semibold">C Tuşu</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                      <span className="text-foreground/90 font-medium">Temaları Değiştir</span>
                      <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/80 text-xs font-mono font-semibold">1, 2, 3 Tuşları</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                      <span className="text-foreground/90 font-medium flex items-center gap-1.5">
                        <Maximize className="size-3.5 text-muted-foreground" />
                        Tam Ekran Modu
                      </span>
                      <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/80 text-xs font-mono font-semibold">F Tuşu</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                      <span className="text-foreground/90 font-medium">Durdur / Pencereleri Kapat</span>
                      <kbd className="px-2 py-0.5 rounded-md bg-background border border-border/80 text-xs font-mono font-semibold">ESC Tuşu</kbd>
                    </div>
                  </div>
                </div>

                {/* Mobil ve Tablet Dokunmatik Kullanım Rehberi */}
                <div className={cn(
                  'p-4 sm:p-5 rounded-2xl border shadow-sm',
                  theme === 'ios' && 'bg-white/85 dark:bg-slate-900/85 border-sky-200/80 dark:border-sky-500/25 text-slate-900 dark:text-slate-100 shadow-sm backdrop-blur-md',
                  theme === 'linear' && 'bg-[#0e0c16] border-purple-500/40 text-slate-100',
                  theme === 'kindle' && 'bg-[#fbf5e5] dark:bg-[#2b2319] border-[#cbba92] text-[#2c2014] dark:text-[#f2ebe0]'
                )}>
                  <h4 className="font-bold text-foreground mb-3 flex items-center gap-2 text-sm sm:text-base">
                    <Smartphone className="size-4.5 text-sky-500" />
                    Mobil ve Tablet: Dokunmatik Ekran Kullanımı
                  </h4>
                  <div className="flex flex-col gap-2.5 text-xs sm:text-sm">
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
                      <div className="font-bold text-foreground flex items-center gap-2 mb-1">
                        <Touchpad className="size-4 text-emerald-500" />
                        3 Görünmez Dokunma Bölgesi (Tap Zones)
                      </div>
                      <ul className="text-foreground/85 text-xs space-y-1 pl-4 list-disc font-normal">
                        <li><strong>Ekranın Sol %25&apos;i:</strong> Cümlenin başına geri sarar.</li>
                        <li><strong>Ekranın Orta %50&apos;si:</strong> Okumayı anında başlatır veya duraklatır.</li>
                        <li><strong>Ekranın Sağ %25&apos;i:</strong> 1 kelime ileri atlar.</li>
                      </ul>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
                      <div className="font-bold text-foreground flex items-center gap-2 mb-1">
                        <Zap className="size-4 text-amber-500" />
                        Dikey Kaydırma (Vertical Swipe) Hız Ayarı
                      </div>
                      <p className="text-foreground/85 text-xs leading-relaxed font-normal">
                        Okuma alanı üzerinde parmağınızı <strong>yukarı kaydırdığınızda</strong> hızınız 25&apos;er kelime artar, <strong>aşağı kaydırdığınızda</strong> azalır. Sayfanın yanlışlıkla yenilenmesini önleyen özel dokunmatik kilit mekanizması bulunur.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. SLIDE: Künye & Geliştirici Hikâyesi */}
            <div className="w-1/4 max-h-[50vh] sm:max-h-[52vh] overflow-y-auto theme-scrollbar px-1 text-sm leading-relaxed">
              <div className="flex flex-col gap-3.5">
                <div className={cn(
                  'p-5 sm:p-6 rounded-2xl border shadow-sm flex flex-col gap-3',
                  theme === 'ios' && 'bg-white/85 dark:bg-slate-900/85 border-sky-200/80 dark:border-sky-500/25 text-slate-900 dark:text-slate-100 shadow-sm backdrop-blur-md',
                  theme === 'linear' && 'bg-[#0e0c16] border-purple-500/40 text-slate-100',
                  theme === 'kindle' && 'bg-[#fbf5e5] dark:bg-[#2b2319] border-[#cbba92] text-[#2c2014] dark:text-[#f2ebe0]'
                )}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-border/60 pb-3">
                    <div>
                      <h4 className="font-bold text-base text-foreground">Alper BEYAZ</h4>
                      <p className="text-xs text-foreground/75 font-medium">1 Kasım 2026 • Marmaris</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold w-fit">
                      Kişisel Tasarım & Geliştirme Notu
                    </span>
                  </div>

                  <div className="text-xs sm:text-sm text-foreground/90 space-y-3 leading-relaxed font-normal">
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
                      <em>odak; sayfalar dolusu düşünceye, zamandan bağımsız olarak en duru haliyle odaklanma sanatıdır.&rdquo;</em>
                    </p>
                  </div>
                </div>

                <div className={cn(
                  'p-4 rounded-2xl border shadow-sm',
                  theme === 'ios' && 'bg-white/85 dark:bg-slate-900/85 border-sky-200/80 dark:border-sky-500/25 text-slate-900 dark:text-slate-100 shadow-sm backdrop-blur-md',
                  theme === 'linear' && 'bg-[#0e0c16] border-purple-500/40 text-slate-100',
                  theme === 'kindle' && 'bg-[#fbf5e5] dark:bg-[#2b2319] border-[#cbba92] text-[#2c2014] dark:text-[#f2ebe0]'
                )}>
                  <div className="flex items-center gap-2 font-bold text-foreground mb-1.5 text-xs sm:text-sm">
                    <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                    <h4>%100 Cihaz İçi Gizlilik (Yerel Bellek)</h4>
                  </div>
                  <p className="text-foreground/85 text-xs leading-relaxed font-normal">
                    Yüklediğiniz kitaplar, özel PDF&apos;ler veya çalışma notlarınız <strong>kesinlikle hiçbir sunucuya iletilmez</strong>. Tüm ayrıştırma, indeksleme ve RSVP akışı doğrudan cihazınızın tarayıcı belleğinde (in-memory) gerçekleşir. İnternetiniz kapalıyken bile tam performans çalışır.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-foreground/75 px-1 gap-1 font-medium">
                  <span>Mimari: Next.js • React • Tailwind CSS • Web Streams • PDF.js</span>
                  <span>PWA • Masaüstü, Android ve iPad Uyumlu</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
