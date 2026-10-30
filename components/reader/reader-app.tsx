'use client'

import { useCallback, useEffect, useEffectEvent, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  MAX_WPM,
  MIN_WPM,
  SAMPLE_TEXT,
  THEMES,
  WPM_STEP,
  type ThemeId,
  splitAtPivot,
  tokenize,
  createChunks,
  chunkDelay,
} from '@/lib/rsvp'
import {
  saveReadingProgress,
  loadReadingProgress,
  loadLastActiveDoc,
  findChunkIndexForWord,
} from '@/lib/reading-progress'
import { loadReaderSettings, saveReaderSettings } from '@/lib/reader-settings'
import { TopBar } from './top-bar'
import { RsvpDisplay } from './rsvp-display'
import { ContextPeek } from './context-peek'
import { ControlDock } from './control-dock'
import { TextSheet } from './text-sheet'
import { FONT_FACES, FontSettings, type FontFace } from './font-settings'
import { useElementHeight } from '@/lib/use-element-height'

export function ReaderApp() {
  const [theme, setTheme] = useState<ThemeId>('ios')
  const [fontFace, setFontFace] = useState<FontFace>('mono')
  const [fontScale, setFontScale] = useState(1)
  const [chunkSize, setChunkSize] = useState<number>(1)
  const [readFootnotes, setReadFootnotes] = useState<boolean>(true)
  const [chunkBadge, setChunkBadge] = useState<string | null>(null)
  const [resumeBadge, setResumeBadge] = useState<string | null>(null)

  const [headerRef, headerHeight] = useElementHeight<HTMLElement>()
  const [dockRef, dockHeight] = useElementHeight<HTMLElement>()
  const [text, setText] = useState(SAMPLE_TEXT)
  const [docTitle, setDocTitle] = useState('Odak')
  const [index, setIndex] = useState(0)
  const [wpm, setWpm] = useState(300)
  const [playing, setPlaying] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const words = useMemo(() => tokenize(text), [text])

  // Akıllı Cümle & Başlık Kırılımlı Chunking
  const chunks = useMemo(
    () => createChunks(text, chunkSize, { enableFootnotes: readFootnotes }),
    [text, chunkSize, readFootnotes],
  )

  const maxSide = useMemo(
    () =>
      words.reduce((max, w) => {
        const [before, , after] = splitAtPivot(w)
        return Math.max(max, before.length, after.length)
      }, 6),
    [words],
  )

  const lastIndex = Math.max(0, chunks.length - 1)
  const currentChunk = chunks[index]
  const zen = playing

  useEffect(() => {
    if (!playing || chunks.length === 0) return
    const timer = setTimeout(
      () => {
        if (index >= lastIndex) setPlaying(false)
        else setIndex((i) => i + 1)
      },
      chunkDelay(chunks[index] ?? '', wpm, chunkSize),
    )
    return () => clearTimeout(timer)
  }, [playing, index, wpm, chunks, lastIndex, chunkSize])

  const togglePlay = useCallback(() => {
    if (chunks.length === 0) return
    setPlaying((p) => {
      if (!p && index >= lastIndex) setIndex(0)
      return !p
    })
  }, [chunks.length, index, lastIndex])

  const seek = useCallback(
    (next: number) => setIndex(Math.min(lastIndex, Math.max(0, next))),
    [lastIndex],
  )

  const changeWpm = useCallback(
    (delta: number) => setWpm((w) => Math.min(MAX_WPM, Math.max(MIN_WPM, w + delta))),
    [],
  )

  // Chunk boyutu değiştiğinde mevcut kalınan kelimeden zıplama olmadan aynı konumu koru
  const handleChunkSizeChange = useCallback(
    (newSize: number) => {
      if (newSize === chunkSize) return

      // 1. Mevcut aktif öbeğin başlangıç kelime indeksini tespit et
      const activeWordIndex = chunks[index]?.startIndex ?? index

      // 2. Yeni öbek boyutuna göre öbek listesini hesapla
      const nextChunks = createChunks(text, newSize, { enableFootnotes: readFootnotes })

      // 3. Kalınan kelimenin yeni listedeki karşılık gelen öbek indeksini bul
      const nextIndex = findChunkIndexForWord(nextChunks, activeWordIndex)

      // 4. Boyutu ve indeksi eşzamanlı güncelle (kelime konumunu sabitle)
      setChunkSize(newSize)
      setIndex(nextIndex)

      setChunkBadge(`${newSize} Kelime Öbeği`)
      const t = setTimeout(() => setChunkBadge(null), 1200)
      return () => clearTimeout(t)
    },
    [chunkSize, chunks, index, text, readFootnotes],
  )

  // Dipnot ayarı değiştiğinde de kalınan kelimeyi koru
  const handleReadFootnotesChange = useCallback(
    (enabled: boolean) => {
      const activeWordIndex = chunks[index]?.startIndex ?? index
      const nextChunks = createChunks(text, chunkSize, { enableFootnotes: enabled })
      const nextIndex = findChunkIndexForWord(nextChunks, activeWordIndex)
      setReadFootnotes(enabled)
      setIndex(nextIndex)
    },
    [chunks, index, text, chunkSize],
  )

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (sheetOpen) return
    const target = e.target as HTMLElement | null
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) {
      if (!(target instanceof HTMLInputElement && target.type === 'range' && e.code === 'Space'))
        return
    }
    switch (e.code) {
      case 'Space':
        e.preventDefault()
        togglePlay()
        break
      case 'Escape':
        setPlaying(false)
        break
      case 'ArrowLeft':
        e.preventDefault()
        seek(index - (e.shiftKey ? 10 : 1))
        break
      case 'ArrowRight':
        e.preventDefault()
        seek(index + (e.shiftKey ? 10 : 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        changeWpm(WPM_STEP)
        break
      case 'ArrowDown':
        e.preventDefault()
        changeWpm(-WPM_STEP)
        break
      case 'KeyC':
        e.preventDefault()
        handleChunkSizeChange(chunkSize >= 4 ? 1 : chunkSize + 1)
        break
      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
        setTheme(THEMES[Number(e.key) - 1].id)
        break
    }
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKeyDown(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Tarayıcı ilk açıldığında veya yenilendiğinde son ayarları (tema, font, chunk vb.) ve okunan dokümanı sessizce hatırla
  useEffect(() => {
    // 1. Kullanıcı tercihlerini (tema, font tipi, font boyutu, chunk boyutu, wpm, dipnot) sessizce yükle (bildirim vermeden)
    const settings = loadReaderSettings()
    if (settings.theme) setTheme(settings.theme)
    if (settings.fontFace) setFontFace(settings.fontFace)
    if (typeof settings.fontScale === 'number') setFontScale(settings.fontScale)
    if (typeof settings.chunkSize === 'number') setChunkSize(settings.chunkSize)
    if (typeof settings.wpm === 'number') setWpm(settings.wpm)
    if (typeof settings.readFootnotes === 'boolean') setReadFootnotes(settings.readFootnotes)

    // 2. Son okunan dokümanı ve kalınan yeri hatırla
    const activeChunkSize = settings.chunkSize ?? 1
    const activeFootnotes = settings.readFootnotes ?? true
    const lastDoc = loadLastActiveDoc()
    if (lastDoc && lastDoc.text) {
      const saved = loadReadingProgress(lastDoc.title, lastDoc.text)
      setText(lastDoc.text)
      if (lastDoc.title) setDocTitle(lastDoc.title)
      if (saved && (saved.wordIndex > 0 || saved.index > 0)) {
        const initialChunks = createChunks(lastDoc.text, activeChunkSize, { enableFootnotes: activeFootnotes })
        const target = findChunkIndexForWord(initialChunks, saved.wordIndex ?? saved.index)
        if (target > 0) {
          setIndex(target)
        }
      }
    }
  }, [])

  // Kullanıcı tercihlerindeki her değişikliği sessizce localStorage'da sakla (herhangi bir bildirim vermeden)
  useEffect(() => {
    saveReaderSettings({
      theme,
      fontFace,
      fontScale,
      chunkSize,
      wpm,
      readFootnotes,
    })
  }, [theme, fontFace, fontScale, chunkSize, wpm, readFootnotes])

  // Akıllı Okuma Konumu Hafızası: Duraklatıldığında veya düzenli aralıklarla son konumu kaydet
  useEffect(() => {
    if (!text || chunks.length <= 1) return
    const wordIdx = currentChunk?.startIndex ?? index

    const timer = setTimeout(
      () => {
        saveReadingProgress(
          docTitle,
          text,
          index,
          wordIdx,
          chunks.length,
          words.length,
          chunkSize,
          wpm,
        )
      },
      playing ? 2000 : 250,
    )

    return () => clearTimeout(timer)
  }, [index, playing, docTitle, text, chunks.length, words.length, chunkSize, wpm, currentChunk])

  const applyText = (next: string, title?: string) => {
    const nextTitle = title || docTitle
    setText(next)
    if (title) setDocTitle(title)
    setPlaying(false)
    setSheetOpen(false)

    // Hafızadaki son okunan konumu otomatik hatırla ve geri yükle
    const newChunks = createChunks(next, chunkSize, { enableFootnotes: readFootnotes })
    const saved = loadReadingProgress(nextTitle, next)
    if (saved && (saved.wordIndex > 0 || saved.index > 0) && newChunks.length > 0) {
      const target = findChunkIndexForWord(newChunks, saved.wordIndex ?? saved.index)
      setIndex(target)
      setResumeBadge(
        `Kaldığınız yerden devam ediliyor (%${saved.progressPercent || Math.round((target / Math.max(1, newChunks.length)) * 100)})`,
      )
      setTimeout(() => setResumeBadge(null), 3500)
    } else {
      setIndex(0)
    }
  }

  const progress = chunks.length > 1 ? index / lastIndex : 0

  return (
    <div
      data-theme={theme}
      className="app-bg relative h-dvh w-full touch-manipulation overflow-hidden font-sans text-foreground transition-colors duration-500 selection:bg-primary/25"
    >
      <TopBar
        ref={headerRef}
        docTitle={docTitle}
        fontControl={
          <FontSettings
            face={fontFace}
            scale={fontScale}
            onFaceChange={setFontFace}
            onScaleChange={setFontScale}
            chunkSize={chunkSize}
            onChunkSizeChange={handleChunkSizeChange}
            readFootnotes={readFootnotes}
            onReadFootnotesChange={handleReadFootnotesChange}
          />
        }
        theme={theme}
        onThemeChange={setTheme}
        onOpenText={() => {
          setPlaying(false)
          setSheetOpen(true)
        }}
        hidden={zen}
      />

      <main
        className="absolute inset-0 flex items-center justify-center overflow-hidden px-4 transition-[padding] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] sm:px-8"
        style={{
          paddingTop: zen ? 0 : headerHeight,
          paddingBottom: zen ? 0 : dockHeight,
        }}
      >
        <div className="relative flex max-h-full w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl flex-col py-3 transition-[max-width] duration-300">
          <RsvpDisplay
            word={currentChunk?.text ?? ''}
            chunk={currentChunk}
            chunkSize={chunkSize}
            playing={playing}
            onToggle={togglePlay}
            wpm={wpm}
            fontScale={fontScale}
            maxSide={maxSide}
            fontFamily={FONT_FACES.find((f) => f.id === fontFace)?.family}
          />
          <ContextPeek
            words={words}
            index={currentChunk?.startIndex ?? index}
            visible={!zen && words.length > 0}
            onJump={(wordIdx) => {
              // Kelime indeksine en yakın chunk indeksini bul
              const targetChunkIdx = chunks.findIndex(
                (c, cIdx) =>
                  wordIdx >= c.startIndex &&
                  (cIdx === chunks.length - 1 || wordIdx < chunks[cIdx + 1].startIndex),
              )
              if (targetChunkIdx !== -1) {
                seek(targetChunkIdx)
              } else {
                seek(Math.min(wordIdx, lastIndex))
              }
            }}
          />
        </div>
      </main>

      <ControlDock
        ref={dockRef}
        hidden={zen}
        index={index}
        total={chunks.length}
        wpm={wpm}
        playing={playing}
        chunkSize={chunkSize}
        onToggle={togglePlay}
        onSeek={seek}
        onWpmChange={changeWpm}
      />

      {/* İlerleme Çubuğu */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none fixed inset-x-0 top-0 z-40 h-0.5 transition-opacity duration-500',
          zen ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div
          className="h-full bg-primary transition-[width] duration-200 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Chunk Değişimi veya Kaldığı Yerden Devam Bildirim Rozeti */}
      {(resumeBadge || chunkBadge) && (
        <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in zoom-in-95 duration-200">
          <span className="panel px-3.5 py-1.5 text-xs font-mono font-medium text-foreground shadow-lg backdrop-blur-md rounded-full bg-background/90 border border-border/60">
            {resumeBadge || chunkBadge}
          </span>
        </div>
      )}

      {zen && (
        <button
          type="button"
          onClick={togglePlay}
          className="fixed inset-0 z-20 cursor-default"
          aria-label="Okumayı duraklat"
        />
      )}



      <TextSheet
        open={sheetOpen}
        initialText={text}
        onClose={() => setSheetOpen(false)}
        onApply={applyText}
      />
    </div>
  )
}
