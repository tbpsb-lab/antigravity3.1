'use client'

import {
  Bookmark,
  CheckCircle2,
  Compass,
  Eye,
  FileText,
  Keyboard,
  Layers,
  Maximize,
  MousePointer,
  RotateCcw,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Touchpad,
  Volume2,
  Waves,
  X,
  Zap,
} from 'lucide-react'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { type ThemeId } from '@/lib/rsvp'
import { useFocusTrap } from '@/lib/use-focus-trap'
import logoVectorDarkCard from '@/assets/logos/odak-vector-dark-card.png'
import logoVectorLightCard from '@/assets/logos/odak-vector-light-card.png'
import {
  APP_METADATA,
  GUIDE_FEATURES,
  GUIDE_SCIENCE,
  GUIDE_SHORTCUTS,
  GUIDE_TOUCH_CONTROLS,
  type GuideFeatureItem,
  type GuideShortcutItem,
} from '@/components/reader/about-guide-data'

type AboutModalProps = {
  open: boolean
  onClose: () => void
  theme: ThemeId
  onThemeChange?: (theme: ThemeId) => void
}

/**
 * Klavye Kısayolları ve Rozetler İçin Yüksek Kontrastlı Kbd Bileşeni
 * Tüm temalarda (Cam/iOS, Neon/Linear, Kağıt/Kindle) ve hem açık hem koyu modda
 * daima yüksek kontrastlı ve kristal netliğinde okunabilir metin sağlar.
 */
export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center font-mono font-bold select-none text-center',
        'px-2 py-0.5 rounded-lg text-xs leading-none border transition-colors',
        'bg-foreground/10 text-foreground border-foreground/25 shadow-2xs hover:bg-foreground/15',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

