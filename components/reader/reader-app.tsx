'use client'

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { Gauge } from 'lucide-react'
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
  calculateWordDelay,
  chunkDelay,
  findPreviousSentenceIndex,
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

  // 3. KURAL: Yumuşak Kalkış (Ramp-Up / Warm-up) sayacı
  const rampStepRef = useRef(0)

  // 1 & 2. KURAL: Dynamic WPM Pacing Engine (Dinamik Zamanlayıcı Döngüsü)
  useEffect(() => {
    if (!playing || chunks.length === 0) {
      rampStepRef.current = 0
      return
    }

    const currentItem = chunks[index]
    if (!currentItem) return

    // Yumuşak Kalkış (Ramp-Up): İlk 5 kelimede hedef hızın %60'ından başlayıp %100'e kademeli çıkış
    const currentRamp = rampStepRef.current
    const speedFactor = currentRamp < 5 ? 0.6 + 0.4 * (currentRamp / 4) : 1.0
    const effectiveWpm = Math.max(MIN_WPM, Math.round(wpm * speedFactor))

    // Her kelimenin uzunluğuna, harf yapısına ve noktalamasına göre gecikmeyi dinamik hesapla
    const delay = calculateWordDelay(currentItem, effectiveWpm, {
      isParagraphEnd: currentItem.isParagraphEnd,
    })

    const timer = setTimeout(() => {
      rampStepRef.current = currentRamp + 1
      if (index >= lastIndex) {
        setPlaying(false)
        rampStepRef.current = 0
      } else {
        setIndex((i) => i + 1)
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [playing, index, wpm, chunks, lastIndex])

  const togglePlay = useCallback(() => {
    if (chunks.length === 0) return
    setPlaying((p) => {
      rampStepRef.current = 0
      if (!p && index >= lastIndex) setIndex(0)
      return !p
    })
  }, [chunks.length, index, lastIndex])

  const seek = useCallback(
    (next: number) => {
      rampStepRef.current = 0
      setIndex(Math.min(lastIndex, Math.max(0, next)))
    },
    [lastIndex],
  )

  // 1 & 2. KURAL: Akıllı Cümle Başı Parlama (Pulse / Jump) Animasyonu
  const [isPulsing, setIsPulsing] = useState(false)
  const pulseTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pulseRafRef = useRef<number | null>(null)

  const triggerPulse = useCallback(() => {
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
    if (pulseRafRef.current) cancelAnimationFrame(pulseRafRef.current)

    // Hızlı ardışık geri sarmalarda animasyonun baştan oynamasını garantiye al
    setIsPulsing(false)
    pulseRafRef.current = requestAnimationFrame(() => {
      setIsPulsing(true)
      pulseTimerRef.current = setTimeout(() => {
        setIsPulsing(false)
      }, 400) // 400ms parlama animasyonu
    })
  }, [])

  // 1, 2 & 3. KURAL: Akıllı Cümle Başı Geri Sarma (Sentence-Boundary Rewind)
  // Sadece 1 kelime yerine tam önceki cümlenin ilk kelimesine zıplar.
  // Kullanıcı zaten cümlenin başındaysa veya ilk 3 kelimesindeyse daha da önceki cümlenin başına zıplar.
  const handleSmartRewind = useCallback(() => {
    if (chunks.length === 0) return
    rampStepRef.current = 0
    const targetIndex = findPreviousSentenceIndex(chunks, index, 3)
    setIndex(targetIndex)
    triggerPulse()
  }, [chunks, index, triggerPulse])

  const jumpToPreviousSentence = handleSmartRewind

  // 1, 2 & 3. KURAL: Canlı WPM Toast HUD ve Zamanlayıcı Mantığı
  const [wpmToastVisible, setWpmToastVisible] = useState(false)
  const [wpmToastFading, setWpmToastFading] = useState(false)
  const wpmToastTimerRef = useRef<NodeJS.Timeout | null>(null)

  const showWpmToast = useCallback(() => {
    if (wpmToastTimerRef.current) clearTimeout(wpmToastTimerRef.current)
    setWpmToastFading(false)
    setWpmToastVisible(true)
  }, [])

  const hideWpmToastWithFade = useCallback((delayMs = 1000) => {
    if (wpmToastTimerRef.current) clearTimeout(wpmToastTimerRef.current)
    wpmToastTimerRef.current = setTimeout(() => {
      setWpmToastFading(true)
      wpmToastTimerRef.current = setTimeout(() => {
        setWpmToastVisible(false)
        setWpmToastFading(false)
      }, 300) // 300ms yumuşak fade-out animasyonu
    }, delayMs)
  }, [])

  // Canlı sürükleme (touch drag) sırasında WPM'i sınırları koruyarak anında güncelle
  const setWpmDirect = useCallback(
    (newWpm: number) => {
      const clamped = Math.min(MAX_WPM, Math.max(MIN_WPM, newWpm))
      setWpm(clamped)
      showWpmToast()
    },
    [showWpmToast],
  )

  // Klavye ok tuşları ve mouse wheel için kademeli değişim
  const changeWpm = useCallback(
    (delta: number) => {
      setWpm((prev) => Math.min(MAX_WPM, Math.max(MIN_WPM, prev + delta)))
      showWpmToast()
      hideWpmToastWithFade(1000)
    },
    [showWpmToast, hideWpmToastWithFade],
  )

  // Zen / Okuma Sırasında Tam Ekran Dokunma ve 25px Eşikli Kaydırma Jesti
  const zenTouchStateRef = useRef<{
    startY: number
    startX: number
    startWpm: number
    isSwiping: boolean
    hasSwiped: boolean
  } | null>(null)

  const zenOverlayRef = useRef<HTMLDivElement | null>(null)

  const handleZenTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    zenTouchStateRef.current = {
      startY: touch.clientY,
      startX: touch.clientX,
      startWpm: wpm,
      isSwiping: false,
      hasSwiped: false,
    }
  }

  const handleZenTouchMove = (e: React.TouchEvent) => {
    if (!zenTouchStateRef.current || e.touches.length !== 1) return
    const touch = e.touches[0]
    const deltaY = touch.clientY - zenTouchStateRef.current.startY
    const deltaX = touch.clientX - zenTouchStateRef.current.startX

    // İlk dikey hareket eşiği (8px)
    if (!zenTouchStateRef.current.isSwiping && Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
      zenTouchStateRef.current.isSwiping = true
      zenTouchStateRef.current.hasSwiped = true
    }

    if (zenTouchStateRef.current.isSwiping) {
      if (e.cancelable) {
        e.preventDefault()
      }
      // 1. KURAL: Parmağın dikey eksendeki her 25 pikseli (deltaY) = 1 kademe (25 WPM)
      // Yukarı kaydırma (deltaY negatif) -> WPM artar
      // Aşağı kaydırma (deltaY pozitif) -> WPM azalır
      const pixelDistance = -deltaY
      const steps = Math.trunc(pixelDistance / 25)
      const targetWpm = zenTouchStateRef.current.startWpm + steps * WPM_STEP

      // 2. KURAL: Hız sınırları (100 - 1000 WPM)
      // 3. KURAL: Sürüklerken anlık canlı güncelleme
      setWpmDirect(targetWpm)
    }
  }

  // Mobil Chrome'da aşağı kaydırma (swipe down) sırasında tarayıcının pull-to-refresh
  // yenileme animasyonunu %100 engelleyen native pasif-olmayan touchmove dinleyicisi
  useEffect(() => {
    const el = zenOverlayRef.current
    if (!el) return

    const onNativeTouchMove = (e: TouchEvent) => {
      if (!zenTouchStateRef.current || e.touches.length !== 1) return
      const touch = e.touches[0]
      const deltaY = touch.clientY - zenTouchStateRef.current.startY
      const deltaX = touch.clientX - zenTouchStateRef.current.startX

      if (!zenTouchStateRef.current.isSwiping && Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
        zenTouchStateRef.current.isSwiping = true
        zenTouchStateRef.current.hasSwiped = true
      }

      if (zenTouchStateRef.current.isSwiping) {
        if (e.cancelable) {
          e.preventDefault()
        }
        const pixelDistance = -deltaY
        const steps = Math.trunc(pixelDistance / 25)
        const targetWpm = zenTouchStateRef.current.startWpm + steps * WPM_STEP
        setWpmDirect(targetWpm)
      }
    }

    el.addEventListener('touchmove', onNativeTouchMove, { passive: false })
    return () => {
      el.removeEventListener('touchmove', onNativeTouchMove)
    }
  }, [setWpmDirect, zen])

  const handleZenTouchEnd = () => {
    if (!zenTouchStateRef.current) return
    const wasSwiping = zenTouchStateRef.current.hasSwiped
    zenTouchStateRef.current = null

    if (wasSwiping) {
      // 3. KURAL: Parmağı çektiğinde 1 saniye sonra yumuşak fade-out
      hideWpmToastWithFade(1000)
    }
  }

  const handleZenClick = (action: () => void) => {
    if (zenTouchStateRef.current?.hasSwiped) {
      return
    }
    action()
  }

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
        if (e.shiftKey) {
          seek(index - 10)
        } else {
          handleSmartRewind()
        }
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
    return () => {
      window.removeEventListener('keydown', handler)
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
      if (pulseRafRef.current) cancelAnimationFrame(pulseRafRef.current)
    }
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
      className="app-bg relative h-dvh w-full touch-none overscroll-none select-none overflow-hidden font-sans text-foreground transition-colors duration-500 selection:bg-primary/25"
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
            isPulsing={isPulsing}
            onToggle={togglePlay}
            onPrev={handleSmartRewind}
            onNext={() => seek(index + 1)}
            onWpmChange={changeWpm}
            onWpmSet={setWpmDirect}
            onWpmDragEnd={() => hideWpmToastWithFade(1000)}
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

      {/* 3. KURAL: Canlı WPM Toast HUD (Dikey kaydırma sırasında canlı, touchend sonrasında 1 sn fade-out) */}
      {wpmToastVisible && (
        <div
          className={cn(
            'pointer-events-none fixed top-7 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out select-none',
            wpmToastFading ? 'opacity-0 scale-95 -translate-y-1' : 'opacity-100 scale-100 translate-y-0',
          )}
        >
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/85 px-4 py-1.5 font-mono shadow-2xl backdrop-blur-md">
            <Gauge className="size-3.5 text-primary" />
            <span className="text-base font-bold tabular-nums text-foreground tracking-tight">{wpm}</span>
            <span className="text-xs font-normal text-muted-foreground">k/dk</span>
            {wpm <= MIN_WPM && (
              <span className="text-[10px] uppercase font-semibold text-amber-500/90 ml-0.5">Min</span>
            )}
            {wpm >= MAX_WPM && (
              <span className="text-[10px] uppercase font-semibold text-amber-500/90 ml-0.5">Max</span>
            )}
          </div>
        </div>
      )}

      {/* 3. KURAL: Sıfır Dağınıklık - Okuma Sırasında Tam Ekran Dokunma ve Jest Katmanı */}
      {zen && (
        <div
          ref={zenOverlayRef}
          onTouchStart={handleZenTouchStart}
          onTouchMove={handleZenTouchMove}
          onTouchEnd={handleZenTouchEnd}
          className="fixed inset-0 z-20 flex select-none pointer-events-auto touch-none overscroll-none"
        >
          {/* Sol %25: Akıllı cümle başı geri sar */}
          <button
            type="button"
            aria-label="Önceki cümle başına sar"
            className="h-full w-1/4 cursor-pointer outline-none active:bg-foreground/[0.02] touch-none"
            onClick={(e) => {
              e.stopPropagation()
              handleZenClick(handleSmartRewind)
            }}
          />

          {/* Orta %50: Durdur */}
          <button
            type="button"
            aria-label="Okumayı duraklat"
            className="h-full w-1/2 cursor-pointer outline-none active:bg-foreground/[0.02] touch-none"
            onClick={(e) => {
              e.stopPropagation()
              handleZenClick(togglePlay)
            }}
          />

          {/* Sağ %25: 1 kelime ileri sar */}
          <button
            type="button"
            aria-label="1 kelime ileri sar"
            className="h-full w-1/4 cursor-pointer outline-none active:bg-foreground/[0.02] touch-none"
            onClick={(e) => {
              e.stopPropagation()
              handleZenClick(() => seek(index + 1))
            }}
          />
        </div>
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
