'use client'

import { Check, Play, RotateCcw, Timer, X, Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type SpeedTestModalProps = {
  open: boolean
  onClose: () => void
  onApplySpeed: (newWpm: number) => void
}

const SPEED_TEST_PASSAGE = `Okuma eylemi, insan zihninin geliştirdiği en büyüleyici bilişsel mucizelerden biridir. Sayfadaki siyah semboller, göz merceğinden geçerek retinaya düşer ve saniyeler içinde zihnimizde canlanan renklere, seslere ve derin duygulara dönüşür.

Geleneksel okuma alışkanlığında gözlerimiz her kelimede duraklar ve satır boyunca sürekli sağa sola sıçramalar yapar. Bu istemsiz geri dönüşler ve duraksamalar, toplam okuma süremizin üçte ikisini sessizce tüketir.

Odak RSVP teknolojisi ise göz kaslarının bu yorucu mekanik hareketini ortadan kaldırır. Kelimeleri sabit bir odak noktasında doğrudan zihninize aktararak sadece kavrama ve anlamaya odaklanmanızı sağlar. Böylece iç sesiniz yatışır, dikkat dağınıklığı kaybolur ve düşünme hızınızla okuma hızınız ilk kez birbiriyle eşitlenir.`

const PASSAGE_WORD_COUNT = SPEED_TEST_PASSAGE.trim().split(/\s+/).length

export function SpeedTestModal({ open, onClose, onApplySpeed }: SpeedTestModalProps) {
  if (!open) return null
  return <SpeedTestBody onClose={onClose} onApplySpeed={onApplySpeed} />
}

function SpeedTestBody({ onClose, onApplySpeed }: Omit<SpeedTestModalProps, 'open'>) {
  const [status, setStatus] = useState<'intro' | 'reading' | 'result'>('intro')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [traditionalWpm, setTraditionalWpm] = useState(0)
  const [recommendedWpm, setRecommendedWpm] = useState(250)

  const startTimeRef = useRef<number | null>(null)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // ESC ile kapatma
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [])

  const handleStart = () => {
    startTimeRef.current = Date.now()
    setElapsedSeconds(0)
    setStatus('reading')

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    timerIntervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const secs = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setElapsedSeconds(secs)
      }
    }, 200)
  }

  const handleFinish = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)

    const totalMs = startTimeRef.current ? Date.now() - startTimeRef.current : 1000
    const finalSeconds = Math.max(3, totalMs / 1000)
    setElapsedSeconds(Math.round(finalSeconds))

    // Geleneksel WPM hesabı: (Kelime Sayısı / Saniye) * 60
    const rawWpm = Math.round((PASSAGE_WORD_COUNT / finalSeconds) * 60)
    const clampedRaw = Math.min(800, Math.max(80, rawWpm))
    setTraditionalWpm(clampedRaw)

    // RSVP Çarpanı: Göz sıçraması (sakkad) ortadan kalktığı için +%25 başlangıç bonusu, 25'lik kademeye yuvarlanır
    const rsvpTarget = clampedRaw * 1.25
    const roundedRsvp = Math.min(1000, Math.max(100, Math.round(rsvpTarget / 25) * 25))
    setRecommendedWpm(roundedRsvp)

    setStatus('result')
  }

  const handleApply = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('odak_speed_test_completed', 'true')
        localStorage.setItem('odak_baseline_wpm', String(traditionalWpm))
        localStorage.setItem('odak_recommended_wpm', String(recommendedWpm))
      } catch {}
    }
    onApplySpeed(recommendedWpm)
    onClose()
  }

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6 landscape-short:items-center landscape-short:p-2">
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="speed-test-title"
        className="panel relative z-10 flex max-h-[92dvh] w-full max-w-xl flex-col gap-4 overflow-y-auto p-5 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200 rounded-t-3xl sm:rounded-3xl border border-border/80"
      >
        {/* Üst Başlık ve Kapatma Butonu */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
              <Zap className="size-4 fill-amber-500/30" />
            </div>
            <div>
              <h2 id="speed-test-title" className="text-sm sm:text-base font-bold tracking-tight">
                Okuma Hızı Testi & Kalibrasyon
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Doğal okuma hızınızı ölçüp en ideal RSVP başlangıç noktasını belirleyin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ctl size-8 rounded-full text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Kapat"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 1. ADIM: GİRİŞ / HAZIRLIK */}
        {status === 'intro' && (
          <div className="flex flex-col gap-4 py-2">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-xs sm:text-sm leading-relaxed text-foreground/90 space-y-2">
              <p className="font-semibold text-foreground">Nasıl Çalışır?</p>
              <p>
                Aşağıdaki butona tıkladığınızda <strong>{PASSAGE_WORD_COUNT} kelimelik</strong> kısa ve akıcı bir metin belirecek ve kronometre başlayacaktır.
              </p>
              <p className="text-muted-foreground">
                Metni yarışır gibi aceleyle değil, <strong>her zamanki doğal okuma hızınızla ve anlayarak</strong> okuyun. Okumayı bitirdiğiniz anda <em>"Metni Bitirdim"</em> butonuna basın.
              </p>
            </div>

            <button
              type="button"
              onClick={handleStart}
              className="ctl ctl-primary flex h-11 sm:h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold shadow-md cursor-pointer transition-all hover:scale-[1.01]"
            >
              <Play className="size-4 fill-current" />
              <span>Testi Başlat</span>
            </button>
          </div>
        )}

        {/* 2. ADIM: OKUMA AŞAMASI */}
        {status === 'reading' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1 text-xs font-mono text-muted-foreground">
              <span>{PASSAGE_WORD_COUNT} kelime</span>
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Timer className="size-3.5 text-primary animate-pulse" />
                <span>{formatTimer(elapsedSeconds)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-background/80 p-4 sm:p-5 text-sm sm:text-base leading-relaxed text-foreground font-reader select-none">
              {SPEED_TEST_PASSAGE.split('\n\n').map((paragraph, idx) => (
                <p key={idx} className={cn(idx > 0 && 'mt-3')}>
                  {paragraph}
                </p>
              ))}
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="ctl ctl-primary flex h-11 sm:h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold shadow-md cursor-pointer transition-all hover:scale-[1.01]"
            >
              <Check className="size-4 stroke-[2.5]" />
              <span>Metni Bitirdim</span>
            </button>
          </div>
        )}

        {/* 3. ADIM: SONUÇ VE KALİBRASYON */}
        {status === 'result' && (
          <div className="flex flex-col gap-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-muted/20 p-3.5 sm:p-4 text-center">
                <span className="text-[11px] font-medium text-muted-foreground">Geleneksel Hızınız</span>
                <span className="mt-1 font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {traditionalWpm}
                </span>
                <span className="text-[10px] text-muted-foreground">kelime / dakika</span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 p-3.5 sm:p-4 text-center shadow-xs">
                <span className="text-[11px] font-semibold text-primary">Önerilen Odak (RSVP)</span>
                <span className="mt-1 font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
                  {recommendedWpm}
                </span>
                <span className="text-[10px] text-primary/80">kelime / dakika</span>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
              <p>
                <strong className="text-foreground">Neden daha hızlı?</strong> Geleneksel okumada sürenin çoğu gözün satırda sıçramasıyla kaybolur. RSVP teknolojisinde göz kası yorgunluğu olmadığı için doğal hızınızın <strong>%25 üzerinde</strong> başlamanız en ideal kavrama ve hız dengesini sunar.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleStart}
                className="ctl flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                title="Testi Tekrarla"
              >
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline">Tekrarla</span>
              </button>

              <button
                type="button"
                onClick={handleApply}
                className="ctl ctl-primary flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold shadow-md cursor-pointer transition-all hover:scale-[1.01]"
              >
                <Check className="size-4" />
                <span>Bu Hızı Uygula ve Başla</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