function OdakModalLogo({ theme }: { theme: ThemeId }) {
  const isNeon = theme === 'linear'

  if (isNeon) {
    return (
      <div className="relative shrink-0 w-24 sm:w-28 landscape-short:w-16 h-16 sm:h-18 landscape-short:h-9 rounded-2xl landscape-short:rounded-xl bg-[#1d1d1d] border border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.35)] p-1.5 landscape-short:p-1 flex items-center justify-center select-none transition-transform hover:scale-105 overflow-hidden">
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

  return (
    <div
      className={cn(
        'relative shrink-0 w-24 sm:w-28 landscape-short:w-16 h-16 sm:h-18 landscape-short:h-9 rounded-2xl landscape-short:rounded-xl bg-[#f4f4f4] p-1.5 landscape-short:p-1 flex items-center justify-center select-none transition-transform hover:scale-105 overflow-hidden',
        theme === 'ios'
          ? 'border border-white/90 dark:border-white/30 shadow-[0_4px_16px_rgba(56,189,248,0.25)]'
          : 'border border-[#cfbe96] dark:border-[#524433] shadow-[0_2px_8px_rgba(0,0,0,0.12)]',
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

function GuideCard({
  theme,
  children,
  className,
}: {
  theme: ThemeId
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'p-4 sm:p-5 rounded-2xl border shadow-sm transition-all',
        theme === 'ios' &&
          'bg-white/85 dark:bg-slate-900/85 border-sky-200/80 dark:border-sky-500/25 text-slate-900 dark:text-slate-100 backdrop-blur-md',
        theme === 'linear' && 'bg-[#0e0c16] border-purple-500/40 text-slate-100',
        theme === 'kindle' &&
          'bg-[#fbf5e5] dark:bg-[#2b2319] border-[#cbba92] text-[#2c2014] dark:text-[#f2ebe0]',
        className,
      )}
    >
      {children}
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

export function AboutModal({ open, onClose, theme, onThemeChange }: AboutModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('rsvp')
  const [searchQuery, setSearchQuery] = useState('')
  const dialogRef = useFocusTrap<HTMLDivElement>(open)

  const activeTabIndex = TABS.findIndex((t) => t.id === activeTab)

  // ESC ile kapatma & 1, 2, 3 ile tema değiştirme
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return

      if (['1', '2', '3'].includes(e.key) && onThemeChange) {
        const themeMap: Record<string, ThemeId> = {
          '1': 'ios',
          '2': 'linear',
          '3': 'kindle',
        }
        const targetTheme = themeMap[e.key]
        if (targetTheme) {
          onThemeChange(targetTheme)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, onThemeChange])

  // Arama filtresi
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredFeatures = useMemo(() => {
    if (!normalizedQuery) return GUIDE_FEATURES
    return GUIDE_FEATURES.filter(
      (f) =>
        f.title.toLowerCase().includes(normalizedQuery) ||
        f.description.toLowerCase().includes(normalizedQuery) ||
        (f.subtitle && f.subtitle.toLowerCase().includes(normalizedQuery)) ||
        (f.shortcutKey && f.shortcutKey.toLowerCase().includes(normalizedQuery)),
    )
  }, [normalizedQuery])

  const filteredShortcuts = useMemo(() => {
    if (!normalizedQuery) return GUIDE_SHORTCUTS
    return GUIDE_SHORTCUTS.filter(
      (s) =>
        s.key.toLowerCase().includes(normalizedQuery) ||
        s.description.toLowerCase().includes(normalizedQuery),
    )
  }, [normalizedQuery])

  if (!open) return null

  return (
    <div
      ref={dialogRef}
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
          'panel relative w-full max-w-2xl md:max-w-3xl rounded-3xl p-5 sm:p-6 md:p-7 landscape-short:p-3 shadow-2xl',
          'flex flex-col gap-3 md:gap-3.5 landscape-short:gap-2 border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] animate-in zoom-in-95 max-h-[90dvh] landscape-short:max-h-[96dvh] overflow-hidden',
          theme === 'linear' &&
            'border-purple-500/40 shadow-[0_0_40px_rgba(168,85,247,0.3)] bg-[#07060b]/95 text-slate-100',
          theme === 'kindle' &&
            'border-[#cfbe96] shadow-[0_8px_30px_rgba(0,0,0,0.15)] bg-[#fcf8ee] text-[#22180e]',
          theme === 'ios' &&
            'border-white/90 dark:border-white/25 shadow-[0_16px_50px_rgba(56,189,248,0.25)] bg-white/85 dark:bg-slate-900/85 backdrop-blur-3xl text-slate-900 dark:text-slate-100',
        )}
      >
        {/* Kapat Butonu */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 md:top-6 md:right-6 landscape-short:top-2.5 landscape-short:right-2.5 size-9 landscape-short:size-7 md:size-10 rounded-full panel grid place-items-center text-muted-foreground hover:text-foreground transition-all hover:scale-105 active:scale-95 cursor-pointer z-30"
          aria-label="Kapat"
        >
          <X className="size-4.5 landscape-short:size-3.5" />
        </button>

        {/* Üst Logo ve Başlık Alanı */}
        <div className="shrink-0 flex flex-row items-center gap-3.5 sm:gap-4.5 md:gap-5 landscape-short:gap-2.5 pb-0.5 landscape-short:pb-0">
          <OdakModalLogo theme={theme} />

          <div className="flex flex-col min-w-0 pr-8">
            <h2
              id="about-modal-title"
              className="text-lg sm:text-xl md:text-2xl landscape-short:text-base font-bold tracking-tight text-foreground flex items-center gap-1.5 flex-wrap"
            >
              <span className="font-extrabold text-foreground">odak</span>
              <span
                className={cn(
                  'font-black',
                  theme === 'ios' && 'text-sky-500',
                  theme === 'linear' && 'text-purple-400',
                  theme === 'kindle' && 'text-[#b44c43]',
                )}
              >
                •
              </span>
              <span
                className={cn(
                  'font-bold',
                  theme === 'ios' &&
                    'bg-gradient-to-r from-sky-600 to-indigo-600 dark:from-sky-400 dark:to-cyan-300 bg-clip-text text-transparent',
                  theme === 'linear' && 'text-purple-200',
                  theme === 'kindle' && 'text-[#3c2a18] dark:text-[#f2ebe0]',
                )}
              >
                Bilimsel Hızlı Okuma
              </span>
            </h2>
            <p
              className={cn(
                'text-xs sm:text-sm md:text-base mt-0.5 leading-snug font-medium landscape-short:hidden',
                theme === 'ios'
                  ? 'text-slate-600 dark:text-slate-300'
                  : 'text-foreground/85 dark:text-foreground/80',
              )}
            >
              Göz kaslarının mekanik yorgunluğunu sıfırlayan, zihnin anlama hızını katlayan yeni nesil RSVP platformu.
            </p>
          </div>
        </div>

        {/* Sekme Çubuğu & Canlı Arama Alanı */}
        <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Sekme Butonları */}
          <div
            role="tablist"
            aria-label="odak bilgi bölümleri"
            className="flex-1 flex items-center justify-between gap-1 p-1 md:p-1.5 landscape-short:p-0.5 rounded-2xl bg-foreground/5 border border-border/60 select-none"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id && !normalizedQuery
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setSearchQuery('')
                  }}
                  className={cn(
                    'flex items-center justify-center transition-all duration-300 cursor-pointer outline-none rounded-xl h-9 md:h-10 landscape-short:h-7.5',
                    isActive
                      ? 'flex-1 gap-1.5 sm:gap-2 px-3 md:px-4 bg-background text-foreground shadow-xs font-bold border border-border/80'
                      : 'size-9 md:size-10 landscape-short:size-7.5 text-muted-foreground hover:text-foreground hover:bg-foreground/10',
                  )}
                  title={tab.label}
                  aria-label={tab.label}
                >
                  {isActive ? (
                    <>
                      <Icon className={cn('size-4 md:size-4.5 landscape-short:size-3.5 shrink-0', tab.color)} />
                      <span className="text-xs sm:text-sm landscape-short:text-xs font-bold truncate">
                        {tab.label}
                      </span>
                    </>
                  ) : (
                    <Icon
                      className={cn(
                        'size-4 md:size-4.5 landscape-short:size-3.5 text-muted-foreground/75 hover:text-foreground transition-all hover:scale-115 shrink-0',
                        tab.color,
                      )}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Canlı Kılavuz Araması */}
          <div className="relative shrink-0 sm:w-56 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Özellik veya tuş ara (C, B, sf...)"
              className="w-full h-9 md:h-10 text-xs rounded-2xl pl-8 pr-7 bg-foreground/5 border border-border/60 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Aramayı Temizle"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Sekmeler Arası Yatay Slider veya Arama Sonuçları */}
        <div className="relative w-full flex-1 min-h-0 overflow-hidden rounded-2xl">
          {normalizedQuery ? (
            /* Canlı Arama Sonuçları Görünümü */
            <div className="w-full h-full max-h-[calc(90dvh-14rem)] landscape-short:max-h-[calc(96dvh-5.5rem)] overflow-y-auto theme-scrollbar px-1 pb-10 text-sm flex flex-col gap-3">
              <div className="text-xs font-semibold text-muted-foreground px-1">
                &ldquo;{searchQuery}&rdquo; için arama sonuçları ({filteredFeatures.length} özellik, {filteredShortcuts.length} kısayol):
              </div>

              {filteredFeatures.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-sky-500" /> Eşleşen Özellikler
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredFeatures.map((feat) => {
                      const Icon = feat.icon
                      return (
                        <GuideCard key={feat.id} theme={theme} className="p-3.5">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                              <Icon className={cn('size-4 shrink-0', feat.iconColor)} />
                              {feat.title}
                            </h4>
                            {feat.shortcutKey && <Kbd>{feat.shortcutKey}</Kbd>}
                          </div>
                          <p className="text-xs leading-relaxed text-foreground/85 font-normal">
                            {feat.description}
                          </p>
                        </GuideCard>
                      )
                    })}
                  </div>
                </div>
              )}

              {filteredShortcuts.length > 0 && (
                <div className="flex flex-col gap-2.5 mt-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Keyboard className="size-3.5 text-purple-500" /> Eşleşen Kısayollar
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {filteredShortcuts.map((sc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-foreground/[0.04] border border-border/70 hover:bg-foreground/[0.07] transition-colors"
                      >
                        <span className="text-foreground/90 font-medium">{sc.description}</span>
                        <Kbd>{sc.key}</Kbd>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredFeatures.length === 0 && filteredShortcuts.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  Aramanızla eşleşen özellik veya kısayol bulunamadı.
                </div>
              )}
            </div>
          ) : (
            <div
              className="flex w-[400%] h-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ transform: `translateX(-${activeTabIndex * 25}%)` }}
            >
              {/* 1. SLIDE: RSVP & Bilim */}
              <div
                role="tabpanel"
                inert={activeTabIndex !== 0}
                aria-hidden={activeTabIndex !== 0}
                className="w-1/4 h-full max-h-[calc(90dvh-14rem)] landscape-short:max-h-[calc(96dvh-5.5rem)] overflow-y-auto theme-scrollbar px-1 pb-10 text-sm md:text-base leading-relaxed"
              >
                <div className="flex flex-col gap-3.5">
                  {GUIDE_SCIENCE.map((sci, idx) => {
                    const Icon = sci.icon
                    return (
                      <GuideCard key={idx} theme={theme}>
                        <div className="flex items-center gap-2.5 font-bold mb-1.5 text-base text-foreground">
                          <Icon className={cn('size-4.5 shrink-0', sci.iconColor)} />
                          <h4>{sci.title}</h4>
                        </div>
                        <p className="text-xs sm:text-sm leading-relaxed text-foreground/90 font-normal">
                          {sci.description}
                        </p>
                        {sci.bulletPoints && sci.bulletPoints.length > 0 && (
                          <ul className="mt-2 text-xs sm:text-sm space-y-1.5 list-disc pl-4 text-foreground/90 font-normal">
                            {sci.bulletPoints.map((pt, pIdx) => (
                              <li key={pIdx}>{pt}</li>
                            ))}
                          </ul>
                        )}
                      </GuideCard>
                    )
                  })}
                </div>
              </div>

              {/* 2. SLIDE: Özellikler (Dinamik Kayıt Defterinden Beslenir) */}
              <div
                role="tabpanel"
                inert={activeTabIndex !== 1}
                aria-hidden={activeTabIndex !== 1}
                className="w-1/4 h-full max-h-[calc(90dvh-14rem)] landscape-short:max-h-[calc(96dvh-5.5rem)] overflow-y-auto theme-scrollbar px-1 pb-10 text-sm md:text-base leading-relaxed"
              >
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {GUIDE_FEATURES.map((feat) => {
                      const Icon = feat.icon
                      return (
                        <GuideCard key={feat.id} theme={theme} className="p-4 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-1.5 mb-1.5">
                              <h4 className="font-bold text-foreground flex items-center gap-2 text-sm sm:text-base">
                                <Icon className={cn('size-4 shrink-0', feat.iconColor)} />
                                {feat.title}
                              </h4>
                              {feat.shortcutKey && (
                                <Kbd className="text-[10px] px-1.5 py-0.5">{feat.shortcutKey}</Kbd>
                              )}
                            </div>
                            {feat.subtitle && (
                              <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                                {feat.subtitle}
                              </div>
                            )}
                            <p className="text-xs leading-relaxed text-foreground/85 font-normal">
                              {feat.description}
                            </p>
                          </div>

                          {feat.highlights && feat.highlights.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-border/50 text-[11px] text-foreground/80 space-y-1">
                              {feat.highlights.map((hl, hlIdx) => (
                                <div key={hlIdx} className="flex items-start gap-1.5">
                                  <CheckCircle2 className="size-3 text-emerald-500 shrink-0 mt-0.5" />
                                  <span>{hl}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </GuideCard>
                      )
                    })}
                  </div>

                  {/* Alt Bilgi Kartı */}
                  <div
                    className={cn(
                      'p-3.5 rounded-2xl border flex items-center gap-3',
                      theme === 'ios' &&
                        'bg-white/85 dark:bg-slate-900/85 border-sky-200/80 dark:border-sky-500/25 shadow-sm backdrop-blur-md',
                      theme === 'linear' && 'bg-[#0e0c16] border-purple-500/40',
                      theme === 'kindle' && 'bg-[#fbf5e5] dark:bg-[#2b2319] border-[#cbba92]',
                    )}
                  >
                    <FileText className="size-5 text-muted-foreground shrink-0" />
                    <p className="text-xs text-foreground/90 leading-relaxed font-normal">
                      <strong>Otomatik Güncellenen Özellik Havuzu:</strong> Sisteme yeni eklenen tüm özellikler (1K-4K bloklama, Bionic, PDF sayfa göstergesi, Zen kıvrım şeffaflığı vb.) doğrudan bu kayıt havuzundan anında sunulur.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. SLIDE: Kullanım & Tuşlar */}
              <div
                role="tabpanel"
                inert={activeTabIndex !== 2}
                aria-hidden={activeTabIndex !== 2}
                className="w-1/4 h-full max-h-[calc(90dvh-14rem)] landscape-short:max-h-[calc(96dvh-5.5rem)] overflow-y-auto theme-scrollbar px-1 pb-10 text-sm md:text-base leading-relaxed"
              >
                <div className="flex flex-col gap-3.5">
                  {/* Masaüstü Klavye Kısayolları Kartı */}
                  <GuideCard theme={theme}>
                    <h4 className="font-bold text-foreground mb-3 flex items-center gap-2 text-sm sm:text-base">
                      <Keyboard className="size-4.5 text-purple-500" />
                      Masaüstü: Klavye ve Fare Kısayolları
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                      {GUIDE_SHORTCUTS.map((sc, idx) => {
                        const Icon = sc.icon
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-xl bg-foreground/[0.04] border border-border/70 hover:bg-foreground/[0.07] transition-colors"
                          >
                            <span className="text-foreground/90 font-medium flex items-center gap-1.5">
                              {Icon && <Icon className={cn('size-3.5 shrink-0', sc.iconColor)} />}
                              {sc.description}
                            </span>
                            <Kbd>{sc.key}</Kbd>
                          </div>
                        )
                      })}
                    </div>
                  </GuideCard>

                  {/* Mobil ve Tablet Dokunmatik Kullanım Kartı */}
                  <GuideCard theme={theme}>
                    <h4 className="font-bold text-foreground mb-3 flex items-center gap-2 text-sm sm:text-base">
                      <Smartphone className="size-4.5 text-sky-500" />
                      Mobil ve Tablet: Dokunmatik Ekran Kullanımı
                    </h4>
                    <div className="flex flex-col gap-2.5 text-xs sm:text-sm">
                      {GUIDE_TOUCH_CONTROLS.map((tc, idx) => {
                        const Icon = tc.icon
                        return (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-foreground/[0.04] border border-border/70 hover:bg-foreground/[0.07] transition-colors"
                          >
                            <div className="font-bold text-foreground flex items-center gap-2 mb-1">
                              <Icon className={cn('size-4 shrink-0', tc.iconColor)} />
                              {tc.title}
                              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-foreground/10 text-muted-foreground font-semibold">
                                {tc.gesture}
                              </span>
                            </div>
                            <p className="text-foreground/85 text-xs leading-relaxed font-normal">
                              {tc.description}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </GuideCard>
                </div>
              </div>

              {/* 4. SLIDE: Künye & Geliştirici Hikâyesi */}
              <div
                role="tabpanel"
                inert={activeTabIndex !== 3}
                aria-hidden={activeTabIndex !== 3}
                className="w-1/4 h-full max-h-[calc(90dvh-14rem)] landscape-short:max-h-[calc(96dvh-5.5rem)] overflow-y-auto theme-scrollbar px-1 pb-10 text-sm md:text-base leading-relaxed"
              >
                <div className="flex flex-col gap-3.5">
                  <GuideCard theme={theme} className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-border/60 pb-3">
                      <div>
                        <h4 className="font-bold text-base text-foreground">{APP_METADATA.creator}</h4>
                        <p className="text-xs text-foreground/75 font-medium">
                          1 Kasım 2026 • {APP_METADATA.location}
                        </p>
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
                  </GuideCard>

                  <GuideCard theme={theme}>
                    <div className="flex items-center gap-2 font-bold text-foreground mb-1.5 text-xs sm:text-sm">
                      <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                      <h4>%100 Cihaz İçi Gizlilik (Yerel Bellek)</h4>
                    </div>
                    <p className="text-foreground/85 text-xs leading-relaxed font-normal">
                      Yüklediğiniz kitaplar, özel PDF&apos;ler veya çalışma notlarınız <strong>kesinlikle hiçbir sunucuya iletilmez</strong>. Tüm ayrıştırma, indeksleme ve RSVP akışı doğrudan cihazınızın tarayıcı belleğinde (in-memory) gerçekleşir. İnternetiniz kapalıyken bile tam performans çalışır.
                    </p>
                  </GuideCard>

                  <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-foreground/75 px-1 gap-1 font-medium">
                    <span>Mimari: {APP_METADATA.architecture.slice(0, 3).join(' • ')}</span>
                    <span>Sürüm {APP_METADATA.version} • {APP_METADATA.architecture.slice(3).join(' • ')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
