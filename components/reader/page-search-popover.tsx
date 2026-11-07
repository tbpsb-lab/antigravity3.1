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
      const measuredWidth =
        popoverRef.current?.offsetWidth ||
        (typeof window !== 'undefined' && window.innerWidth >= 640 ? 320 : 280)
      const popoverWidth = Math.min(
        measuredWidth,
        typeof window !== 'undefined' ? window.innerWidth - 24 : measuredWidth,
      )
      const halfWidth = popoverWidth / 2

      // Popover merkezini ekran sınırları içinde tut (en az 12px kenar payı)
      const minCenter = halfWidth + 12
      const maxCenter = (typeof window !== 'undefined' ? window.innerWidth : 360) - halfWidth - 12
      const centerLeft = Math.max(minCenter, Math.min(maxCenter, buttonCenter))

      setCoords({
        bottom: Math.max(16, window.innerHeight - rect.top + 8),
        left: Math.round(centerLeft),
      })
    } else {
      setCoords({
        bottom: 120,
        left: typeof window !== 'undefined' ? Math.round(window.innerWidth / 2) : 160,
      })
    }
  }, [triggerRef])

  useEffect(() => {
    setMounted(true)
    updatePosition()
  }, [updatePosition])

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

  // Dışarı tıklama (Aa ve İçerik Merkezi tarzı sade kapatma) ve ESC dinleyicisi
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        (!triggerRef?.current || !triggerRef.current.contains(target))
      ) {
        onClose()
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose, triggerRef])

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

    // 2. Kelime ve Çoklu Kelime / Öbek (2, 3+ kelime) Bazlı Metin Araması
    const lowerQuery = toTurkishLower(trimmed)
    const queryTokens = lowerQuery.split(/\s+/).filter(Boolean)
    const isMultiWord = queryTokens.length > 1
    const normalizedQuery = queryTokens.join(' ')

    if (lowerQuery.length >= 2 || !isNumeric || isMultiWord) {
      const tokenCount = queryTokens.length
      const cleanRegex = /[.,;:!?"'“”‘’()[\]\-]/g

      for (let i = 0; i <= words.length - tokenCount; i++) {
        let isMatch = false

        if (!isMultiWord) {
          // Tek kelime araması
          const rawWord = words[i]
          const cleanWord = toTurkishLower(rawWord.replace(cleanRegex, ''))
          const fullLower = toTurkishLower(rawWord)
          if (cleanWord.includes(lowerQuery) || fullLower.includes(lowerQuery)) {
            isMatch = true
          }
        } else {
          // Öbek (2, 3+ kelime) araması: İlk kelime ön filtresi ile yüksek performans
          const firstWordClean = toTurkishLower(words[i].replace(cleanRegex, ''))
          const firstWordRaw = toTurkishLower(words[i])
          if (firstWordClean.includes(queryTokens[0]) || firstWordRaw.includes(queryTokens[0])) {
            const phraseWords = words.slice(i, i + tokenCount)
            const cleanPhrase = phraseWords
              .map((w) => toTurkishLower(w.replace(cleanRegex, '')))
              .join(' ')
            const rawPhrase = phraseWords
              .map((w) => toTurkishLower(w))
              .join(' ')

            if (
              cleanPhrase.includes(normalizedQuery) ||
              rawPhrase.includes(normalizedQuery) ||
              cleanPhrase.includes(lowerQuery) ||
              rawPhrase.includes(lowerQuery)
            ) {
              isMatch = true
            }
          }
        }

        if (isMatch) {
          if (results.length < 15) {
            const sStart = Math.max(0, i - 3)
            const sEnd = Math.min(words.length, i + tokenCount + 4)
            const snippetWords = words.slice(sStart, sEnd)
            const snippet = snippetWords.join(' ')

            let wordPage: number | undefined
            if (chunks && chunks.length > 0) {
              const ch = chunks.find((c) => i >= c.startIndex && i < c.startIndex + c.words.length)
              if (ch) wordPage = ch.pageNumber
            }

            const matchedTitle = isMultiWord
              ? words.slice(i, i + tokenCount).join(' ')
              : words[i]

            results.push({
              id: `word-${i}`,
              type: 'word',
              wordIndex: i,
              pageNumber: wordPage,
              title: matchedTitle,
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

  if (!mounted) return null

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal={open ? 'true' : undefined}
      aria-label="Sayfaya atla veya kelime ara"
      inert={!open}
      style={{
        position: 'fixed',
        bottom: coords ? `${coords.bottom}px` : '120px',
        left: coords ? `${coords.left}px` : '50%',
        transform: 'translateX(-50%)',
      }}
      className={cn(
        'panel panel-solid z-[9999] p-2 sm:p-2.5 rounded-2xl shadow-xl flex flex-col gap-1.5 transition-all duration-200 ease-out origin-bottom select-none',
        'w-[280px] sm:w-[320px] max-w-[92vw]',
        open
          ? 'scale-100 opacity-100 pointer-events-auto'
          : 'pointer-events-none scale-95 opacity-0',
      )}
    >
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

      {/* 2. Sonuçlar Alanı (Sadece arama yapıldığında gösterilir; boşken ikinci satır ve sonuç tablosu başlığı kaldırılmıştır) */}
      {query.trim().length > 0 && (
        <div className="mt-0.5">
          {matches.length > 0 ? (
            <div className="flex flex-col gap-0.5 max-h-[160px] overflow-y-auto theme-scrollbar pr-0.5">
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
                      <span className="shrink-0 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-foreground/10 text-muted-foreground">
                        sf: {m.pageNumber}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="py-2 text-center text-[11px] text-muted-foreground">
              Eşleşen sayfa veya kelime bulunamadı.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
