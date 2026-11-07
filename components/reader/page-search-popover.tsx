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
}: PageSearchPopoverProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Otomatik odaklanma & Açıldığında sorguyu temizle
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Dışarı tıklama ve ESC ile kapatma dinleyicisi
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
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
      // Bu sayfanın ilk chunk'ını bul
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
        // En yakın sayfayı bul
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
            // Bağlam metni parçası oluştur (Öncesi 3 kelime, kendisi, sonrası 4 kelime)
            const sStart = Math.max(0, i - 3)
            const sEnd = Math.min(words.length, i + 5)
            const snippetWords = words.slice(sStart, sEnd)
            const snippet = snippetWords.join(' ')

            // İlgili kelimenin hangi sayfada olduğunu chunks dizisinden bul
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

  if (!open) return null

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="false"
      aria-label="Sayfaya atla veya kelime ara"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50',
        'w-[270px] sm:w-[320px] max-w-[92vw]',
        'p-2 rounded-2xl border shadow-xl',
        'bg-[var(--panel)] border-[var(--panel-border)] backdrop-blur-[var(--panel-blur)]',
        'text-foreground select-none animate-in fade-in zoom-in-95 duration-200',
      )}
    >
      {/* 1. Tek Satır Mini Arama Girişi */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-foreground/[0.05] border border-border/60 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/40 transition-all">
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
        <div className="mt-1.5 px-1 py-1 text-[10px] text-muted-foreground/70 text-center font-normal">
          Doğrudan gitmek için sayfa sayısı veya aramak istediğiniz bir kelime yazın.
        </div>
      )}
    </div>
  )
}
