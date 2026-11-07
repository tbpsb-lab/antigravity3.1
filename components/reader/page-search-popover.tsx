'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, FileText, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toTurkishLower } from '@/lib/turkish-word-splitter'
import type { ChunkItem, BookPageInfo, ThemeId } from '@/lib/rsvp'

type PageSearchPopoverProps = {
  open: boolean
  onClose: () => void
  words: string[]
  chunks?: ChunkItem[]
  pageInfo?: BookPageInfo | null
  currentWordIndex: number
  onJump: (wordIndex: number) => void
  theme?: ThemeId
  triggerRef?: React.RefObject<any>
}

type SearchMatch = {
  id: string
  type: 'page' | 'word'
  wordIndex: number
  title: string
  snippet: string
  pageNumber?: number
}

export function PageSearchPopover({
  open,
  onClose,
  words,
  chunks = [],
  pageInfo,
  currentWordIndex,
  onJump,
  theme,
  triggerRef,
}: PageSearchPopoverProps) {
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [coords, setCoords] = useState<{ bottom: number; left: number; arrowLeft: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Konumu butonun tam üstüne dinamik hizala ve ekran taşmasını önle
  const updatePosition = useCallback(() => {
    if (triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const buttonCenter = rect.left + rect.width / 2
      const measuredWidth = popoverRef.current?.offsetWidth || (typeof window !== 'undefined' && window.innerWidth >= 640 ? 340 : 290)
      const popoverWidth = Math.min(measuredWidth, typeof window !== 'undefined' ? window.innerWidth - 24 : measuredWidth)
      const halfWidth = popoverWidth / 2

      // Popover merkezini ekran sınırları içinde tut (en az 12px kenar payı)
      const minCenter = halfWidth + 12
      const maxCenter = (typeof window !== 'undefined' ? window.innerWidth : 360) - halfWidth - 12
      const centerLeft = Math.max(minCenter, Math.min(maxCenter, buttonCenter))

      // Ok işaretinin popover içindeki göreceli sol konumu (px cinsinden)
      const relativeArrowLeft = buttonCenter - (centerLeft - halfWidth)
      const clampedArrowLeft = Math.max(16, Math.min(popoverWidth - 16, relativeArrowLeft))

      setCoords({
        bottom: Math.max(16, window.innerHeight - rect.top + 8),
        left: Math.round(centerLeft),
        arrowLeft: Math.round(clampedArrowLeft),
      })
    } else {
      setCoords({
        bottom: 120,
        left: typeof window !== 'undefined' ? Math.round(window.innerWidth / 2) : 160,
        arrowLeft: 160,
      })
    }
  }, [triggerRef])

  // Otomatik odaklanma & Açıldığında sorguyu temizle ve konumu hesapla
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      updatePosition()
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('resize', updatePosition)
        window.removeEventListener('scroll', updatePosition)
      }
    }
  }, [open, updatePosition])

  // ESC ile kapatma dinleyicisi
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Arama sonuçlarını hesapla (Sayfa numarası veya kelime)
  const matches = useMemo<SearchMatch[]>(() => {
    const trimmed = query.trim()
    if (!trimmed) return []

    const results: SearchMatch[] = []
    const isNumeric = /^\d+$/.test(trimmed)
    const targetPageNum = isNumeric ? parseInt(trimmed, 10) : null

    // 1. Sayfa Numarası Eşleşmesi (Kullanıcı sayı girdiyse)
    if (isNumeric && targetPageNum !== null && pageInfo && targetPageNum >= 1 && targetPageNum <= pageInfo.totalBookPages) {
      const pageChunk = chunks.find((c) => c.pageNumber === targetPageNum)
      if (pageChunk) {
        results.push({
          id: `page-${targetPageNum}`,
          type: 'page',
          wordIndex: pageChunk.startIndex,
          pageNumber: targetPageNum,
          title: `${targetPageNum}. Sayfaya Git`,
          snippet: `Kitabın ${targetPageNum}. sayfası (Kelime ${pageChunk.startIndex + 1})`,
        })
      } else {
        const closest = chunks.find((c) => (c.pageNumber || 0) >= targetPageNum)
        if (closest) {
          results.push({
            id: `page-${targetPageNum}`,
            type: 'page',
            wordIndex: closest.startIndex,
            pageNumber: closest.pageNumber || targetPageNum,
            title: `${targetPageNum}. Sayfaya Git`,
            snippet: `Kitabın yaklaşık ${targetPageNum}. sayfası (Kelime ${closest.startIndex + 1})`,
          })
        }
      }
    }

    // 2. Kelime Bazlı Metin Araması
    const lowerQuery = toTurkishLower(trimmed)
    if (lowerQuery.length >= 2 || !isNumeric) {
      let count = 0
      for (let i = 0; i < words.length; i++) {
        const rawWord = words[i]
        const cleanWord = toTurkishLower(rawWord.replace(/[.,;:!?"'“”‘’()[\]\-]/g, ''))
        const fullLower = toTurkishLower(rawWord)

        if (cleanWord.includes(lowerQuery) || fullLower.includes(lowerQuery)) {
          count++
          if (results.length < 15) {
            const sStart = Math.max(0, i - 3)
            const sEnd = Math.min(words.length, i + 5)
            const snippetWords = words.slice(sStart, sEnd)
            const snippet = snippetWords.join(' ')

            let wordPage: number | undefined
            if (chunks && chunks.length > 0) {
              const ch = chunks.find((c) => i >= c.startIndex && i < c.startIndex + c.words.length)
              if (ch) wordPage = ch.pageNumber
            }

            results.push({
              id: `word-${i}`,
              type: 'word',
              wordIndex: i,
              pageNumber: wordPage,
              title: words[i],
              snippet,
            })
          }
        }
      }
    }

    return results
  }, [query, words, chunks, pageInfo])

  // Seçilen sonuca git ve popover'ı kapat
  const handleSelect = useCallback(
    (match: SearchMatch) => {
      onJump(match.wordIndex)
      onClose()
    },
    [onJump, onClose],
  )

  // Klavye ok tuşları ile gezinme & Enter ile gitme
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (matches.length > 0 ? (prev + 1) % matches.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (matches.length > 0 ? (prev - 1 + matches.length) % matches.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (matches.length > 0) {
        const target = matches[selectedIndex] || matches[0]
        if (target) handleSelect(target)
      }
    }
  }

  if (!open || !mounted) return null

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none select-none">
      {/* Tıklama ile kapatma sağlayan şeffaf alan */}
      <div
        className="fixed inset-0 pointer-events-auto bg-black/15 backdrop-blur-[0.5px] transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mini Arama ve Atlama Penceresi */}
      <div
        ref={popoverRef}
        role="dialog"
        aria-modal="true"
        aria-label="Sayfaya atla veya kelime ara"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          bottom: coords ? `${coords.bottom}px` : '120px',
          left: coords ? `${coords.left}px` : '50%',
          transform: 'translateX(-50%)',
        }}
        className={cn(
          'pointer-events-auto z-20',
          'w-[290px] sm:w-[340px] max-w-[92vw]',
          'p-2.5 rounded-2xl border shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-200',
          // Tema renkleri ve kristal netliğinde arka plan
          (!theme || theme === 'ios') &&
            'bg-white/95 text-slate-900 border-slate-300 shadow-[0_16px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl',
          theme === 'kindle' &&
            'bg-[#fbf5e5] text-[#2c2014] border-[#cbba92] shadow-[0_16px_40px_rgba(60,40,20,0.25)] backdrop-blur-xl',
          theme === 'linear' &&
            'bg-[#0f0d19]/95 text-slate-100 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.45)] backdrop-blur-xl',
        )}
      >
        {/* Butonu İşaret Eden Minik Cam Ok (Arrow Pointer) */}
        <div
          style={{ left: coords ? `${coords.arrowLeft}px` : '50%' }}
          className={cn(
            'absolute -bottom-1.5 -translate-x-1/2 size-3 rotate-45 border-b border-r shadow-2xs',
            (!theme || theme === 'ios') && 'bg-white border-slate-300',
            theme === 'kindle' && 'bg-[#fbf5e5] border-[#cbba92]',
            theme === 'linear' && 'bg-[#0f0d19] border-purple-500/50',
          )}
          aria-hidden="true"
        />

        {/* 1. Tek Satır Mini Arama Girişi */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all',
            (!theme || theme === 'ios') &&
              'bg-slate-100/90 border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20',
            theme === 'kindle' &&
              'bg-[#efe4cc] border-[#d8c7a2] focus-within:border-[#8c6b3e] focus-within:ring-2 focus-within:ring-[#8c6b3e]/20',
            theme === 'linear' &&
              'bg-purple-950/40 border-purple-500/40 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-500/30',
          )}
        >
          <Search className="size-3.5 text-muted-foreground/80 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Sayfa no (örn. 25) veya kelime..."
            className="flex-1 min-w-0 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              className="size-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              aria-label="Temizle"
            >
              <X className="size-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="size-4 rounded-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground cursor-pointer transition-colors"
              aria-label="Kapat"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* 2. Sonuçlar Alanı */}
        {query.trim().length > 0 ? (
          <div className="mt-1.5">
            {matches.length > 0 ? (
              <div className="flex flex-col gap-0.5 max-h-[160px] overflow-y-auto theme-scrollbar pr-0.5">
                <div className="px-1 py-0.5 text-[10px] font-semibold text-muted-foreground/75 flex items-center justify-between">
                  <span>Sonuçlar ({matches.length})</span>
                  <span className="text-[9px] font-mono">↵ Git</span>
                </div>
                {matches.map((m, idx) => {
                  const isSelected = idx === selectedIndex
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelect(m)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        'w-full text-left p-1.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-between gap-2',
                        isSelected
                          ? 'bg-foreground/[0.09] text-foreground font-medium'
                          : 'text-foreground/85 hover:bg-foreground/[0.05]',
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {m.type === 'page' ? (
                          <BookOpen className="size-3.5 text-sky-500 shrink-0" />
                        ) : (
                          <FileText className="size-3 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate text-[11px] leading-tight">
                          {m.type === 'page' ? (
                            <strong className="text-foreground">{m.title}</strong>
                          ) : (
                            m.snippet
                          )}
                        </span>
                      </div>

                      {m.pageNumber && (
                        <span className="shrink-0 font-mono text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-foreground/10 text-muted-foreground">
                          sf: {m.pageNumber}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="py-2.5 text-center text-[11px] text-muted-foreground">
                Eşleşen sayfa veya kelime bulunamadı.
              </div>
            )}
          </div>
        ) : (
          <div className="mt-1.5 px-1 py-1 text-[10px] text-muted-foreground/75 text-center font-normal">
            Gitmek istediğiniz sayfa numarasını veya kelimeyi yazın
          </div>
        )}
      </div>
    </div>
  )
}
