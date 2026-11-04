'use client'

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { Eye, EyeOff, Gauge, Volume2, VolumeX, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  MAX_WPM,
  MIN_WPM,
  SAMPLE_TEXT,
  THEMES,
  WPM_STEP,
  type ThemeId,
  splitAtPivot,
  createChunks,
  calculateWordDelay,
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
import { GlassCornerCurl } from './glass-corner-curl'
import { NeonCornerCurl } from './neon-corner-curl'
import { FONT_FACES, FontSettings, type FontFace } from './font-settings'
import { triggerHaptic } from '@/lib/haptics'
import { NeuroAudioEngine } from '@/lib/neuro-audio'
import { useElementHeight } from '@/lib/use-element-height'
import { useWakeLock } from '@/lib/use-wake-lock'
import { EyeTracker, type AttentionLossReason } from '@/components/EyeTracker'

export function ReaderApp() {
  const [theme, setTheme] = useState<ThemeId>('ios')
  const [fontFace, setFontFace] = useState<FontFace>('theme')
  const [fontScale, setFontScale] = useState(1)
  const [chunkSize, setChunkSize] = useState<number>(1)
  const [readFootnotes, setReadFootnotes] = useState<boolean>(true)
  const [bionicEnabled, setBionicEnabled] = useState<boolean>(true)
  const [neuroAudioEnabled, setNeuroAudioEnabled] = useState<boolean>(false)
  const [eyeTrackingEnabled, setEyeTrackingEnabled] = useState<boolean>(false)
  const [eyeTrackingStatus, setEyeTrackingStatus] = useState<
    'inactive' | 'initializing' | 'active' | 'attention-lost' | 'error'
  >('inactive')
  const [audioToast, setAudioToast] = useState<string | null>(null)
  const [, setChunkBadge] = useState<string | null>(null)
  const [, setResumeBadge] = useState<string | null>(null)

  const [headerRef, headerHeight] = useElementHeight<HTMLElement>()
  const [text, setText] = useState(SAMPLE_TEXT)
  const [docTitle, setDocTitle] = useState('Hızlı Okuma Penceresi')
  const [index, setIndex] = useState(0)
  const [wpm, setWpm] = useState(300)
  const [playing, setPlaying] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [fontOpen, setFontOpen] = useState(false)
  const [speedTestOpen, setSpeedTestOpen] = useState(false)
  const [completionOpen, setCompletionOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [showSpeedTestBanner, setShowSpeedTestBanner] = useState(false)

  const anyModalOpen = speedTestOpen || completionOpen || aboutOpen

  // ~500 Kelimelik Doğal Nefes / Dinlenme Aralığı Durumu
  const [isResting, setIsResting] = useState(false)
  const wordsReadSinceRestRef = useRef(0)

  // Okuma Oturumu Süre Sayacı
  const sessionStartTimeRef = useRef<number | null>(null)
  const sessionElapsedSecsRef = useRef(0)

  // Zamanlayıcı, Ses Motoru ve Rozet Temizlik Referansları
  const audioEngineRef = useRef<NeuroAudioEngine | null>(null)
  const audioToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chunkBadgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resumeBadgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pausedByEyeTrackerRef = useRef(false)
  const microBlinkExtraDelayRef = useRef(0)
  const prevEyeStatusRef = useRef<'inactive' | 'initializing' | 'active' | 'attention-lost' | 'error'>('inactive')

  const getAudioEngine = useCallback(() => {
    if (!audioEngineRef.current) {
      audioEngineRef.current = new NeuroAudioEngine()
    }
    return audioEngineRef.current
  }, [])

  const showAudioToast = useCallback((message: string) => {
    setAudioToast(message)
    if (audioToastTimerRef.current) clearTimeout(audioToastTimerRef.current)
    audioToastTimerRef.current = setTimeout(() => {
      setAudioToast(null)
    }, 1600)
  }, [])

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

  // Akıllı Cümle & Başlık Kırılımlı Chunking
  const chunks = useMemo(
    () => createChunks(text, chunkSize, { enableFootnotes: readFootnotes }),
    [text, chunkSize, readFootnotes],
  )

  // Kelime dizisini doğrudan aktif öbeklerden (chunks) türeterek dipnot açık/kapalı modlarında %100 indeks senkronizasyonu sağla
  const words = useMemo(() => chunks.flatMap((c) => c.words), [chunks])

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

  // 3. KURAL: Yumuşak Kalkış (Ramp-Up / Warm-up) sayacı ve Drift Telafisi
  const rampStepRef = useRef(0)
  const expectedTimestampRef = useRef<number | null>(null)
  const wpmRef = useRef(wpm)
  wpmRef.current = wpm

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

  // 1 & 2. KURAL: Drift-Compensated Dynamic WPM Pacing Engine (Hassas Delta-Time Zamanlayıcı)
  useEffect(() => {
    if (!playing || chunks.length === 0) {
      rampStepRef.current = 0
      expectedTimestampRef.current = null
      setIsResting(false)
      return
    }

    const currentItem = chunks[index]
    if (!currentItem) return

    // Yumuşak Kalkış (Ramp-Up): İlk 5 kelimede hedef hızın %60'ından başlayıp %100'e kademeli çıkış
    const currentRamp = rampStepRef.current
    const speedFactor = currentRamp < 5 ? 0.6 + 0.4 * (currentRamp / 4) : 1.0
    const effectiveWpm = Math.max(MIN_WPM, Math.round(wpmRef.current * speedFactor))

    // Her kelimenin uzunluğuna, harf yapısına ve noktalamasına göre gecikmeyi dinamik hesapla
    let delay = calculateWordDelay(currentItem, effectiveWpm, {
      isParagraphEnd: currentItem.isParagraphEnd,
    })

    // Doğal göz kırpma anında (+120ms) mikro-tolerans telafisi
    if (microBlinkExtraDelayRef.current > 0) {
      delay += microBlinkExtraDelayRef.current
      microBlinkExtraDelayRef.current = 0
    }

    // ~500 Kelimede Bir 0.5 Sn Doğal "Nefes" Aralığı (Micro-Rest Pause)
    const wordCountInChunk = currentItem.words?.length || 1
    const accumulated = wordsReadSinceRestRef.current + wordCountInChunk

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
    } else {
      wordsReadSinceRestRef.current = accumulated
    }

    const now = performance.now()
    if (expectedTimestampRef.current === null) {
      expectedTimestampRef.current = now
    }

    // Bir önceki adımdan kalan gecikme sapmasını (drift) hesapla ve telafi et
    const drift = Math.max(0, Math.min(delay * 0.6, now - expectedTimestampRef.current))
    const adjustedDelay = Math.max(16, delay - drift)
    expectedTimestampRef.current += delay

    const timer = setTimeout(() => {
      if (restTriggered) {
        setIsResting(false)
      }
      // Arka plan sekmesinde >1sn throttle oluştuysa zaman damgasını yeniden senkronize et
      const tickNow = performance.now()
      if (expectedTimestampRef.current !== null && tickNow - expectedTimestampRef.current > 1000) {
        expectedTimestampRef.current = tickNow
      }

      rampStepRef.current = currentRamp + 1
      if (index >= lastIndex) {
        setPlaying(false)
        rampStepRef.current = 0
        expectedTimestampRef.current = null
        if (sessionStartTimeRef.current !== null) {
          sessionElapsedSecsRef.current += Math.round((Date.now() - sessionStartTimeRef.current) / 1000)
          sessionStartTimeRef.current = null
        }
        setCompletionOpen(true)
        triggerHaptic('success')
      } else {
        setIndex((i) => i + 1)
      }
    }, adjustedDelay)

    return () => {
      clearTimeout(timer)
    }
  }, [playing, index, chunks, lastIndex])

  // WPM değiştiğinde zamanlayıcı referansını sıfırlayarak yeni hıza anında uyum sağla
  useEffect(() => {
    expectedTimestampRef.current = null
  }, [wpm])

  const togglePlay = useCallback(() => {
    if (chunks.length === 0) return
    const nextPlaying = !playing
    pausedByEyeTrackerRef.current = false
    rampStepRef.current = 0
    expectedTimestampRef.current = null
    if (nextPlaying && index >= lastIndex) {
      setIndex(0)
    }
    setPlaying(nextPlaying)

    // Autoplay Policy: Doğrudan kullanıcı tıklama / tuş etkileşimi içinde ses motorunu başlat veya durdur
    if (nextPlaying) {
      setSheetOpen(false)
      setFontOpen(false)
      if (neuroAudioEnabled) {
        getAudioEngine().start()
      }
    } else {
      audioEngineRef.current?.stop()
    }
  }, [chunks.length, playing, index, lastIndex, neuroAudioEnabled, getAudioEngine])

  const handleNeuroAudioChange = useCallback(
    (nextEnabled: boolean) => {
      setNeuroAudioEnabled(nextEnabled)
      triggerHaptic('tap')

      // Autoplay Policy: Doğrudan kullanıcı tıklama / tuş etkileşimi içinde AudioContext'i uyandır ve yönet
      const engine = getAudioEngine()
      if (nextEnabled) {
        engine.unlock()
        if (playing) {
          engine.start()
        }
      } else {
        engine.stop()
      }

      showAudioToast(
        nextEnabled ? '40Hz Nöro-Odak Sesi Açık' : 'Nöro-Odak Sesi Kapalı',
      )
    },
    [playing, getAudioEngine, showAudioToast],
  )

  const toggleNeuroAudio = useCallback(() => {
    handleNeuroAudioChange(!neuroAudioEnabled)
  }, [neuroAudioEnabled, handleNeuroAudioChange])

  // Okuma durduğunda (metin sonu, sekme değişimi, ESC veya modal açılışı) ses motorunu güvenle durdur
  useEffect(() => {
    if (!playing || !neuroAudioEnabled) {
      audioEngineRef.current?.stop()
    } else if (playing && neuroAudioEnabled) {
      getAudioEngine().start()
    }
  }, [playing, neuroAudioEnabled, getAudioEngine])

  // Bileşen kaldırıldığında (unmount) ses motorunu ve AudioContext'i tamamen temizle
  useEffect(() => {
    return () => {
      audioEngineRef.current?.destroy()
      audioEngineRef.current = null
      if (audioToastTimerRef.current) clearTimeout(audioToastTimerRef.current)
    }
  }, [])

  const seek = useCallback(
    (next: number) => {
      rampStepRef.current = 0
      expectedTimestampRef.current = null
      setIndex(Math.min(lastIndex, Math.max(0, next)))
    },
    [lastIndex],
  )

  // 1 & 2. KURAL: Akıllı Cümle Başı Parlama (Pulse / Jump) Animasyonu
  const [isPulsing, setIsPulsing] = useState(false)
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pulseRafRef = useRef<number | null>(null)

  const triggerPulse = useCallback(() => {
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
    if (pulseRafRef.current) cancelAnimationFrame(pulseRafRef.current)

    setIsPulsing(false)
    pulseRafRef.current = requestAnimationFrame(() => {
      setIsPulsing(true)
      pulseTimerRef.current = setTimeout(() => {
        setIsPulsing(false)
      }, 400)
    })
  }, [])

  // Göz Kırpma & Dikkat İzleme (Attention Tracking via Webcam) Yönetimi
  const handleEyeTrackingChange = useCallback(
    (nextEnabled: boolean) => {
      setEyeTrackingEnabled(nextEnabled)
      pausedByEyeTrackerRef.current = false
      triggerHaptic('tap')
      showAudioToast(
        nextEnabled ? 'Göz & Dikkat İzleme: Kamera Başlatılıyor...' : 'Göz & Dikkat İzleme: Kapalı',
      )
    },
    [showAudioToast],
  )

  const handleEyeTrackingStatusChange = useCallback(
    (nextStatus: 'inactive' | 'initializing' | 'active' | 'attention-lost' | 'error') => {
      const prev = prevEyeStatusRef.current
      prevEyeStatusRef.current = nextStatus
      setEyeTrackingStatus(nextStatus)
      if (prev === 'initializing' && nextStatus === 'active') {
        showAudioToast('Göz & Dikkat İzleme: Aktif')
      }
    },
    [showAudioToast],
  )

  const handleBlinkOrLookAway = useCallback(
    (reason: AttentionLossReason) => {
      if (!playing) return
      pausedByEyeTrackerRef.current = true
      setPlaying(false)
      const startIdx = findCurrentSentenceStartIndex(chunksRef.current, indexRef.current)
      rampStepRef.current = 0
      expectedTimestampRef.current = null
      setIndex(startIdx)
      triggerPulse()
      showAudioToast(
        reason === 'no-face'
          ? 'Ekrandan uzaklaşıldı — Okuma duraklatıldı'
          : 'Göz kapandı — Okuma duraklatıldı',
      )
    },
    [playing, triggerPulse, showAudioToast],
  )

  const handleAttentionRestored = useCallback(() => {
    if (!pausedByEyeTrackerRef.current) return
    pausedByEyeTrackerRef.current = false
    if (anyModalOpen || sheetOpen) return
    rampStepRef.current = 0
    expectedTimestampRef.current = null
    triggerPulse()
    setPlaying(true)
    showAudioToast('Dikkat geri geldi — Cümle başından devam ediliyor')
  }, [anyModalOpen, sheetOpen, triggerPulse, showAudioToast])

  const handleMicroBlink = useCallback(() => {
    microBlinkExtraDelayRef.current = Math.min(240, microBlinkExtraDelayRef.current + 120)
  }, [])

  const handleEyePermissionDenied = useCallback(
    (message: string) => {
      setEyeTrackingEnabled(false)
      setEyeTrackingStatus('inactive')
      pausedByEyeTrackerRef.current = false
      showAudioToast(message)
    },
    [showAudioToast],
  )

  // Tam Ekran Yönetimi (Sonsuz resize döngüsü olmadan ve temiz zamanlayıcı takibiyle)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>()

    const clearScheduledTimers = () => {
      timers.forEach((t) => clearTimeout(t))
      timers.clear()
    }

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
    }

    const scheduleViewportResets = () => {
      clearScheduledTimers()
      resetViewportScroll()
      for (const delay of [60, 200, 450]) {
        const id = setTimeout(() => {
          timers.delete(id)
          resetViewportScroll()
        }, delay)
        timers.add(id)
      }
    }

    const handleFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement)
      setIsFullscreen(isFs)
      scheduleViewportResets()
    }

    const handleOrientationChange = () => {
      scheduleViewportResets()
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    window.addEventListener('orientationchange', handleOrientationChange)
    window.addEventListener('resize', resetViewportScroll)
    window.visualViewport?.addEventListener('resize', resetViewportScroll)

    return () => {
      clearScheduledTimers()
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

  // Mobil Ekran Kilidi (Screen Lock / Sleep) ve Sekme Değişimi Algılama
  const wasPlayingBeforeLockRef = useRef(false)
  const lockedIndexRef = useRef(0)
  const indexRef = useRef(index)
  indexRef.current = index
  const chunksRef = useRef(chunks)
  chunksRef.current = chunks

  useEffect(() => {
    let unlockTimer: ReturnType<typeof setTimeout> | null = null

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
          const startIdx = findCurrentSentenceStartIndex(chunksRef.current, lockedIndexRef.current)
          rampStepRef.current = 0
          expectedTimestampRef.current = null
          setIndex(startIdx)
          triggerPulse()

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
  const handleSmartRewind = useCallback(() => {
    if (chunks.length === 0) return
    rampStepRef.current = 0
    expectedTimestampRef.current = null
    const targetIndex = findPreviousSentenceIndex(chunks, index, 3)
    setIndex(targetIndex)
    triggerPulse()
    triggerHaptic('jump')
  }, [chunks, index, triggerPulse])

  const handleSmartForward = useCallback(() => {
    if (chunks.length === 0) return
    rampStepRef.current = 0
    expectedTimestampRef.current = null
    const targetIndex = findNextSentenceIndex(chunks, index)
    setIndex(targetIndex)
    triggerPulse()
    triggerHaptic('jump')
  }, [chunks, index, triggerPulse])

  // Chunk boyutu değiştiğinde mevcut kalınan kelimeden zıplama olmadan aynı konumu koru
  const handleChunkSizeChange = useCallback(
    (newSize: number) => {
      if (newSize === chunkSize) return

      const activeWordIndex = chunks[index]?.startIndex ?? index
      const nextChunks = createChunks(text, newSize, { enableFootnotes: readFootnotes })
      const nextIndex = findChunkIndexForWord(nextChunks, activeWordIndex)

      setChunkSize(newSize)
      setIndex(nextIndex)

      setChunkBadge(`${newSize} Kelime Öbeği`)
      if (chunkBadgeTimerRef.current) clearTimeout(chunkBadgeTimerRef.current)
      chunkBadgeTimerRef.current = setTimeout(() => setChunkBadge(null), 1200)
    },
    [chunkSize, chunks, index, text, readFootnotes],
  )

  const cycleChunkSize = useCallback(() => {
    const nextSize = chunkSize >= 4 ? 1 : chunkSize + 1
    handleChunkSizeChange(nextSize)
    triggerHaptic('tap')
  }, [chunkSize, handleChunkSizeChange])

  // 1, 2 & 3. KURAL: Canlı WPM Toast HUD ve Zamanlayıcı Mantığı
  const [wpmToastVisible, setWpmToastVisible] = useState(false)
  const [wpmToastFading, setWpmToastFading] = useState(false)
  const wpmToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      }, 300)
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

  const handleWpmDragEnd = useCallback(() => {
    hideWpmToastWithFade(1000)
  }, [hideWpmToastWithFade])

  const handleApplySpeedTest = useCallback(
    (newWpm: number) => {
      setWpmDirect(newWpm)
      setShowSpeedTestBanner(false)
      hideWpmToastWithFade(1500)
    },
    [setWpmDirect, hideWpmToastWithFade],
  )

  // Esnek Bağlam Penceresi ve Sayfalama
  const [contextPageSize, setContextPageSize] = useState(24)

  const handleStepPrev = useCallback(() => {
    rampStepRef.current = 0
    const currentWordIdx = currentChunk?.startIndex ?? 0
    const pageSize = Math.max(1, contextPageSize)
    const pageIdx = Math.floor(currentWordIdx / pageSize)
    const targetWordIdx = Math.max(0, (pageIdx - 1) * pageSize)
    const targetChunkIdx = findChunkIndexForWord(chunks, targetWordIdx)
    seek(targetChunkIdx)
  }, [currentChunk, contextPageSize, chunks, seek])

  const handleStepNext = useCallback(() => {
    rampStepRef.current = 0
    const currentWordIdx = currentChunk?.startIndex ?? 0
    const pageSize = Math.max(1, contextPageSize)
    const pageIdx = Math.floor(currentWordIdx / pageSize)
    const targetWordIdx = Math.min(Math.max(0, words.length - 1), (pageIdx + 1) * pageSize)
    const targetChunkIdx = findChunkIndexForWord(chunks, targetWordIdx)
    seek(targetChunkIdx)
  }, [currentChunk, contextPageSize, words.length, chunks, seek])

  const handleContextJump = useCallback(
    (wordIdx: number) => {
      const targetChunkIdx = findChunkIndexForWord(chunks, wordIdx)
      seek(targetChunkIdx)
    },
    [chunks, seek],
  )

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

  // Mobil Chrome'da aşağı kaydırma sırasında pull-to-refresh'i %100 engelleyen tekil native touchmove dinleyicisi
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
        if (steps !== zenLastHapticStepRef.current) {
          zenLastHapticStepRef.current = steps
          triggerHaptic('step')
        }
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
      hideWpmToastWithFade(1000)
    }
  }

  const handleZenClick = (action: () => void) => {
    if (zenTouchStateRef.current?.hasSwiped) {
      return
    }
    action()
  }

  // Farenin scroll tekeriyle (mouse wheel) okuma hızı kontrolü
  useEffect(() => {
    let lastWheelTime = 0

    const handleGlobalWheel = (e: WheelEvent) => {
      if (anyModalOpen || e.ctrlKey || e.metaKey) return
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

      if (Math.abs(e.deltaY) < 4) return

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
  }, [changeWpm, anyModalOpen])

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

  const handleBionicChange = useCallback(
    (enabled: boolean) => {
      setBionicEnabled(enabled)
      triggerHaptic('tap')
    },
    [],
  )

  // Tema değiştiğinde yazı tipini o temanın özgün yazı tipine uyarla
  const handleThemeChange = useCallback((newTheme: ThemeId) => {
    setTheme(newTheme)
    setFontFace('theme')
  }, [])

  // HTML ve body'e data-theme senkronizasyonu
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
      document.body.setAttribute('data-theme', theme)
    }
  }, [theme])

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return

    const target = e.target as HTMLElement | null
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) {
      if (!(target instanceof HTMLInputElement && target.type === 'range' && e.code === 'Space')) {
        return
      }
    }

    // 1, 2, 3 Temaları değiştirme kısayolları (Kılavuz penceresi açıkken de anında çalışır)
    if (
      e.code === 'Digit1' ||
      e.code === 'Digit2' ||
      e.code === 'Digit3' ||
      e.code === 'Numpad1' ||
      e.code === 'Numpad2' ||
      e.code === 'Numpad3'
    ) {
      const num = Number(e.key)
      const targetTheme = THEMES[num - 1]?.id
      if (targetTheme) {
        handleThemeChange(targetTheme)
        triggerHaptic('tap')
      }
      return
    }

    if (anyModalOpen) return

    // Açık modal veya diyalog içerisindeyken Space/Enter tuşunun diyaloğa ait kalmasına izin ver
    if (
      (e.code === 'Space' || e.code === 'Enter') &&
      target?.closest('[role="dialog"]')
    ) {
      return
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault()
        if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
          document.activeElement.blur()
        }
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
      case 'KeyB': {
        e.preventDefault()
        const nextBionic = !bionicEnabled
        handleBionicChange(nextBionic)
        showAudioToast(
          nextBionic ? 'Akıllı Bionic Öbekleme: Açık' : 'Akıllı Bionic Öbekleme: Kapalı',
        )
        break
      }
      case 'KeyD': {
        e.preventDefault()
        const nextFootnotes = !readFootnotes
        handleReadFootnotesChange(nextFootnotes)
        triggerHaptic('tap')
        showAudioToast(
          nextFootnotes ? 'Metin İçi Dipnotlar: Açık' : 'Metin İçi Dipnotlar: Kapalı',
        )
        break
      }
      case 'KeyF':
        e.preventDefault()
        toggleFullscreen()
        break
      case 'KeyM':
        e.preventDefault()
        toggleNeuroAudio()
        break
      case 'KeyG':
        e.preventDefault()
        handleEyeTrackingChange(!eyeTrackingEnabled)
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
      if (wpmToastTimerRef.current) clearTimeout(wpmToastTimerRef.current)
      if (chunkBadgeTimerRef.current) clearTimeout(chunkBadgeTimerRef.current)
      if (resumeBadgeTimerRef.current) clearTimeout(resumeBadgeTimerRef.current)
    }
  }, [])

  // Tarayıcı ilk açıldığında veya yenilendiğinde son ayarları ve okunan dokümanı sessizce hatırla
  useEffect(() => {
    const settings = loadReaderSettings()
    if (settings.theme) setTheme(settings.theme)
    if (settings.fontFace) setFontFace(settings.fontFace)
    if (typeof settings.fontScale === 'number') setFontScale(settings.fontScale)
    if (typeof settings.chunkSize === 'number') setChunkSize(settings.chunkSize)
    if (typeof settings.wpm === 'number') setWpm(settings.wpm)
    if (typeof settings.readFootnotes === 'boolean') setReadFootnotes(settings.readFootnotes)
    if (typeof settings.bionicEnabled === 'boolean') setBionicEnabled(settings.bionicEnabled)
    // Ses modu varsayılan olarak daima kapalı başlar (Autoplay ve kullanıcı isteği gereği)
    setNeuroAudioEnabled(false)

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

  // Kullanıcı tercihlerindeki her değişikliği sessizce localStorage'da sakla
  useEffect(() => {
    saveReaderSettings({
      theme,
      fontFace,
      fontScale,
      chunkSize,
      wpm,
      readFootnotes,
      bionicEnabled,
      neuroAudioEnabled,
    })
  }, [theme, fontFace, fontScale, chunkSize, wpm, readFootnotes, bionicEnabled, neuroAudioEnabled])

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

  const applyText = useCallback(
    (next: string, title?: string) => {
      const cleanTitle = title?.trim()
      const nextTitle = cleanTitle && cleanTitle !== 'odak' ? cleanTitle : 'Hızlı Okuma Penceresi'
      setText(next)
      setDocTitle(nextTitle)
      setPlaying(false)
      setSheetOpen(false)
      setCompletionOpen(false)
      wordsReadSinceRestRef.current = 0
      sessionElapsedSecsRef.current = 0
      sessionStartTimeRef.current = null

      const newChunks = createChunks(next, chunkSize, { enableFootnotes: readFootnotes })
      const saved = loadReadingProgress(nextTitle, next)
      if (saved && (saved.wordIndex > 0 || saved.index > 0) && newChunks.length > 0) {
        const target = findChunkIndexForWord(newChunks, saved.wordIndex ?? saved.index)
        setIndex(target)
        setResumeBadge(
          `Kaldığınız yerden devam ediliyor (%${saved.progressPercent || Math.round((target / Math.max(1, newChunks.length)) * 100)})`,
        )
        if (resumeBadgeTimerRef.current) clearTimeout(resumeBadgeTimerRef.current)
        resumeBadgeTimerRef.current = setTimeout(() => setResumeBadge(null), 3500)
      } else {
        setIndex(0)
      }
    },
    [chunkSize, readFootnotes],
  )

  const handleToggleSheet = useCallback(() => {
    setPlaying(false)
    setSheetOpen((prev) => {
      const next = !prev
      if (next) setFontOpen(false)
      return next
    })
  }, [])

  const handleCloseSheet = useCallback(() => {
    setSheetOpen(false)
  }, [])

  const handleToggleFont = useCallback((next: boolean) => {
    setFontOpen(next)
    if (next) {
      setSheetOpen(false)
    }
  }, [])

  const handleOpenAbout = useCallback(() => {
    setPlaying(false)
    setSheetOpen(false)
    setFontOpen(false)
    setAboutOpen(true)
  }, [])

  const handleOpenSpeedTest = useCallback(() => {
    setPlaying(false)
    setSheetOpen(false)
    setFontOpen(false)
    setSpeedTestOpen(true)
  }, [])

  const textControlElement = useMemo(
    () => (
      <TextSheet
        open={sheetOpen}
        initialText={text}
        onToggle={handleToggleSheet}
        onClose={handleCloseSheet}
        onApply={(newText, title) => {
          applyText(newText, title)
          handleCloseSheet()
        }}
        onThemeChange={handleThemeChange}
      />
    ),
    [sheetOpen, text, handleToggleSheet, handleCloseSheet, applyText, handleThemeChange],
  )

  const fontControlElement = useMemo(
    () => (
      <FontSettings
        isOpen={fontOpen}
        onOpenChange={handleToggleFont}
        theme={theme}
        onThemeChange={handleThemeChange}
        face={fontFace}
        scale={fontScale}
        onFaceChange={setFontFace}
        onScaleChange={setFontScale}
        chunkSize={chunkSize}
        onChunkSizeChange={handleChunkSizeChange}
        bionicEnabled={bionicEnabled}
        onBionicChange={handleBionicChange}
        neuroAudioEnabled={neuroAudioEnabled}
        onNeuroAudioChange={handleNeuroAudioChange}
        eyeTrackingEnabled={eyeTrackingEnabled}
        onEyeTrackingChange={handleEyeTrackingChange}
        eyeTrackingStatus={eyeTrackingStatus}
        onOpenSpeedTest={handleOpenSpeedTest}
      />
    ),
    [
      fontOpen,
      handleToggleFont,
      theme,
      handleThemeChange,
      fontFace,
      fontScale,
      chunkSize,
      handleChunkSizeChange,
      bionicEnabled,
      handleBionicChange,
      neuroAudioEnabled,
      handleNeuroAudioChange,
      eyeTrackingEnabled,
      handleEyeTrackingChange,
      eyeTrackingStatus,
      handleOpenSpeedTest,
    ],
  )

  const activeFontFamily = useMemo(
    () => FONT_FACES.find((f) => f.id === fontFace)?.family,
    [fontFace],
  )

  return (
    <div
      data-theme={theme}
      className="app-bg relative h-dvh w-full touch-manipulation overscroll-none overflow-hidden font-sans text-foreground transition-colors duration-500 selection:bg-primary/25"
    >
      {/* Ambient Aura / Tematik Işıma Katmanı */}
      <AmbientAura theme={theme} playing={playing} />

      <TopBar
        ref={headerRef}
        docTitle={docTitle}
        textControl={textControlElement}
        fontControl={fontControlElement}
        theme={theme}
        onOpenAbout={handleOpenAbout}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        neuroAudioEnabled={neuroAudioEnabled}
        onToggleNeuroAudio={toggleNeuroAudio}
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
          {/* Üst Dengeleyici */}
          <div className="flex-1 w-full min-h-0 pointer-events-none select-none" />

          {/* Okuma Penceresi */}
          <div className="w-full shrink-0 flex flex-col items-center">
            {showSpeedTestBanner && !zen && (
              <div className="mb-2 sm:mb-2.5 flex w-full max-w-xs items-center justify-between gap-2 rounded-full border border-border/50 bg-background/50 px-3 py-1 shadow-2xs backdrop-blur-sm animate-in fade-in slide-in-from-top-1 duration-300">
                <button
                  type="button"
                  onClick={handleOpenSpeedTest}
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
              bionicEnabled={bionicEnabled}
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
              onWpmDragEnd={handleWpmDragEnd}
              onCycleChunkSize={cycleChunkSize}
              wpm={wpm}
              fontScale={fontScale}
              maxSide={maxSide}
              fontFamily={activeFontFamily}
            />
          </div>

          {/* Alt Zarif Bağlam Şeridi */}
          <div className="context-peek-box w-full max-w-3xl shrink-0 mt-1 sm:mt-1.5 landscape-short:mt-0.5 min-h-[76px] sm:min-h-[90px] md:min-h-[110px] max-h-[94px] sm:max-h-[112px] md:max-h-[132px] landscape-short:min-h-[72px] landscape-short:max-h-[84px] flex flex-col overflow-hidden">
            <ContextPeek
              words={words}
              index={currentChunk?.startIndex ?? index}
              chunkSize={chunkSize}
              visible={!zen && words.length > 0}
              remainingTime={
                !zen ? `${formatRemaining(chunks.length - index - 1, wpm, chunkSize)} kaldı` : undefined
              }
              onJump={handleContextJump}
              onVisibleCountChange={setContextPageSize}
              onStepPrev={handleStepPrev}
              onStepNext={handleStepNext}
              hasPrev={index > 0}
              hasNext={index < lastIndex}
            />
          </div>

          {/* Alt Dengeleyici */}
          <div className="flex-1 w-full min-h-0 pointer-events-none select-none" />
        </div>
      </main>

      {/* Canlı WPM Toast HUD */}
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

      {/* Nöroakustik Odak Sesi / Kısayol Durum Bildirimi (Toast HUD) */}
      {audioToast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed top-7 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-1 duration-200 select-none"
        >
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/85 px-4 py-1.5 font-sans text-xs font-medium text-foreground shadow-2xl backdrop-blur-md">
            {audioToast.includes('Nöro-Odak') &&
              (neuroAudioEnabled ? (
                <Volume2 className="size-3.5 text-primary" />
              ) : (
                <VolumeX className="size-3.5 text-muted-foreground" />
              ))}
            {(audioToast.includes('Göz') ||
              audioToast.includes('Dikkat') ||
              audioToast.includes('Ekrandan') ||
              audioToast.includes('Kamera')) &&
              (eyeTrackingEnabled ? (
                <Eye className="size-3.5 text-emerald-500" />
              ) : (
                <EyeOff className="size-3.5 text-muted-foreground" />
              ))}
            <span>{audioToast}</span>
          </div>
        </div>
      )}

      {/* Görünmez Web Kamerası Tabanlı Göz Kırpma & Dikkat İzleme Motoru */}
      <EyeTracker
        enabled={eyeTrackingEnabled}
        earThreshold={0.18}
        onBlinkOrLookAway={handleBlinkOrLookAway}
        onAttentionRestored={handleAttentionRestored}
        onMicroBlink={handleMicroBlink}
        onPermissionDenied={handleEyePermissionDenied}
        onTrackingStatusChange={handleEyeTrackingStatusChange}
      />

      {/* Okuma Sırasında Tam Ekran Dokunma ve Jest Katmanı */}
      {zen && (
        <div
          ref={zenOverlayRef}
          onTouchStart={handleZenTouchStart}
          onTouchEnd={handleZenTouchEnd}
          onTouchCancel={handleZenTouchEnd}
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

      {/* Tematik Sağ Alt Köşe Sayfa Kıvrımları (z-10: Pencerelerin ve kontrollerin arkasında) */}
      <PaperCornerCurl visible={theme === 'kindle'} />
      <GlassCornerCurl visible={theme === 'ios'} />
      <NeonCornerCurl visible={theme === 'linear'} />

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
          if (neuroAudioEnabled) {
            getAudioEngine().start()
          }
        }}
        onOpenNewText={() => {
          setCompletionOpen(false)
          setSheetOpen(true)
          setFontOpen(false)
        }}
      />

      <AboutModal
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        theme={theme}
        onThemeChange={handleThemeChange}
      />
    </div>
  )
}
