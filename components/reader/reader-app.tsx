'use client'

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { Eye, EyeOff, Gauge, Volume2, VolumeX, X, Smartphone, Tablet, Laptop, Check, Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  MAX_WPM,
  MIN_WPM,
  SAMPLE_TEXT,
  THEMES,
  WPM_STEP,
  type BookPageInfo,
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
  saveLastActiveDoc,
  findChunkIndexForWord,
} from '@/lib/reading-progress'
import { DEFAULT_BOOK_PAGE_INFO, DEFAULT_BOOK_TEXT, DEFAULT_BOOK_TITLE } from '@/lib/default-book'
import { CURATED_LIBRARY } from '@/lib/curated-library'
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
import { SyncModal } from './sync-modal'
import { FONT_FACES, FONT_SCALE_MAX, FONT_SCALE_MIN, FontSettings, type FontFace } from './font-settings'
import { triggerHaptic, primeHaptics } from '@/lib/haptics'
import { NeuroAudioEngine } from '@/lib/neuro-audio'
import { getSyncVaultId, SyncChannelManager, upsertPairedDevice, sanitizeVaultId } from '@/lib/device-sync'
import { useElementHeight } from '@/lib/use-element-height'
import { useWakeLock } from '@/lib/use-wake-lock'
import { EyeTracker, type AttentionLossReason } from '@/components/EyeTracker'

function isSameDocument(title1?: string, title2?: string): boolean {
  if (!title1 && !title2) return true
  if (!title1 || !title2) return false
  const clean1 = title1.trim().toLowerCase().replace(/[^a-z0-9çğıöşü]/gi, '')
  const clean2 = title2.trim().toLowerCase().replace(/[^a-z0-9çğıöşü]/gi, '')
  if (clean1 === clean2) return true
  if (clean1.length >= 5 && clean2.length >= 5) {
    if (clean1.includes(clean2) || clean2.includes(clean1)) return true
  }
  return false
}

