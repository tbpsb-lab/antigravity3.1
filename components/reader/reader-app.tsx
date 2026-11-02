'use client'

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { Gauge, X, Zap } from 'lucide-react'
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
  findNextSentenceIndex,
  findCurrentSentenceStartIndex,
  formatRemaining,
} from '@/lib/rsvp'
import {
  saveReadingProgress,
  loadReadingProgress,
  loadLastActiveDoc,
  findChunkIndexForWord,
} from '@/lib/reading-progress'
import { loadReaderSettings, saveReaderSettings } from '@/lib/reader-settings'
import { AmbientAura } from './ambient-aura'
import { TopBar } from './top-bar'
import { RsvpDisplay } from './rsvp-display'
import { ContextPeek } from './context-peek'
import { TextSheet } from './text-sheet'
import { SpeedTestModal } from './speed-test-modal'
import { CompletionModal } from './completion-modal'
import { AboutModal } from './about-modal'
import { PaperCornerCurl } from './paper-corner-curl'
import { FONT_FACES, FontSettings, type FontFace } from './font-settings'
import { triggerHaptic } from '@/lib/haptics'
import { useElementHeight } from '@/lib/use-element-height'
import { useWakeLock } from '@/lib/use-wake-lock'

export function ReaderApp() {
  const [theme, setTheme] = useState<ThemeId>('ios')
  const [fontFace, setFontFace] = useState<FontFace>('theme')
  const [fontScale, setFontScale] = useState(1)
  const [chunkSize, setChunkSize] = useState<number>(1)
  const [readFootnotes, setReadFootnotes] = useState<boolean>(true)
  const [chunkBadge, setChunkBadge] = useState<string | null>(null)
  const [resumeBadge, setResumeBadge] = useState<string | null>(null)

  const [headerRef, headerHeight] = useElementHeight<HTMLElement>()
  const [text, setText] = useState(SAMPLE_TEXT)
  const [docTitle, setDocTitle] = useState('odak')
  const [index, setIndex] = useState(0)
  const [wpm, setWpm] = useState(300)
  const [playing, setPlaying] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [speedTestOpen, setSpeedTestOpen] = useState(false)
  const [completionOpen, setCompletionOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [showSpeedTestBanner, setShowSpeedTestBanner] = useState(false)

  // ~500 Kelimelik Doğal Nefes / Dinlenme Aralığı Durumu
  const [isResting, setIsResting] = useState(false)
  const wordsReadSinceRestRef = useRef(0)

  // Okuma Oturumu Süre Sayacı
  const sessionStartTimeRef = useRef<number | null>(null)
  const sessionElapsedSecsRef = useRef(0)

  // İlk giriş kontrolü: Daha önce hız testi yapılmamış veya kapatılmamışsa davet butonunu göster
  useEffect(() => {
    try {
      const isCompleted = localStorage.getItem('odak_speed_test_completed')
      const isDismissed = localStorage.getItem('odak_speed_test_dismissed')
      if (!isCompleted && !isDismissed) {
        setShowSpeedTestBanner(true)
      }
    } catch {}
  }, [])

  const dismissSpeedTestBanner = useCallback(() => {
    setShowSpeedTestBanner(false)
    try {
      localStorage.setItem('odak_speed_test_dismissed', 'true')
    } catch {}
  }, [])

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

  // Ekran Kilidi / Kararmasını Önleme (Okuma sırasında ekranın uykusunu engeller)
  useWakeLock(zen)

  // 3. KURAL: Yumuşak Kalkış (Ramp-Up / Warm-up) sayacı
  const rampStepRef = useRef(0)

  // Okuma Oturumu Süre Takibi (Başarı kartı ve istatistikler için)
  useEffect(() => {
    if (playing) {
      if (sessionStartTimeRef.current === null) {
        sessionStartTimeRef.current = Date.now()
      }
    } else {
      if (sessionStartTimeRef.current !== null) {
        sessionElapsedSecsRef.current += Math.round((Date.now() - sessionStartTimeRef.current) / 1000)
        sessionStartTimeRef.current = null
      }
    }
  }, [playing])

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
    let delay = calculateWordDelay(currentItem, effectiveWpm, {
      isParagraphEnd: currentItem.isParagraphEnd,
    })

    // ~500 Kelimede Bir 0.5 Sn Doğal "Nefes" Aralığı (Micro-Rest Pause)
    // 450+ kelimede karşılaşılan ilk cümle veya paragraf bitişinde 500ms doğal dinlenme molası
    const wordCountInChunk = currentItem.words?.length || 1
    const accumulated = wordsReadSinceRestRef.current + wordCountInChunk
    wordsReadSinceRestRef.current = accumulated

    const isSentenceBoundary =
      currentItem.isSentenceEnd ||
      currentItem.isParagraphEnd ||
      /[.!?]$/.test(currentItem.text.trim())

    let restTriggered = false
    if (accumulated >= 450 && isSentenceBoundary) {
      wordsReadSinceRestRef.current = 0
      restTriggered = true
      setIsResting(true)
      delay += 500
    }

    const timer = setTimeout(() => {
      if (restTriggered) {
        setIsResting(false)
      }
      rampStepRef.current = currentRamp + 1
      if (index >= lastIndex) {
        setPlaying(false)
        rampStepRef.current = 0
        if (sessionStartTimeRef.current !== null) {
          sessionElapsedSecsRef.current += Math.round((Date.now() - sessionStartTimeRef.current) / 1000)
          sessionStartTimeRef.current = null
        }
        setCompletionOpen(true)
        triggerHaptic('success')
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

  // Tam Ekran Yönetimi (Standart Fullscreen API - Cihaz yönünü zorlamadan doğal esneklik)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const resetViewportScroll = () => {
      window.scrollTo(0, 0)
      if (document.body) {
        document.body.scrollLeft = 0
        document.body.scrollTop = 0
        document.body.style.width = '100vw'
        document.body.style.maxWidth = '100vw'
        document.body.style.height = '100dvh'
      }
      if (document.documentElement) {
        document.documentElement.scrollLeft = 0
        document.documentElement.scrollTop = 0
        document.documentElement.style.width = '100vw'
        document.documentElement.style.maxWidth = '100vw'
        document.documentElement.style.height = '100dvh'
      }
      window.dispatchEvent(new Event('resize'))
    }

    const scheduleViewportResets = () => {
      resetViewportScroll()
      const t1 = setTimeout(resetViewportScroll, 60)
      const t2 = setTimeout(resetViewportScroll, 200)
      const t3 = setTimeout(resetViewportScroll, 450)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
      }
    }

    const handleFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement)
      setIsFullscreen(isFs)
      scheduleViewportResets()
    }

    const handleOrientationChange = () => {
      // Tablet/mobil dikey-yatay döndürüldüğünde Safari/WebKit ekran kaymasını tamamen önle
      scheduleViewportResets()
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    window.addEventListener('orientationchange', handleOrientationChange)
    window.addEventListener('resize', resetViewportScroll)
    window.visualViewport?.addEventListener('resize', resetViewportScroll)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      window.removeEventListener('orientationchange', handleOrientationChange)
      window.removeEventListener('resize', resetViewportScroll)
      window.visualViewport?.removeEventListener('resize', resetViewportScroll)
    }
  }, [])

  const toggleFullscreen = useCallback(async () => {
    try {
      const doc = document as any
      const isFs = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement)
      if (!isFs) {
        const el = document.documentElement as any
        if (el.requestFullscreen) {
          await el.requestFullscreen()
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen()
        }
      } else {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen()
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen()
        }
      }
    } catch (err) {
      console.warn('Tam ekran geçiş hatası:', err)
    }
  }, [])

  // Mobil Ekran Kilidi (Screen Lock / Sleep) ve Sekme Değişimi Algılama:
  // Okuma esnasında ekran kilitlenirse arka planda devam etmeyip otomatik duraklar;
  // ekran kilidi açıldığında yarım saniye (500ms) bekler ve kaldığı cümlenin başından başlar.
  const wasPlayingBeforeLockRef = useRef(false)
  const lockedIndexRef = useRef(0)
  const indexRef = useRef(index)
  indexRef.current = index
  const chunksRef = useRef(chunks)
  chunksRef.current = chunks

  useEffect(() => {
    let unlockTimer: NodeJS.Timeout | null = null

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        if (playing) {
          wasPlayingBeforeLockRef.current = true
          lockedIndexRef.current = indexRef.current
          setPlaying(false)
        }
      } else if (document.visibilityState === 'visible') {
        if (wasPlayingBeforeLockRef.current) {
          wasPlayingBeforeLockRef.current = false
          // Ekran kilidi açıldığında kaldığı cümlenin ilk kelimesine geri sar
          const startIdx = findCurrentSentenceStartIndex(chunksRef.current, lockedIndexRef.current)
          rampStepRef.current = 0
          setIndex(startIdx)
          triggerPulse()

          // Yarım saniye (500ms) bekledikten sonra akıcı şekilde okumaya devam et
          if (unlockTimer) clearTimeout(unlockTimer)
          unlockTimer = setTimeout(() => {
            setPlaying(true)
          }, 500)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (unlockTimer) clearTimeout(unlockTimer)
    }
  }, [playing, triggerPulse])

  // 1, 2 & 3. KURAL: Akıllı Cümle Başı Geri Sarma (Sentence-Boundary Rewind)
  // Sadece 1 kelime yerine tam önceki cümlenin ilk kelimesine zıplar.
  // Kullanıcı zaten cümlenin başındaysa veya ilk 3 kelimesindeyse daha da önceki cümlenin başına zıplar.
  const handleSmartRewind = useCallback(() => {
    if (chunks.length === 0) return
    rampStepRef.current = 0
    const targetIndex = findPreviousSentenceIndex(chunks, index, 3)
    setIndex(targetIndex)
    triggerPulse()
    triggerHaptic('jump')
  }, [chunks, index, triggerPulse])

  const handleSmartForward = useCallback(() => {
    if (chunks.length === 0) return
    rampStepRef.current = 0
    const targetIndex = findNextSentenceIndex(chunks, index)
    setIndex(targetIndex)
    triggerPulse()
    triggerHaptic('jump')
  }, [chunks, index, triggerPulse])

  const cycleChunkSize = useCallback(() => {
    setChunkSize((prev) => (prev >= 3 ? 1 : prev + 1))
    triggerHaptic('tap')
  }, [])

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

  const handleApplySpeedTest = useCallback(
    (newWpm: number) => {
      setWpmDirect(newWpm)
      setShowSpeedTestBanner(false)
      hideWpmToastWithFade(1500)
    },
    [setWpmDirect, hideWpmToastWithFade],
  )

  // Esnek Bağlam Penceresi ve Sayfalama (Görünen kelime adedi ve alttaki <> buton adımı)
  const [contextPageSize, setContextPageSize] = useState(24)

  const handleStepPrev = useCallback(() => {
    rampStepRef.current = 0
    const currentWordIdx = currentChunk?.startIndex ?? 0
    const pageSize = Math.max(1, contextPageSize)
    const pageIdx = Math.floor(currentWordIdx / pageSize)
    const targetWordIdx = Math.max(0, (pageIdx - 1) * pageSize)
    const targetChunkIdx = chunks.findIndex(
      (c, cIdx) =>
        targetWordIdx >= c.startIndex &&
        (cIdx === chunks.length - 1 || targetWordIdx < chunks[cIdx + 1].startIndex),
    )
    if (targetChunkIdx !== -1) {
      seek(targetChunkIdx)
    } else {
      seek(Math.max(0, targetWordIdx))
    }
  }, [currentChunk, contextPageSize, chunks, seek])

  const handleStepNext = useCallback(() => {
    rampStepRef.current = 0
    const currentWordIdx = currentChunk?.startIndex ?? 0
    const pageSize = Math.max(1, contextPageSize)
    const pageIdx = Math.floor(currentWordIdx / pageSize)
    const targetWordIdx = Math.min(words.length - 1, (pageIdx + 1) * pageSize)
    const targetChunkIdx = chunks.findIndex(
      (c, cIdx) =>
        targetWordIdx >= c.startIndex &&
        (cIdx === chunks.length - 1 || targetWordIdx < chunks[cIdx + 1].startIndex),
    )
    if (targetChunkIdx !== -1) {
      seek(targetChunkIdx)
    } else {
      seek(Math.min(lastIndex, targetWordIdx))
    }
  }, [currentChunk, contextPageSize, words.length, chunks, lastIndex, seek])

  // Klavye ok tuşları ve mouse wheel için kademeli değişim
  const changeWpm = useCallback(
    (delta: number) => {
      setWpm((prev) => Math.min(MAX_WPM, Math.max(MIN_WPM, prev + delta)))
      showWpmToast()
      hideWpmToastWithFade(1000)
      triggerHaptic('step')
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
  const zenLastHapticStepRef = useRef<number>(0)

  const zenOverlayRef = useRef<HTMLDivElement | null>(null)

  const handleZenTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    zenLastHapticStepRef.current = 0
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
      if (steps !== zenLastHapticStepRef.current) {
        zenLastHapticStepRef.current = steps
        triggerHaptic('step')
      }
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

  // Farenin scroll tekeriyle (mouse wheel) okuma hızı kontrolü:
  // Hem duraklatıldığında hem okuma akarken TEK VE MERKEZİ kaynaktan tam 25 WPM'lik adımlarla artırıp azaltır.
  useEffect(() => {
    let lastWheelTime = 0

    const handleGlobalWheel = (e: WheelEvent) => {
      // Metin tablosu / modal açıkken veya form alanındayken hızı değiştirme
      if (sheetOpen) return
      const target = e.target as HTMLElement | null
      const activeTag = document.activeElement?.tagName
      if (
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA' ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.closest?.('input, textarea, [role="dialog"], [role="menu"]')
      ) {
        return
      }

      // Çok küçük titreşim veya sıfır delta'ları yoksay
      if (Math.abs(e.deltaY) < 4) return

      // Fare teker çentiklerinde art arda birden fazla event fırlamasını önleyen hafif zaman eşiği
      const now = performance.now()
      if (now - lastWheelTime < 60) return
      lastWheelTime = now

      if (e.cancelable) {
        e.preventDefault()
      }
      changeWpm(e.deltaY < 0 ? WPM_STEP : -WPM_STEP)
    }

    window.addEventListener('wheel', handleGlobalWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', handleGlobalWheel)
    }
  }, [changeWpm, sheetOpen])

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

  // Tema değiştiğinde yazı tipini o temanın özgün yazı tipine (Tema / var(--reader-font)) uyarla
  const handleThemeChange = useCallback((newTheme: ThemeId) => {
    setTheme(newTheme)
    setFontFace('theme')
  }, [])

  // HTML ve body'e data-theme senkronizasyonu (Tüm sitede scrollbar ve temaların kusursuz işlemesi için)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
      document.body.setAttribute('data-theme', theme)
    }
  }, [theme])

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
          handleStepPrev()
        } else {
          handleSmartRewind()
        }
        break
      case 'ArrowRight':
        e.preventDefault()
        if (e.shiftKey) {
          handleStepNext()
        } else {
          handleSmartForward()
        }
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
        cycleChunkSize()
        break
      case 'KeyF':
        e.preventDefault()
        toggleFullscreen()
        break
      case 'Digit1':
      case 'Digit2':
      case 'Digit3': {
        const targetTheme = THEMES[Number(e.key) - 1]?.id
        if (targetTheme) {
          handleThemeChange(targetTheme)
        }
        break
      }
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
    setCompletionOpen(false)
    wordsReadSinceRestRef.current = 0
    sessionElapsedSecsRef.current = 0
    sessionStartTimeRef.current = null

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
      className="app-bg relative h-dvh w-full touch-manipulation overscroll-none overflow-hidden font-sans text-foreground transition-colors duration-500 selection:bg-primary/25"
    >
      {/* 3. Öneri: Ambient Aura / Tematik Işıma Katmanı (Yazısız & Çizgisiz Atmosferik Derinlik) */}
      <AmbientAura theme={theme} playing={playing} />

      <TopBar
        ref={headerRef}
        docTitle={docTitle}
        fontControl={
          <FontSettings
            theme={theme}
            onThemeChange={handleThemeChange}
            face={fontFace}
            scale={fontScale}
            onFaceChange={setFontFace}
            onScaleChange={setFontScale}
            chunkSize={chunkSize}
            onChunkSizeChange={handleChunkSizeChange}
            readFootnotes={readFootnotes}
            onReadFootnotesChange={handleReadFootnotesChange}
            onOpenSpeedTest={() => {
              setPlaying(false)
              setSpeedTestOpen(true)
            }}
          />
        }
        theme={theme}
        onOpenText={() => {
          setPlaying(false)
          setSheetOpen(true)
        }}
        onOpenAbout={() => {
          setPlaying(false)
          setAboutOpen(true)
        }}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        hidden={zen}
      />

      <main
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-4 transition-[padding] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] sm:px-8 landscape-short:px-3',
          zen ? 'pb-0' : 'pb-5 landscape-short:pb-1.5',
        )}
        style={{
          paddingTop: zen ? 0 : headerHeight,
        }}
      >
        <div className="relative flex h-full w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl flex-col items-center justify-between py-1 sm:py-2 landscape-short:py-0.5 transition-[max-width] duration-300 min-h-0">
          {/* Üst Dengeleyici: Temiz, ferah ve nefes alan negatif alan (Apple & Minimalist mimari) */}
          <div className="flex-1 w-full min-h-0 pointer-events-none select-none" />

          {/* Okuma Penceresi: Ekranın tam ortasında sabit, temiz ve ferah */}
          <div className="w-full shrink-0 flex flex-col items-center">
            {/* İlk Giriş Hız Testi Davet Şeridi (Sade, kısa, şimşeksiz ve sakin) */}
            {showSpeedTestBanner && !zen && (
              <div className="mb-2 sm:mb-2.5 flex w-full max-w-xs items-center justify-between gap-2 rounded-full border border-border/50 bg-background/50 px-3 py-1 shadow-2xs backdrop-blur-sm animate-in fade-in slide-in-from-top-1 duration-300">
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false)
                    setSpeedTestOpen(true)
                  }}
                  className="flex flex-1 min-w-0 items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left"
                >
                  <span>Okuma hızını belirle</span>
                  <span className="text-[11px] font-medium text-foreground/75 hover:text-foreground underline underline-offset-2 ml-2">
                    Başla →
                  </span>
                </button>
                <button
                  type="button"
                  onClick={dismissSpeedTestBanner}
                  className="ctl size-5 shrink-0 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Kapat"
                  title="Kapat"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}

            <RsvpDisplay
              word={currentChunk?.text ?? ''}
              chunk={currentChunk}
              chunkSize={chunkSize}
              playing={playing}
              isPulsing={isPulsing}
              onToggle={togglePlay}
              onPrev={handleSmartRewind}
              onNext={handleSmartForward}
              onSeek={seek}
              index={index}
              total={chunks.length}
              isResting={isResting}
              onWpmChange={changeWpm}
              onWpmSet={setWpmDirect}
              onWpmDragEnd={() => hideWpmToastWithFade(1000)}
              onCycleChunkSize={cycleChunkSize}
              wpm={wpm}
              fontScale={fontScale}
              maxSide={maxSide}
              fontFamily={FONT_FACES.find((f) => f.id === fontFace)?.family}
            />
          </div>

          {/* Alt Zarif Bağlam Şeridi: Ortalanmış okuma kutusunun altında hafif, ferah ve kompakt şerit (tüm cihazlarda kesintisiz 3 satır) */}
          <div className="context-peek-box w-full max-w-3xl shrink-0 mt-1 sm:mt-1.5 landscape-short:mt-0.5 min-h-[76px] sm:min-h-[90px] md:min-h-[110px] max-h-[94px] sm:max-h-[112px] md:max-h-[132px] landscape-short:min-h-[72px] landscape-short:max-h-[84px] flex flex-col overflow-hidden">
            <ContextPeek
              words={words}
              index={currentChunk?.startIndex ?? index}
              chunkSize={chunkSize}
              visible={!zen && words.length > 0}
              remainingTime={`${formatRemaining(chunks.length - index - 1, wpm, chunkSize)} kaldı`}
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
              onVisibleCountChange={setContextPageSize}
              onStepPrev={handleStepPrev}
              onStepNext={handleStepNext}
              hasPrev={index > 0}
              hasNext={index < lastIndex}
            />
          </div>

          {/* Alt Dengeleyici: Sayfa altını dengeleyip okuma penceresini doğal optik merkezde tutar */}
          <div className="flex-1 w-full min-h-0 pointer-events-none select-none" />
        </div>
      </main>

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

          {/* Sağ %25: Sonraki cümle başına atla */}
          <button
            type="button"
            aria-label="Sonraki cümle başına atla"
            className="h-full w-1/4 cursor-pointer outline-none active:bg-foreground/[0.02] touch-none"
            onClick={(e) => {
              e.stopPropagation()
              handleZenClick(handleSmartForward)
            }}
          />
        </div>
      )}



      {/* Kağıt Temasına Özel Sağ Alt Köşe Sayfa Kıvrımı (Bağlam metnini etkilemez) */}
      <PaperCornerCurl visible={theme === 'kindle'} />

      <TextSheet
        open={sheetOpen}
        initialText={text}
        onClose={() => setSheetOpen(false)}
        onApply={applyText}
      />

      <SpeedTestModal
        open={speedTestOpen}
        onClose={() => setSpeedTestOpen(false)}
        onApplySpeed={handleApplySpeedTest}
      />

      <CompletionModal
        open={completionOpen}
        wordCount={words.length}
        wpm={wpm}
        elapsedSeconds={sessionElapsedSecsRef.current}
        onClose={() => setCompletionOpen(false)}
        onRestart={() => {
          seek(0)
          setPlaying(true)
        }}
        onOpenNewText={() => {
          setCompletionOpen(false)
          setSheetOpen(true)
        }}
      />

      <AboutModal
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        theme={theme}
      />
    </div>
  )
}