function findDocumentByTitle(targetTitle?: string): { title: string; text: string; pageInfo?: BookPageInfo | null } | null {
  if (!targetTitle) return null
  const cleanTarget = targetTitle.trim().toLowerCase().replace(/[^a-z0-9çğıöşü]/gi, '')

  // 1. Varsayılan Kitap (Yaşamak)
  const cleanDefault = DEFAULT_BOOK_TITLE.toLowerCase().replace(/[^a-z0-9çğıöşü]/gi, '')
  if (cleanTarget === cleanDefault || /yashamaq|yaşamak/i.test(targetTitle)) {
    return {
      title: DEFAULT_BOOK_TITLE,
      text: DEFAULT_BOOK_TEXT,
      pageInfo: DEFAULT_BOOK_PAGE_INFO,
    }
  }

  // 2. Seçkiler Kitaplığı (Curated Library)
  for (const item of CURATED_LIBRARY) {
    const cleanItem = item.title.toLowerCase().replace(/[^a-z0-9çğıöşü]/gi, '')
    if (cleanTarget === cleanItem || cleanTarget.includes(cleanItem) || cleanItem.includes(cleanTarget)) {
      return {
        title: item.title,
        text: item.text,
        pageInfo: null,
      }
    }
  }

  // 3. Son Aktif Doküman (LAST_DOC_KEY)
  const lastDoc = loadLastActiveDoc()
  if (lastDoc && lastDoc.title) {
    const cleanLast = lastDoc.title.toLowerCase().replace(/[^a-z0-9çğıöşü]/gi, '')
    if (cleanTarget === cleanLast || cleanTarget.includes(cleanLast) || cleanLast.includes(cleanTarget)) {
      return lastDoc
    }
  }

  return null
}

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
  const [text, setText] = useState(DEFAULT_BOOK_TEXT)
  const [docTitle, setDocTitle] = useState(DEFAULT_BOOK_TITLE)
  const [pageInfo, setPageInfo] = useState<BookPageInfo | null>(DEFAULT_BOOK_PAGE_INFO)
  const [index, setIndex] = useState(0)
  const [wpm, setWpm] = useState(300)
  const [playing, setPlaying] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [fontOpen, setFontOpen] = useState(false)
  const [speedTestOpen, setSpeedTestOpen] = useState(false)
  const [completionOpen, setCompletionOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [syncModalOpen, setSyncModalOpen] = useState(false)

  // Cihaz Eşleştir penceresi açıldığında mevcut bağlı cihazları ve varlık durumunu anında tara
  useEffect(() => {
    if (syncModalOpen) {
      syncManagerRef.current?.broadcastPresence()
      syncManagerRef.current?.fetchLatestCloudState()
    }
  }, [syncModalOpen])

  // Kindle Tarzı Kesintisiz ve Zarif Cihazlar Arası Eşitleme Durumu
  const [kindleSyncPrompt, setKindleSyncPrompt] = useState<{
    deviceName: string
    deviceType: 'mobile' | 'tablet' | 'desktop'
    docTitle?: string
    isDifferentDoc?: boolean
    wordIndex: number
    pageNumber?: number
    wpm?: number
    chunkSize?: number
    theme?: string
    fontFace?: string
    timestamp: number
  } | null>(null)
  const kindleSyncTimerRef = useRef<NodeJS.Timeout | null>(null)
  const kindleSyncPromptRef = useRef(kindleSyncPrompt)
  useEffect(() => {
    kindleSyncPromptRef.current = kindleSyncPrompt
  }, [kindleSyncPrompt])

  const dismissedSyncKeyRef = useRef<string | null>(null)
  const prevSessionLastActiveRef = useRef<number>(
    typeof window !== 'undefined'
      ? parseInt(localStorage.getItem('hizlioku_local_last_active_ts') || '0', 10) || 0
      : 0
  )
  const lastHiddenTimeRef = useRef<number>(0)
  const playingRef = useRef(playing)
  useEffect(() => {
    playingRef.current = playing
  }, [playing])

  const docTitleRef = useRef(docTitle)
  useEffect(() => {
    docTitleRef.current = docTitle
  }, [docTitle])

  const recordLocalActivity = useCallback(() => {
    const now = Date.now()
    try {
      localStorage.setItem('hizlioku_local_last_active_ts', String(now))
    } catch {}
  }, [])

  // Kullanıcı bu cihazda okumaya başladığında yerel aktif oturum zamanını güncelle
  useEffect(() => {
    if (playing) {
      recordLocalActivity()
      prevSessionLastActiveRef.current = Date.now()
    }
  }, [playing, recordLocalActivity])

  // Açılıştan 15 saniye sonra yerel oturum zamanını güncelle
  useEffect(() => {
    const timer = setTimeout(() => {
      recordLocalActivity()
      prevSessionLastActiveRef.current = Date.now()
    }, 15000)
    return () => clearTimeout(timer)
  }, [recordLocalActivity])

  const dismissKindleSync = useCallback(() => {
    if (kindleSyncPromptRef.current) {
      const p = kindleSyncPromptRef.current
      const key = p.isDifferentDoc
        ? `diff_${p.docTitle || ''}_${p.wordIndex}_${p.timestamp}`
        : `${p.docTitle || ''}_${p.wordIndex}`
      dismissedSyncKeyRef.current = key
    }
    if (kindleSyncTimerRef.current) {
      clearTimeout(kindleSyncTimerRef.current)
      kindleSyncTimerRef.current = null
    }
    setKindleSyncPrompt(null)
    kindleSyncPromptRef.current = null
  }, [])
  const [showSpeedTestBanner, setShowSpeedTestBanner] = useState(false)

  const anyModalOpen = speedTestOpen || completionOpen || aboutOpen || syncModalOpen

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
    if (zenRef.current) return // Zen modu hariç
    setAudioToast(message)
    if (audioToastTimerRef.current) clearTimeout(audioToastTimerRef.current)
    audioToastTimerRef.current = setTimeout(() => {
      setAudioToast(null)
    }, 4500) // İki katı süre (4.5 sn)
  }, [])

  // İlk giriş kontrolü: Daha önce hız testi yapılmamış veya kapatılmamışsa davet butonunu göster
  // Kullanıcı 1 dakika içinde tıklamazsa kendiliğinden kapansın
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined
    try {
      const isCompleted = localStorage.getItem('odak_speed_test_completed')
      const isDismissed = localStorage.getItem('odak_speed_test_dismissed')
      if (!isCompleted && !isDismissed) {
        setShowSpeedTestBanner(true)
        timer = setTimeout(() => {
          setShowSpeedTestBanner(false)
          try {
            localStorage.setItem('odak_speed_test_dismissed', 'true')
          } catch {}
        }, 60000)
      }
    } catch {}

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [])

  const dismissSpeedTestBanner = useCallback(() => {
    setShowSpeedTestBanner(false)
    try {
      localStorage.setItem('odak_speed_test_dismissed', 'true')
    } catch {}
  }, [])

  // Akıllı Cümle & Başlık Kırılımlı Chunking
  const chunks = useMemo(
    () => createChunks(text, chunkSize, { enableFootnotes: readFootnotes, pageInfo }),
    [text, chunkSize, readFootnotes, pageInfo],
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
  const zenRef = useRef(zen)
  useEffect(() => {
    zenRef.current = zen
  }, [zen])

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
      if (!playingRef.current) return
      pausedByEyeTrackerRef.current = true
      setPlaying(false)
      playingRef.current = false
      const startIdx = findCurrentSentenceStartIndex(chunksRef.current, indexRef.current)
      rampStepRef.current = 0
      expectedTimestampRef.current = null
      setIndex(startIdx)
      triggerPulse()

      let message = 'Dikkat dağıldı — Okuma duraklatıldı'
      if (reason === 'head-turned') {
        message = 'Baş çevrildi — Okuma duraklatıldı'
      } else if (reason === 'looking-away') {
        message = 'Ekrandan uzaklaşıldı — Okuma duraklatıldı'
      } else if (reason === 'eyes-squinted') {
        message = 'Gözler kısıldı (Yorgunluk) — Okuma duraklatıldı'
      } else if (reason === 'eyes-closed') {
        message = 'Gözler kapandı — Okuma duraklatıldı'
      } else if (reason === 'no-face') {
        message = 'Yüz algılanamadı — Okuma duraklatıldı'
      }

      showAudioToast(message)
    },
    [triggerPulse, showAudioToast],
  )

  const handleAttentionRestored = useCallback(() => {
    if (!pausedByEyeTrackerRef.current) return
    pausedByEyeTrackerRef.current = false
    if (anyModalOpen || sheetOpen) return
    rampStepRef.current = 0
    expectedTimestampRef.current = null
    triggerPulse()
    setPlaying(true)
    playingRef.current = true
    showAudioToast('Ekrana odaklanıldı — Devam ediliyor')
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

  // Gerçek Zamanlı Cihaz & Sekme Senkronizasyonu (Karekod & Vault)
  const syncManagerRef = useRef<SyncChannelManager | null>(null)

  const broadcastSyncState = useCallback(() => {
    if (!syncManagerRef.current) return
    const curIdx = indexRef.current
    const curChunk = chunksRef.current[curIdx]
    const curWordIndex = curChunk?.startIndex ?? curIdx
    syncManagerRef.current.broadcast({
      type: 'progress',
      docTitle,
      wordIndex: curWordIndex,
      pageNumber: curChunk?.pageNumber ?? pageInfo?.currentPage,
      chunkSize,
      wpm,
      theme,
      fontFace,
      fontScale,
    })
  }, [docTitle, pageInfo, chunkSize, wpm, theme, fontFace, fontScale])

  useEffect(() => {
    let unlockTimer: ReturnType<typeof setTimeout> | null = null

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        const now = Date.now()
        lastHiddenTimeRef.current = now
        recordLocalActivity()
        if (playing) {
          wasPlayingBeforeLockRef.current = true
          lockedIndexRef.current = indexRef.current
          setPlaying(false)
        }
        // Telefon ekranı kilitlendiği veya sekme gizlendiği an son pozisyonu buluta anında ilet
        broadcastSyncState()
      } else if (document.visibilityState === 'visible') {
        if (unlockTimer) clearTimeout(unlockTimer)
        wasPlayingBeforeLockRef.current = false
        if (lastHiddenTimeRef.current) {
          prevSessionLastActiveRef.current = lastHiddenTimeRef.current
        }
        // Ekran açıldığında diğer cihazlardan gelen yeni pozisyon var mı diye hemen kontrol et
        syncManagerRef.current?.fetchLatestCloudState()
      }
    }

    const handlePageHide = () => {
      recordLocalActivity()
      broadcastSyncState()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('beforeunload', handlePageHide)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('beforeunload', handlePageHide)
      if (unlockTimer) clearTimeout(unlockTimer)
    }
  }, [playing, triggerPulse, broadcastSyncState])

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
      const clampedSize = Math.max(1, Math.min(3, newSize))
      if (clampedSize === chunkSize) return

      const activeWordIndex = chunks[index]?.startIndex ?? index
      const nextChunks = createChunks(text, clampedSize, { enableFootnotes: readFootnotes, pageInfo })
      const nextIndex = findChunkIndexForWord(nextChunks, activeWordIndex)

      setChunkSize(clampedSize)
      setIndex(nextIndex)

      setChunkBadge(`${clampedSize} Kelime Öbeği`)
      if (chunkBadgeTimerRef.current) clearTimeout(chunkBadgeTimerRef.current)
      chunkBadgeTimerRef.current = setTimeout(() => setChunkBadge(null), 1200)
    },
    [chunkSize, chunks, index, text, readFootnotes, pageInfo],
  )

  const cycleChunkSize = useCallback(() => {
    const nextSize = chunkSize >= 3 ? 1 : chunkSize + 1
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
  // Esnek Bağlam Penceresi ve Sayfalama (6'nın katı: 1, 2, 3 öbeklerle tam uyumlu)
  const [contextPageSize, setContextPageSize] = useState(30)

  const handleStepPrev = useCallback(() => {
    rampStepRef.current = 0
    const currentWordIdx = currentChunk?.startIndex ?? 0
    const pageSize = Math.max(1, contextPageSize)
    const pageIdx = Math.floor(currentWordIdx / pageSize)
    if (pageIdx <= 0) {
      if (currentWordIdx > 0) {
        seek(0)
        triggerHaptic('tap')
      }
      return
    }

    const targetPageIdx = pageIdx - 1
    const targetWordIdx = targetPageIdx * pageSize
    const targetChunkIdx = chunks.findIndex((c) => c.startIndex >= targetWordIdx)
    const finalIdx = targetChunkIdx !== -1 ? targetChunkIdx : 0
    seek(finalIdx)
    triggerHaptic('tap')
  }, [currentChunk, contextPageSize, chunks, seek])

  const handleStepNext = useCallback(() => {
    rampStepRef.current = 0
    const currentWordIdx = currentChunk?.startIndex ?? 0
    const pageSize = Math.max(1, contextPageSize)
    const pageIdx = Math.floor(currentWordIdx / pageSize)
    const targetPageIdx = pageIdx + 1
    const targetWordIdx = targetPageIdx * pageSize

    if (targetWordIdx >= words.length) return

    // Hedef sayfanın ilk chunk'ına atla (startIndex >= targetWordIdx olan ilk chunk)
    // Böylece çoklu kelime öbeklerinde (chunkSize > 1) önceki sayfaya takılı kalmaz, daima sonraki sayfaya kesin olarak ilerler!
    const targetChunkIdx = chunks.findIndex((c) => c.startIndex >= targetWordIdx)
    const finalIdx = targetChunkIdx !== -1 ? targetChunkIdx : chunks.length - 1
    seek(finalIdx)
    triggerHaptic('tap')
  }, [currentChunk, contextPageSize, words.length, chunks, seek])

  const handleContextJump = useCallback(
    (wordIdx: number) => {
      const targetChunkIdx = findChunkIndexForWord(chunks, wordIdx)
      seek(targetChunkIdx)
    },
    [chunks, seek],
  )

  // Sayfa kıvrımı ile bir sonraki kitap sayfasına atlama kontrolü:
  // - Zen modunda tıklanamaz.
  // - Sadece kitap/PDF modunda (pageInfo mevcut olduğunda) çalışır; düz metin ve linklerde devre dışıdır.
  // - Son sayfada değilse bir sonraki sayfaya atlar.
  const currentBookPageNumber = useMemo(() => {
    if (!pageInfo) return null
    if (currentChunk?.pageNumber) return currentChunk.pageNumber
    for (let i = index; i >= 0; i--) {
      if (chunks[i]?.pageNumber) return chunks[i].pageNumber
    }
    return null
  }, [pageInfo, currentChunk, index, chunks])

  const canJumpPage = useMemo(() => {
    return Boolean(
      !zen &&
      pageInfo &&
      pageInfo.totalBookPages &&
      currentBookPageNumber &&
      currentBookPageNumber < pageInfo.totalBookPages,
    )
  }, [zen, pageInfo, currentBookPageNumber])

  const handleNextBookPage = useCallback(() => {
    if (zen || !pageInfo) return
    const currentPage = currentBookPageNumber
    if (!currentPage || !pageInfo.totalBookPages || currentPage >= pageInfo.totalBookPages) return

    const targetPage = currentPage + 1
    const targetChunkIdx = chunks.findIndex((c) => c.pageNumber === targetPage)
    const finalIdx =
      targetChunkIdx !== -1
        ? targetChunkIdx
        : chunks.findIndex((c) => (c.pageNumber || 0) >= targetPage)

    if (finalIdx !== -1) {
      rampStepRef.current = 0
      seek(finalIdx)
      triggerPulse()
      triggerHaptic('tap')
    }
  }, [zen, pageInfo, currentBookPageNumber, chunks, seek, triggerPulse])

  const handlePrevBookPage = useCallback(() => {
    if (zen || !pageInfo) return
    const currentPage = currentBookPageNumber
    if (!currentPage || currentPage <= 1) return

    const targetPage = currentPage - 1
    let finalIdx = chunks.findIndex((c) => c.pageNumber === targetPage)
    if (finalIdx === -1) {
      for (let i = chunks.length - 1; i >= 0; i--) {
        if ((chunks[i].pageNumber || 0) <= targetPage) {
          finalIdx = i
          break
        }
      }
    }

    if (finalIdx !== -1) {
      rampStepRef.current = 0
      seek(finalIdx)
      triggerPulse()
      triggerHaptic('tap')
    }
  }, [zen, pageInfo, currentBookPageNumber, chunks, seek, triggerPulse])

  const changeFontScale = useCallback(
    (delta: number) => {
      setFontScale((prev) => {
        const next = Math.round(Math.min(1.6, Math.max(0.5, prev + delta)) * 10) / 10
        if (next !== prev) {
          triggerHaptic('tap')
          showAudioToast(`Yazı Boyutu: %${Math.round(next * 100)}`)
        }
        return next
      })
    },
    [showAudioToast],
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

  // Mobil Chrome ve Android tarayıcılarda ilk dokunuşta haptik izin kilidini aç (User Activation Priming)
  useEffect(() => {
    const unlockHaptics = () => {
      primeHaptics()
    }
    window.addEventListener('pointerdown', unlockHaptics, { passive: true, capture: true, once: true })
    window.addEventListener('touchstart', unlockHaptics, { passive: true, capture: true, once: true })
    return () => {
      window.removeEventListener('pointerdown', unlockHaptics)
      window.removeEventListener('touchstart', unlockHaptics)
    }
  }, [])

  // Zen / Okuma Sırasında ve Duraklatılmış Ekranda Dokunma & Hızlı Haptik Geri Bildirimli Hız (WPM) Kaydırma Jesti
  const zenLastHapticStepRef = useRef<number>(0)
  const zenOverlayRef = useRef<HTMLDivElement | null>(null)
  const hasSwipedRef = useRef<boolean>(false)
  const swipeCooldownTimerRef = useRef<NodeJS.Timeout | null>(null)
  const cleanupActiveTouchRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      if (cleanupActiveTouchRef.current) {
        cleanupActiveTouchRef.current()
        cleanupActiveTouchRef.current = null
      }
    }
  }, [])

  const handleZenTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    primeHaptics()

    // Önceki aktif dinleyici varsa temizle
    if (cleanupActiveTouchRef.current) {
      cleanupActiveTouchRef.current()
      cleanupActiveTouchRef.current = null
    }

    if (swipeCooldownTimerRef.current) {
      clearTimeout(swipeCooldownTimerRef.current)
      swipeCooldownTimerRef.current = null
    }
    hasSwipedRef.current = false
    zenLastHapticStepRef.current = 0

    const startY = touch.clientY
    const startX = touch.clientX
    const startWpm = wpm
    let isSwiping = false
    let hasSwiped = false

    const onWindowTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length !== 1) return
      const currentTouch = moveEvent.touches[0]
      const deltaY = currentTouch.clientY - startY
      const deltaX = currentTouch.clientX - startX
      const absY = Math.abs(deltaY)
      const absX = Math.abs(deltaX)

      const SWIPE_THRESHOLD = 8
      if (!isSwiping && absY > SWIPE_THRESHOLD && absY > absX) {
        isSwiping = true
        hasSwiped = true
        hasSwipedRef.current = true
      }

      if (isSwiping) {
        if (moveEvent.cancelable) {
          moveEvent.preventDefault()
        }

        const pixelDistance = -deltaY // Yukarı kaydırma = pozitif (hız artır)
        const STEP_PX = 22

        let steps = 0
        if (pixelDistance > SWIPE_THRESHOLD) {
          steps = 1 + Math.floor((pixelDistance - SWIPE_THRESHOLD) / STEP_PX)
        } else if (pixelDistance < -SWIPE_THRESHOLD) {
          steps = -1 - Math.floor((-pixelDistance - SWIPE_THRESHOLD) / STEP_PX)
        }

        // Limit sınırlarını hesapla
        const maxSteps = Math.floor((MAX_WPM - startWpm) / WPM_STEP)
        const minSteps = -Math.floor((startWpm - MIN_WPM) / WPM_STEP)
        const clampedSteps = Math.min(maxSteps, Math.max(minSteps, steps))

        if (clampedSteps !== zenLastHapticStepRef.current) {
          zenLastHapticStepRef.current = clampedSteps
          triggerHaptic('step')
        }

        const targetWpm = startWpm + clampedSteps * WPM_STEP
        setWpmDirect(targetWpm)
      }
    }

    const onWindowTouchEnd = () => {
      window.removeEventListener('touchmove', onWindowTouchMove)
      window.removeEventListener('touchend', onWindowTouchEnd)
      window.removeEventListener('touchcancel', onWindowTouchEnd)
      cleanupActiveTouchRef.current = null

      if (hasSwiped || hasSwipedRef.current) {
        hasSwipedRef.current = true
        hideWpmToastWithFade(1000)
        if (swipeCooldownTimerRef.current) clearTimeout(swipeCooldownTimerRef.current)
        swipeCooldownTimerRef.current = setTimeout(() => {
          hasSwipedRef.current = false
          swipeCooldownTimerRef.current = null
        }, 350)
      }
    }

    cleanupActiveTouchRef.current = () => {
      window.removeEventListener('touchmove', onWindowTouchMove)
      window.removeEventListener('touchend', onWindowTouchEnd)
      window.removeEventListener('touchcancel', onWindowTouchEnd)
    }

    window.addEventListener('touchmove', onWindowTouchMove, { passive: false })
    window.addEventListener('touchend', onWindowTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onWindowTouchEnd, { passive: true })
  }

  const handleZenTouchEnd = () => {
    // Window seviyesindeki onWindowTouchEnd tarafından yönetilir
  }

  const handleZenClick = (action: () => void) => {
    if (hasSwipedRef.current) {
      hasSwipedRef.current = false
      return
    }
    action()
  }

  // Farenin scroll tekeriyle (mouse wheel) akıllı alan duyarlı kontrol (Sadece Masaüstü)
  useEffect(() => {
    let lastWpmTime = 0
    let lastPageTime = 0
    let lastFontTime = 0
    let lastChunkTime = 0
    let lastContextTime = 0

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
      const isUp = e.deltaY < 0
      const isFinePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches

      // Zen modunda sadece okuma hızı (WPM) değişimi
      if (zen) {
        if (now - lastWpmTime < 60) return
        lastWpmTime = now
        if (e.cancelable) e.preventDefault()
        changeWpm(isUp ? WPM_STEP : -WPM_STEP)
        return
      }

      // 1. Sf: X/Y butonu veya Sayfa Kıvrımı üzerindeyse sayfa numarasını değiştir
      // Farenin tekerleğiyle aşağı kaydırınca sayfa artar, yukarı kaydırınca sayfa azalır
      const pageTarget = target?.closest?.('[data-wheel="page-nav"]')
      if (pageTarget) {
        if (now - lastPageTime < 240) return
        lastPageTime = now
        if (e.cancelable) e.preventDefault()
        if (isUp) {
          handlePrevBookPage() // Yukarı: Sayfa Azalır
        } else {
          handleNextBookPage() // Aşağı: Sayfa Artar
        }
        return
      }

      // 2. Aa butonu üzerindeyse yazı boyutunu (font scale) değiştir
      const fontTarget = target?.closest?.('[data-wheel="font-scale"]')
      if (fontTarget) {
        if (now - lastFontTime < 140) return
        lastFontTime = now
        if (e.cancelable) e.preventDefault()
        changeFontScale(isUp ? 0.1 : -0.1)
        return
      }

      // 3. 1k / 2k / 3k chunk butonu üzerindeyse kelime öbeğini değiştir
      const chunkTarget = target?.closest?.('[data-wheel="chunk-size"]')
      if (chunkTarget) {
        if (now - lastChunkTime < 200) return
        lastChunkTime = now
        if (e.cancelable) e.preventDefault()
        handleChunkSizeChange(isUp ? Math.min(3, chunkSize + 1) : Math.max(1, chunkSize - 1))
        return
      }

      // 4. Bağlam penceresi (context peek) üzerindeyse sonraki / önceki bağlama geç
      // Farenin tekerleğiyle aşağı kaydırınca sonraki bağlam sayfasına ilerler, yukarı kaydırınca önceki bağlama döner
      const contextTarget = target?.closest?.('[data-wheel="context-peek"]')
      if (contextTarget) {
        if (now - lastContextTime < 200) return
        lastContextTime = now
        if (e.cancelable) e.preventDefault()
        if (isUp) {
          handleStepPrev() // Yukarı: Önceki bağlama dön
        } else {
          handleStepNext() // Aşağı: Sonraki bağlama ilerle
        }
        return
      }

      // 5. Diğer tüm alanlar: Varsayılan olarak okuma hızını (WPM) değiştir
      if (now - lastWpmTime < 60) return
      lastWpmTime = now
      if (e.cancelable) e.preventDefault()
      changeWpm(isUp ? WPM_STEP : -WPM_STEP)
    }

    window.addEventListener('wheel', handleGlobalWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', handleGlobalWheel)
    }
  }, [
    changeWpm,
    anyModalOpen,
    zen,
    handleNextBookPage,
    handlePrevBookPage,
    changeFontScale,
    handleChunkSizeChange,
    chunkSize,
    handleStepNext,
    handleStepPrev,
  ])

  // Dipnot ayarı değiştiğinde de kalınan kelimeyi koru
  const handleReadFootnotesChange = useCallback(
    (enabled: boolean) => {
      const activeWordIndex = chunks[index]?.startIndex ?? index
      const nextChunks = createChunks(text, chunkSize, { enableFootnotes: enabled, pageInfo })
      const nextIndex = findChunkIndexForWord(nextChunks, activeWordIndex)
      setReadFootnotes(enabled)
      setIndex(nextIndex)
    },
    [chunks, index, text, chunkSize, pageInfo],
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

    // 1, 2, 3 Kelime öbeği (Chunk) kısayolları: 1: 1 kelime, 2: 2 kelime, 3: 3 kelime
    if (
      e.code === 'Digit1' ||
      e.code === 'Digit2' ||
      e.code === 'Digit3' ||
      e.code === 'Numpad1' ||
      e.code === 'Numpad2' ||
      e.code === 'Numpad3'
    ) {
      e.preventDefault()
      const num = Number(e.key)
      if (num >= 1 && num <= 3) {
        handleChunkSizeChange(num)
        triggerHaptic('tap')
      }
      return
    }

    // T / t: Tasarım temasını sırayla değiştir (Cam -> Neon -> Kağıt -> Cam)
    if (e.code === 'KeyT') {
      e.preventDefault()
      const themeIndex = THEMES.findIndex((t) => t.id === theme)
      const nextTheme = THEMES[(themeIndex + 1) % THEMES.length]?.id ?? 'ios'
      handleThemeChange(nextTheme)
      triggerHaptic('tap')
      const themeName = THEMES.find((t) => t.id === nextTheme)?.name || nextTheme
      showAudioToast(`Tema: ${themeName}`)
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
      case 'KeyN':
        e.preventDefault()
        toggleNeuroAudio()
        break
      case 'KeyE':
        e.preventDefault()
        setSyncModalOpen((prev) => !prev)
        break
      case 'KeyG':
        e.preventDefault()
        handleEyeTrackingChange(!eyeTrackingEnabled)
        break
      case 'KeyS':
        e.preventDefault()
        if (playing) {
          setPlaying(false)
        }
        if (zen) {
          setZen(false)
        }
        window.dispatchEvent(new Event('open-page-search'))
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
    if (typeof settings.chunkSize === 'number') setChunkSize(Math.max(1, Math.min(3, settings.chunkSize)))
    if (typeof settings.wpm === 'number') setWpm(settings.wpm)
    if (typeof settings.readFootnotes === 'boolean') setReadFootnotes(settings.readFootnotes)
    if (typeof settings.bionicEnabled === 'boolean') setBionicEnabled(settings.bionicEnabled)
    // Ses modu varsayılan olarak daima kapalı başlar (Autoplay ve kullanıcı isteği gereği)
    setNeuroAudioEnabled(false)

    // Karekod veya Paylaşım URL'sinden Gelen Canlı Senkronizasyon Verilerini Çöz
    let urlTargetIndex: number | null = null
    let urlTargetPage: number | null = null
    let urlSyncDetails: string | null = null
    let urlChunk: string | null = null

    try {
      if (typeof window !== 'undefined' && window.location.search) {
        const params = new URLSearchParams(window.location.search)
        const urlSync = params.get('sync') || params.get('s')
        const urlIdx = params.get('idx') || params.get('i')
        const urlPage = params.get('p') || params.get('page')
        const urlWpm = params.get('wpm') || params.get('w')
        urlChunk = params.get('chunk') || params.get('c')
        const urlTheme = params.get('theme') || params.get('t')
        const urlFont = params.get('font') || params.get('f')
        const urlDid = params.get('did') || params.get('d')
        const urlDn = params.get('dn')
        const urlDt = (params.get('dt') as 'desktop' | 'mobile' | 'tablet') || 'desktop'

        if (urlDid && urlDn) {
          upsertPairedDevice({
            id: urlDid,
            name: urlDn,
            type: urlDt,
          })
        }

        if (urlSync && urlSync.trim()) {
          const cleanSync = urlSync.trim().toUpperCase()
          const formatted = cleanSync.startsWith('HZL-') ? cleanSync : `HZL-${cleanSync}`
          setSyncVaultId(formatted)
        }

        if (urlTheme) {
          const resolvedTheme: ThemeId =
            urlTheme === 'k' || urlTheme === 'kindle'
              ? 'kindle'
              : urlTheme === 'n' || urlTheme === 'l' || urlTheme === 'linear'
              ? 'linear'
              : 'ios'
          setTheme(resolvedTheme)
        }

        if (urlFont) {
          const resolvedFont: FontFace =
            urlFont === 's' || urlFont === 'sans'
              ? 'sans'
              : urlFont === 'r' || urlFont === 'serif'
              ? 'serif'
              : urlFont === 'm' || urlFont === 'mono'
              ? 'mono'
              : 'theme'
          setFontFace(resolvedFont)
        }

        if (urlChunk) {
          const parsedChunk = parseInt(urlChunk, 10)
          if ([1, 2, 3].includes(parsedChunk)) {
            setChunkSize(parsedChunk)
          }
        }

        if (urlWpm) {
          const parsedWpm = parseInt(urlWpm, 10)
          if (parsedWpm >= MIN_WPM && parsedWpm <= MAX_WPM) {
            setWpm(parsedWpm)
          }
        }

        if (urlIdx) {
          const parsedIdx = parseInt(urlIdx, 10)
          if (!isNaN(parsedIdx) && parsedIdx >= 0) {
            urlTargetIndex = parsedIdx
          }
        }

        if (urlPage) {
          const parsedPage = parseInt(urlPage, 10)
          if (!isNaN(parsedPage) && parsedPage > 0) {
            urlTargetPage = parsedPage
          }
        }

        if (urlSync || urlIdx || urlPage) {
          const parts = [
            urlTargetPage ? `Sayfa ${urlTargetPage}` : null,
            urlTargetIndex !== null ? `${urlTargetIndex + 1}. Kelime` : null,
          ].filter(Boolean)
          urlSyncDetails = parts.length > 0 ? parts.join(' • ') : 'Kaldığınız yer'

          // URL'yi temizle (temiz adres çubuğu için)
          const cleanPath = window.location.pathname
          window.history.replaceState({}, '', cleanPath)
        }
      }
    } catch {}

    const parsedChunkFromUrl = urlChunk ? parseInt(urlChunk, 10) : NaN
    const activeChunkSize = [1, 2, 3].includes(parsedChunkFromUrl)
      ? parsedChunkFromUrl
      : Math.max(1, Math.min(3, settings.chunkSize ?? 1))
    const activeFootnotes = settings.readFootnotes ?? true
    const hasMigratedDefaultBook =
      typeof window !== 'undefined' && localStorage.getItem('odak_default_yasamak_v6') === 'true'
    const lastDoc = loadLastActiveDoc()

    const isOldUnmigratedDoc =
      !hasMigratedDefaultBook &&
      (!lastDoc ||
        lastDoc.text === SAMPLE_TEXT ||
        /7478|yashamaq|yaşamak/i.test(lastDoc.title || '') ||
        lastDoc.text.includes('Bundan on yaş daha gençken'))

    if (isOldUnmigratedDoc) {
      try {
        localStorage.setItem('odak_default_yasamak_v6', 'true')
        saveLastActiveDoc(DEFAULT_BOOK_TEXT, DEFAULT_BOOK_TITLE, DEFAULT_BOOK_PAGE_INFO)
      } catch {}
      setText(DEFAULT_BOOK_TEXT)
      setDocTitle(DEFAULT_BOOK_TITLE)
      setPageInfo(DEFAULT_BOOK_PAGE_INFO)
      if (urlTargetIndex !== null) {
        const nextChunks = createChunks(DEFAULT_BOOK_TEXT, activeChunkSize, {
          enableFootnotes: activeFootnotes,
          pageInfo: DEFAULT_BOOK_PAGE_INFO,
        })
        const targetChunkIdx = findChunkIndexForWord(nextChunks, urlTargetIndex)
        setIndex(targetChunkIdx)
        if (urlSyncDetails) {
          showAudioToast(`Masaüstü ile eşitlendi (${urlSyncDetails})`)
        }
      } else {
        setIndex(0)
      }
    } else if (lastDoc && lastDoc.text) {
      const saved = loadReadingProgress(lastDoc.title, lastDoc.text)
      const resolvedPageInfo =
        lastDoc.text === DEFAULT_BOOK_TEXT
          ? DEFAULT_BOOK_PAGE_INFO
          : (lastDoc.pageInfo ?? saved?.pageInfo ?? null)
      setText(lastDoc.text)
      if (lastDoc.title) setDocTitle(lastDoc.title)
      setPageInfo(resolvedPageInfo)
      
      if (urlTargetIndex !== null) {
        const nextChunks = createChunks(lastDoc.text, activeChunkSize, {
          enableFootnotes: activeFootnotes,
          pageInfo: resolvedPageInfo,
        })
        const targetChunkIdx = findChunkIndexForWord(nextChunks, urlTargetIndex)
        setIndex(targetChunkIdx)
        saveReadingProgress(lastDoc.title || DEFAULT_BOOK_TITLE, lastDoc.text, urlTargetIndex, resolvedPageInfo)
        if (urlSyncDetails) {
          showAudioToast(`Masaüstü ile eşitlendi (${urlSyncDetails})`)
        }
      } else if (saved && (saved.wordIndex > 0 || saved.index > 0)) {
        const initialChunks = createChunks(lastDoc.text, activeChunkSize, {
          enableFootnotes: activeFootnotes,
          pageInfo: resolvedPageInfo,
        })
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
          pageInfo,
        )
      },
      playing ? 2000 : 250,
    )

    return () => clearTimeout(timer)
  }, [index, playing, docTitle, text, chunks.length, words.length, chunkSize, wpm, currentChunk, pageInfo])

  const applyText = useCallback(
    (next: string, title?: string, nextPageInfo?: BookPageInfo | null) => {
      const cleanTitle = title?.trim()
      const nextTitle = cleanTitle && cleanTitle !== 'odak' ? cleanTitle : 'Hızlı Okuma Penceresi'
      const saved = loadReadingProgress(nextTitle, next)
      const resolvedPageInfo =
        nextPageInfo !== undefined
          ? nextPageInfo
          : next === DEFAULT_BOOK_TEXT
            ? DEFAULT_BOOK_PAGE_INFO
            : (saved?.pageInfo ?? null)
      setText(next)
      setDocTitle(nextTitle)
      setPageInfo(resolvedPageInfo)
      setPlaying(false)
      setSheetOpen(false)
      setCompletionOpen(false)
      wordsReadSinceRestRef.current = 0
      sessionElapsedSecsRef.current = 0
      sessionStartTimeRef.current = null

      const newChunks = createChunks(next, chunkSize, {
        enableFootnotes: readFootnotes,
        pageInfo: resolvedPageInfo,
      })
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

  // Kindle Bildirimine tıklandığında yumuşak ve zarif geçişle kalınan yere atla veya metne geç
  const handleApplyKindleSync = useCallback(() => {
    if (!kindleSyncPrompt) return
    const targetPrompt = kindleSyncPrompt
    dismissKindleSync()
    triggerHaptic('jump')
    triggerPulse()
    recordLocalActivity()
    prevSessionLastActiveRef.current = Date.now()

    if (typeof targetPrompt.wpm === 'number') {
      setWpm(targetPrompt.wpm)
    }
    if (targetPrompt.theme && ['ios', 'linear', 'kindle'].includes(targetPrompt.theme)) {
      handleThemeChange(targetPrompt.theme as ThemeId)
    }
    if (targetPrompt.fontFace && ['theme', 'sans', 'serif', 'mono'].includes(targetPrompt.fontFace)) {
      setFontFace(targetPrompt.fontFace as FontFace)
    }

    const targetChunkSize =
      typeof targetPrompt.chunkSize === 'number' && [1, 2, 3].includes(targetPrompt.chunkSize)
        ? targetPrompt.chunkSize
        : chunkSize

    if (targetChunkSize !== chunkSize) {
      setChunkSize(targetChunkSize)
    }

    const details = [
      targetPrompt.pageNumber ? `Sayfa ${targetPrompt.pageNumber}` : null,
      typeof targetPrompt.wordIndex === 'number' && targetPrompt.wordIndex >= 0
        ? `${targetPrompt.wordIndex + 1}. kelime`
        : null,
    ].filter(Boolean).join(' • ')

    // 1. FARKLI METİN / PDF DURUMUNDA GEÇİŞ:
    if (targetPrompt.isDifferentDoc && targetPrompt.docTitle) {
      const foundDoc = findDocumentByTitle(targetPrompt.docTitle)
      if (foundDoc) {
        applyText(foundDoc.text, foundDoc.title, foundDoc.pageInfo)
        const nextChunks = createChunks(foundDoc.text, targetChunkSize, {
          enableFootnotes: readFootnotes,
          pageInfo: foundDoc.pageInfo,
        })
        const targetChunkIdx = findChunkIndexForWord(nextChunks, targetPrompt.wordIndex)
        seek(targetChunkIdx)
        showAudioToast(`"${foundDoc.title}" metnine geçildi (${details || 'Başlangıç'})`)
      } else {
        showAudioToast(`"${targetPrompt.docTitle}" dosyasını bu cihazda açtığınızda kaldığınız yerden devam edilecek`)
      }
      return
    }

    // 2. AYNI METİNDE KALINAN YERE ATLA:
    if (typeof targetPrompt.wordIndex === 'number' && targetPrompt.wordIndex >= 0) {
      const nextChunks = createChunks(text, targetChunkSize, { enableFootnotes: readFootnotes, pageInfo })
      const targetChunkIdx = findChunkIndexForWord(nextChunks, targetPrompt.wordIndex)
      seek(targetChunkIdx)
      showAudioToast(`Eşitlendi (${details || 'Kalınan yer'})`)
    }
  }, [kindleSyncPrompt, triggerPulse, seek, chunkSize, text, readFootnotes, pageInfo, handleThemeChange, showAudioToast, dismissKindleSync, applyText, recordLocalActivity])

  // Cihaz Eşleşme ve Ayrılma Canlı Bildirimleri (Zen Modu Hariç)
  useEffect(() => {
    const handlePairedDevicesUpdated = (e: Event) => {
      if (zenRef.current) return // Zen modu hariç

      const customEvent = e as CustomEvent<{
        deviceId?: string
        deviceName?: string
        isNew?: boolean
        isRemoved?: boolean
      }>

      if (customEvent.detail?.isNew && customEvent.detail.deviceName) {
        showAudioToast(`✓ ${customEvent.detail.deviceName} bağlandı`)
        triggerHaptic('success')
      } else if (customEvent.detail?.isRemoved && customEvent.detail.deviceName) {
        showAudioToast(`${customEvent.detail.deviceName} ile eşleşme sonlandı`)
        triggerHaptic('warning')
      }
    }

    const handleDeviceUnpaired = (e: Event) => {
      if (zenRef.current) return // Zen modu hariç
      const customEvent = e as CustomEvent<{ senderDeviceId?: string; senderDeviceName?: string }>
      const devName = customEvent.detail?.senderDeviceName || 'Diğer cihaz'
      showAudioToast(`${devName} ile eşleşme sonlandı`)
      triggerHaptic('warning')
    }

    window.addEventListener('paired-devices-updated', handlePairedDevicesUpdated)
    window.addEventListener('device-unpaired-notify', handleDeviceUnpaired)
    return () => {
      window.removeEventListener('paired-devices-updated', handlePairedDevicesUpdated)
      window.removeEventListener('device-unpaired-notify', handleDeviceUnpaired)
    }
  }, [showAudioToast])

  useEffect(() => {
    const manager = new SyncChannelManager((payload) => {
      const myVault = getSyncVaultId()
      if (sanitizeVaultId(payload.vaultId) !== sanitizeVaultId(myVault)) return

      // İlerleme paketi geldiyse: Ekranı aniden zıplatmak yerine Kindle tarzı zarif bildirim göster
      if (payload.type === 'progress' || !payload.type) {
        if (playingRef.current) return // Okuma devam ederken dikkat dağıtma

        const curTitle = docTitleRef.current
        const isSameDoc = isSameDocument(curTitle, payload.docTitle)
        const targetIdx = typeof payload.wordIndex === 'number' ? payload.wordIndex : -1
        const curWordIdx = chunksRef.current[indexRef.current]?.startIndex ?? indexRef.current
        const remoteTs = payload.timestamp || Date.now()
        const lastLocalActiveTs = prevSessionLastActiveRef.current || 0

        // 1. KURAL: AYNI METİN / AYNI PDF DURUMU
        // KULLANICI KURALI: Yalnızca karşı cihaz mevcut cihazdan DAHA İLERİDEYSE uyar.
        // "Çünkü tablette çıkmasına gerek yok, zaten tablette en öndeyim. Kitapta ya da metinde ilerideyim okumuşum bir sunumu. Okuma olarak geride olanlar uyarı alsın."
        if (isSameDoc) {
          // Eğer karşı cihaz mevcut cihazdan daha ileride DEĞİLSE, KESİNLİKLE uyarı gösterme!
          if (targetIdx <= curWordIdx) return

          // Kullanıcı bu konumu daha önce kapattıysa tekrar rahatsız etme
          const syncKey = `${payload.docTitle || ''}_${targetIdx}`
          if (dismissedSyncKeyRef.current === syncKey) return

          // Eğer ekranda halihazırda bir uyarı varsa ve o uyarı bu yeni gelen pozisyondan daha ilerideyse değiştirme
          if (kindleSyncPromptRef.current) {
            const existing = kindleSyncPromptRef.current
            if (!existing.isDifferentDoc && existing.wordIndex >= targetIdx) {
              return
            }
          }

          triggerHaptic('tap')
          const promptData = {
            deviceName: payload.senderDeviceName || 'Diğer Cihazınız',
            deviceType: payload.senderDeviceType || 'desktop',
            docTitle: payload.docTitle || curTitle,
            isDifferentDoc: false,
            wordIndex: targetIdx,
            pageNumber: payload.pageNumber,
            wpm: payload.wpm,
            chunkSize: payload.chunkSize,
            theme: payload.theme,
            fontFace: payload.fontFace,
            timestamp: remoteTs,
          }
          setKindleSyncPrompt(promptData)
          kindleSyncPromptRef.current = promptData

          if (kindleSyncTimerRef.current) clearTimeout(kindleSyncTimerRef.current)
          kindleSyncTimerRef.current = setTimeout(() => {
            setKindleSyncPrompt(null)
            kindleSyncPromptRef.current = null
          }, 16000) // İki katı süre (16 sn)
          return
        }

        // 2. KURAL: FARKLI METİN / FARKLI PDF DURUMU
        // KULLANICI KURALI: En son kullanılan cihaz haricindeki diğer yeni açılan cihazda uyarı olsun.
        // Örneğin masaüstünde açıp 10 dk sonra tekrar açtığımda masaüstünde uyarı görmeyeyim.
        // Ama arada tabletten açıp başka metinlere gittiysem bunu masaüstünü açtığımda göreyim.
        if (!isSameDoc) {
          // Yalnızca karşı cihazdaki etkinlik, bu cihazdaki son aktif oturumdan DAHA YENİYSE uyar!
          // Eğer bu cihaz kapatıldıktan sonra başka cihazda hiçbir şey açılmadıysa UYARI ÇIKMAZ.
          if (remoteTs <= lastLocalActiveTs) return

          const syncKey = `diff_${payload.docTitle || ''}_${targetIdx}_${remoteTs}`
          if (dismissedSyncKeyRef.current === syncKey) return

          // Eğer ekranda zaten bir farklı metin uyarısı varsa ve bu yeni gelenden daha yeniyse değiştirme
          if (kindleSyncPromptRef.current) {
            const existing = kindleSyncPromptRef.current
            if (existing.isDifferentDoc && existing.timestamp >= remoteTs) {
              return
            }
          }

          triggerHaptic('tap')
          const promptData = {
            deviceName: payload.senderDeviceName || 'Diğer Cihazınız',
            deviceType: payload.senderDeviceType || 'desktop',
            docTitle: payload.docTitle || 'Başka Bir Belge',
            isDifferentDoc: true,
            wordIndex: targetIdx,
            pageNumber: payload.pageNumber,
            wpm: payload.wpm,
            chunkSize: payload.chunkSize,
            theme: payload.theme,
            fontFace: payload.fontFace,
            timestamp: remoteTs,
          }
          setKindleSyncPrompt(promptData)
          kindleSyncPromptRef.current = promptData

          if (kindleSyncTimerRef.current) clearTimeout(kindleSyncTimerRef.current)
          kindleSyncTimerRef.current = setTimeout(() => {
            setKindleSyncPrompt(null)
            kindleSyncPromptRef.current = null
          }, 16000) // İki katı süre (16 sn)
        }
      }
    })

    syncManagerRef.current = manager
    // İlk açılışta diğer bağlı cihazlara hemen varlığımızı duyur
    const initialPresenceTimer = setTimeout(() => {
      manager.broadcastPresence()
      broadcastSyncState()
    }, 400)

    return () => {
      clearTimeout(initialPresenceTimer)
      manager.destroy()
      syncManagerRef.current = null
      if (kindleSyncTimerRef.current) {
        clearTimeout(kindleSyncTimerRef.current)
      }
    }
  }, [])

  // Okuma duraklatıldığında veya değiştiğinde diğer eşleşmiş cihazlara son durumu ilet
  useEffect(() => {
    if (!playing) {
      broadcastSyncState()
    }
  }, [playing, broadcastSyncState])

  // Okuma esnasında düzenli periyotla (3 saniyede bir) buluta pozisyon yedekle (Telefon kapanırsa bile son 2-3 saniye korunur)
  useEffect(() => {
    if (!playing) return
    const interval = setInterval(() => {
      broadcastSyncState()
    }, 3000)
    return () => clearInterval(interval)
  }, [playing, broadcastSyncState])

  const textControlElement = useMemo(
    () => (
      <TextSheet
        open={sheetOpen}
        initialText={text}
        onToggle={handleToggleSheet}
        onClose={handleCloseSheet}
        onApply={(newText, title, nextPageInfo) => {
          applyText(newText, title, nextPageInfo)
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
        onOpenSync={() => setSyncModalOpen(true)}
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

      {/* Tematik Sağ Alt Köşe Sayfa Kıvrımları (Her zaman arka planda / z-0) */}
      <PaperCornerCurl
        visible={theme === 'kindle'}
        zen={zen}
        canJumpPage={canJumpPage}
        onPageCurlClick={handleNextBookPage}
      />
      <GlassCornerCurl
        visible={theme === 'ios'}
        zen={zen}
        canJumpPage={canJumpPage}
        onPageCurlClick={handleNextBookPage}
      />
      <NeonCornerCurl
        visible={theme === 'linear'}
        zen={zen}
        canJumpPage={canJumpPage}
        onPageCurlClick={handleNextBookPage}
      />

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

      {/* Kindle Tarzı Kesintisiz ve Zarif Cihazlar Arası Eşitleme Bildirimi (16 sn sonra kendiliğinden kaybolur) */}
      {kindleSyncPrompt && !zen && (
        <div className="fixed top-[max(4.25rem,calc(env(safe-area-inset-top,0px)+3.75rem))] sm:top-16 inset-x-0 z-[70] flex justify-center px-3 pointer-events-none animate-in fade-in slide-in-from-top-3 duration-300">
          <div
            onClick={handleApplyKindleSync}
            className="pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl border border-primary/50 bg-background/98 shadow-2xl backdrop-blur-xl cursor-pointer hover:border-primary hover:scale-[1.01] active:scale-[0.99] transition-all max-w-sm sm:max-w-md w-full text-foreground ring-2 ring-primary/25"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8.5 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 shadow-inner">
                {kindleSyncPrompt.deviceType === 'mobile' ? (
                  <Smartphone className="size-5 text-sky-500" />
                ) : kindleSyncPrompt.deviceType === 'tablet' ? (
                  <Tablet className="size-5 text-purple-500" />
                ) : (
                  <Laptop className="size-5 text-emerald-500" />
                )}
              </div>
              <div className="min-w-0 text-left">
                <div className="text-xs font-bold truncate flex items-center gap-1.5">
                  <span>
                    {kindleSyncPrompt.isDifferentDoc
                      ? `${kindleSyncPrompt.deviceName} cihazınızda başka bir metindesiniz`
                      : `${kindleSyncPrompt.deviceName} cihazında kaldınız`}
                  </span>
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <div className="text-[11px] text-muted-foreground font-mono truncate">
                  {kindleSyncPrompt.isDifferentDoc ? (
                    <span>
                      {kindleSyncPrompt.docTitle}
                      {kindleSyncPrompt.pageNumber ? ` • Sayfa ${kindleSyncPrompt.pageNumber}` : ''}
                      {typeof kindleSyncPrompt.wordIndex === 'number' && kindleSyncPrompt.wordIndex >= 0
                        ? ` • ${kindleSyncPrompt.wordIndex + 1}. kelime`
                        : ''}
                    </span>
                  ) : (
                    <span>
                      {kindleSyncPrompt.pageNumber ? `Sayfa ${kindleSyncPrompt.pageNumber} • ` : ''}
                      {kindleSyncPrompt.wordIndex + 1}. kelimedesiniz
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md flex items-center gap-1 hover:bg-primary/90 transition-all cursor-pointer active:scale-95"
              >
                {kindleSyncPrompt.isDifferentDoc ? 'Bu Metne Geç →' : 'Oraya Git →'}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  dismissKindleSync()
                }}
                className="ctl size-7 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
                title="Kapat"
                aria-label="Kapat"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <main
        className={cn(
          'absolute inset-0 pointer-events-none flex flex-col items-center justify-center overflow-hidden px-4 transition-[padding] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] sm:px-8 landscape-short:px-3',
          zen ? 'pb-0' : 'pb-5 landscape-short:pb-1.5',
        )}
        style={{
          paddingTop: zen ? 0 : headerHeight,
        }}
      >
        <div className="relative flex h-full w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl flex-col items-center justify-between py-1 sm:py-2 landscape-short:py-0.5 transition-[max-width] duration-300 min-h-0 pointer-events-none">
          {/* Üst Dengeleyici */}
          <div className="flex-1 w-full min-h-0 pointer-events-none select-none" />

          {/* Okuma Penceresi */}
          <div className="w-full shrink-0 flex flex-col items-center pointer-events-auto">
            {showSpeedTestBanner && !zen && (
              <div className="relative z-30 mb-2 sm:mb-2.5 flex w-full max-w-xs items-center justify-between gap-2 rounded-full border border-border/50 bg-background/50 px-3 py-1 shadow-2xs backdrop-blur-sm animate-in fade-in slide-in-from-top-1 duration-300">
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
          <div
            data-wheel="context-peek"
            className="context-peek-box relative z-30 w-full max-w-3xl shrink-0 mt-1.5 sm:mt-3 md:mt-4 landscape-short:mt-0.5 min-h-[84px] sm:min-h-[116px] md:min-h-[136px] max-h-[102px] sm:max-h-[148px] md:max-h-[172px] landscape-short:min-h-[76px] landscape-short:max-h-[92px] flex flex-col overflow-visible pointer-events-auto"
          >
            <ContextPeek
              words={words}
              chunks={chunks}
              pageInfo={pageInfo}
              theme={theme}
              index={currentChunk?.startIndex ?? index}
              chunkSize={chunkSize}
              visible={!zen && words.length > 0}
              bookPageLabel={
                !zen && pageInfo && currentChunk?.pageNumber
                  ? `sf: ${currentChunk.pageNumber}/${pageInfo.totalBookPages}`
                  : undefined
              }
              remainingTime={
                !zen ? `${formatRemaining(chunks.length - index - 1, wpm, chunkSize)} kaldı` : undefined
              }
              onJump={handleContextJump}
              onSeekChunk={seek}
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

      {/* Nöroakustik Odak Sesi / Cihaz Senkronizasyon / Kısayol Durum Bildirimi (Toast HUD - Zen Modu Hariç) */}
      {audioToast && !zen && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed top-7 left-1/2 -translate-x-1/2 z-[80] animate-in fade-in slide-in-from-top-1 duration-200 select-none"
        >
          <div className="flex items-center gap-2 rounded-full border border-border/80 bg-background/95 px-4 py-1.5 font-sans text-xs font-semibold text-foreground shadow-2xl backdrop-blur-md">
            {audioToast.includes('Nöro-Odak') &&
              (neuroAudioEnabled ? (
                <Volume2 className="size-3.5 text-primary" />
              ) : (
                <VolumeX className="size-3.5 text-muted-foreground" />
              ))}
            {(audioToast.includes('Göz') ||
              audioToast.includes('Dikkat') ||
              audioToast.includes('Ekrandan') ||
              audioToast.includes('Baş') ||
              audioToast.includes('Ekrana') ||
              audioToast.includes('Yorgunluk') ||
              audioToast.includes('Kamera')) &&
              (eyeTrackingEnabled ? (
                <Eye className="size-3.5 text-emerald-500" />
              ) : (
                <EyeOff className="size-3.5 text-muted-foreground" />
              ))}
            {(audioToast.includes('bağlandı') || audioToast.includes('eşleşti') || audioToast.includes('Eşleşti')) && (
              <Check className="size-3.5 text-emerald-500" />
            )}
            {(audioToast.includes('sonlandı') || audioToast.includes('kaldırıldı')) && (
              <X className="size-3.5 text-amber-500" />
            )}
            {audioToast.includes('Eşitlendi') && (
              <Bookmark className="size-3.5 text-sky-500" />
            )}
            <span>{audioToast}</span>
          </div>
        </div>
      )}

      {/* Görünmez Web Kamerası Tabanlı Göz Kırpma & Dikkat İzleme Motoru */}
      <EyeTracker
        enabled={eyeTrackingEnabled}
        onBlinkOrLookAway={handleBlinkOrLookAway}
        onAttentionRestored={handleAttentionRestored}
        onMicroBlink={handleMicroBlink}
        onPermissionDenied={handleEyePermissionDenied}
        onTrackingStatusChange={handleEyeTrackingStatusChange}
      />

      {/* Okuma Sırasında ve Duraklatılmış Ekranda Dokunma ve Hız Kontrolü Katmanı */}
      {!anyModalOpen && !sheetOpen && !fontOpen && (
        <div
          ref={zenOverlayRef}
          onTouchStart={handleZenTouchStart}
          onTouchEnd={handleZenTouchEnd}
          onTouchCancel={handleZenTouchEnd}
          style={{
            top: zen ? 0 : headerHeight,
            bottom: zen ? 0 : 'calc(min(115px, 18vh) + env(safe-area-inset-bottom, 0px))',
          }}
          className={cn(
            'fixed inset-x-0 z-20 flex select-none pointer-events-auto touch-none overscroll-none',
            zen && 'inset-0',
          )}
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

          {/* Orta %50: Başlat / Duraklat (Tıklama) & Hız Ayarı (Dikey Kaydırma / Swipe) */}
          <button
            type="button"
            aria-label={playing ? 'Okumayı duraklat' : 'Okumaya başla'}
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

      <SyncModal
        open={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        onDeviceRemoved={(devId, devName) => {
          syncManagerRef.current?.broadcastUnpair(devId, devName)
          showAudioToast(`${devName} ile eşleşme sonlandı`)
        }}
        index={currentChunk?.startIndex ?? index}
        pageNumber={currentChunk?.pageNumber ?? pageInfo?.currentPage}
        wpm={wpm}
        chunkSize={chunkSize}
        theme={theme}
        fontFace={fontFace}
        onManualSyncCodeApplied={(newCode) => {
          showAudioToast(`Eşleşme Kodu: ${newCode}`)
          syncManagerRef.current?.updateVaultId(newCode)
          broadcastSyncState()
        }}
        onApplySyncUrlParams={(params) => {
          if (params.vaultId) {
            syncManagerRef.current?.updateVaultId(params.vaultId)
          }
          if (typeof params.wpm === 'number') {
            setWpm(params.wpm)
          }
          if (params.theme) {
            handleThemeChange(params.theme as ThemeId)
          }
          if (params.fontFace) {
            setFontFace(params.fontFace as FontFace)
          }

          const targetChunkSize =
            typeof params.chunkSize === 'number' && [1, 2, 3].includes(params.chunkSize)
              ? params.chunkSize
              : chunkSize

          if (targetChunkSize !== chunkSize) {
            setChunkSize(targetChunkSize)
          }

          if (typeof params.index === 'number') {
            const nextChunks = createChunks(text, targetChunkSize, { enableFootnotes: readFootnotes, pageInfo })
            const targetChunkIdx = findChunkIndexForWord(nextChunks, params.index)
            seek(targetChunkIdx)
          }

          const details = [
            params.pageNumber ? `Sayfa ${params.pageNumber}` : null,
            typeof params.index === 'number' ? `${params.index + 1}. Kelime` : null,
          ].filter(Boolean).join(' • ')
          showAudioToast(`Eşitlendi (${details || 'Kaldığınız yer'})`)

          setTimeout(() => {
            syncManagerRef.current?.broadcastPresence()
            broadcastSyncState()
          }, 300)
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
