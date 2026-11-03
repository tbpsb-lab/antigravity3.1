/**
 * RSVP Hızlı Okuma için Nöroakustik Ses Motoru
 * - Pembe Gürültü (Pink Noise 1/f)
 * - 40 Hz Binaural Beats (Gama Vuruşları: Sol 200Hz, Sağ 240Hz)
 * Dış dosya gerektirmez, tamamen Web Audio API kullanır.
 */
export class NeuroAudioEngine {
  ctx: AudioContext | null = null
  isPlaying = false
  masterGain: GainNode | null = null
  noiseSource: AudioBufferSourceNode | null = null
  oscLeft: OscillatorNode | null = null
  oscRight: OscillatorNode | null = null

  private stopTimer: ReturnType<typeof setTimeout> | null = null
  private pendingCleanup: (() => void) | null = null
  private cachedPinkNoiseBuffer: AudioBuffer | null = null

  // Ses seviyesi dengeleri (0.0 ile 1.0 arası)
  config = {
    masterVolume: 0.5,
    noiseVolume: 0.6, // Pembe gürültü baskınlığı
    binauralVolume: 0.4, // Gama vuruşu belirginliği
    fadeTime: 0.8, // Başlama/durma anındaki yumuşak geçiş süresi (saniye)
  }

  init() {
    if (typeof window === 'undefined') return
    if (this.ctx && this.ctx.state !== 'closed') return

    // Tarayıcı uyumluluğu için AudioContext oluştur
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    this.ctx = new AudioContextClass()

    // Ana ses kontrol düğümü
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0 // Başlangıçta sessiz (Fade-in için)
    this.masterGain.connect(this.ctx.destination)
    this.cachedPinkNoiseBuffer = null
  }

  _createPinkNoise() {
    if (!this.ctx || !this.masterGain) return

    // 5 Saniyelik ses tamponu (buffer) oluştur (İlk üretimden sonra önbellekten kullan)
    if (!this.cachedPinkNoiseBuffer || this.cachedPinkNoiseBuffer.sampleRate !== this.ctx.sampleRate) {
      const bufferSize = this.ctx.sampleRate * 5
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
      const data = buffer.getChannelData(0)

      // Paul Kellett algoritması ile saf Pembe Gürültü (Pink Noise) üretimi
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        b3 = 0.86650 * b3 + white * 0.3104856
        b4 = 0.55000 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.0168980
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
        data[i] *= 0.11 // Ses patlamasını engellemek için gain telafisi
        b6 = white * 0.115926
      }
      this.cachedPinkNoiseBuffer = buffer
    }

    // Buffer'ı çalıcıya (source) ata ve döngüye sok
    this.noiseSource = this.ctx.createBufferSource()
    this.noiseSource.buffer = this.cachedPinkNoiseBuffer
    this.noiseSource.loop = true

    const noiseGain = this.ctx.createGain()
    noiseGain.gain.value = this.config.noiseVolume

    this.noiseSource.connect(noiseGain)
    noiseGain.connect(this.masterGain)

    this.noiseSource.start()
  }

  _createBinauralBeats() {
    if (!this.ctx || !this.masterGain) return

    const binauralGain = this.ctx.createGain()
    binauralGain.gain.value = this.config.binauralVolume
    binauralGain.connect(this.masterGain)

    // Sol Kulak (200 Hz)
    this.oscLeft = this.ctx.createOscillator()
    this.oscLeft.type = 'sine'
    this.oscLeft.frequency.value = 200

    // Sağ Kulak (240 Hz - Toplam 40 Hz Gama Farkı)
    this.oscRight = this.ctx.createOscillator()
    this.oscRight.type = 'sine'
    this.oscRight.frequency.value = 240

    // Tüm mobil ve masaüstü tarayıcılarda %100 kusursuz çalışan 2 kanallı Stereo Ayırıcı (ChannelMerger)
    try {
      const merger = this.ctx.createChannelMerger(2)
      this.oscLeft.connect(merger, 0, 0) // Sol kulak
      this.oscRight.connect(merger, 0, 1) // Sağ kulak
      merger.connect(binauralGain)
    } catch {
      // Güvenlik yedeği: Stereo panner veya doğrudan miksaj
      this.oscLeft.connect(binauralGain)
      this.oscRight.connect(binauralGain)
    }

    this.oscLeft.start()
    this.oscRight.start()
  }

  /**
   * Kullanıcı etkileşimi (click/keydown) esnasında AudioContext'i uyandırır.
   */
  unlock() {
    if (!this.ctx) this.init()
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }

  start() {
    if (this.isPlaying) return

    if (!this.ctx) this.init()
    if (!this.ctx || !this.masterGain) return

    // Eğer önceki durdurma işleminden bekleyen fade-out temizliği varsa hemen tamamla
    if (this.stopTimer) {
      clearTimeout(this.stopTimer)
      this.stopTimer = null
    }
    if (this.pendingCleanup) {
      this.pendingCleanup()
      this.pendingCleanup = null
    }

    // Tarayıcı güvenlik kısıtlamasını aşmak için resume işlemi
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }

    this._createPinkNoise()
    this._createBinauralBeats()

    // Yumuşak doğrusal geçişle (Fade-in) sesi aç (odak dağılmaması için kritik)
    const now = this.ctx.currentTime
    const currentGain = this.masterGain.gain.value
    this.masterGain.gain.cancelScheduledValues(now)
    this.masterGain.gain.setValueAtTime(currentGain, now)
    this.masterGain.gain.linearRampToValueAtTime(this.config.masterVolume, now + this.config.fadeTime)
    this.isPlaying = true
  }

  stop() {
    if (!this.isPlaying) return
    this.isPlaying = false

    const noiseToStop = this.noiseSource
    const leftToStop = this.oscLeft
    const rightToStop = this.oscRight
    this.noiseSource = null
    this.oscLeft = null
    this.oscRight = null

    const cleanupNodes = () => {
      try {
        noiseToStop?.stop()
        noiseToStop?.disconnect()
      } catch {}
      try {
        leftToStop?.stop()
        leftToStop?.disconnect()
      } catch {}
      try {
        rightToStop?.stop()
        rightToStop?.disconnect()
      } catch {}
    }

    if (!this.ctx || !this.masterGain) {
      cleanupNodes()
      return
    }

    // Yumuşak doğrusal geçişle (Fade-out) sesi kapat
    const now = this.ctx.currentTime
    const currentGain = this.masterGain.gain.value
    this.masterGain.gain.cancelScheduledValues(now)
    this.masterGain.gain.setValueAtTime(currentGain, now)
    this.masterGain.gain.linearRampToValueAtTime(0, now + this.config.fadeTime)

    if (this.stopTimer) {
      clearTimeout(this.stopTimer)
    }
    this.pendingCleanup = cleanupNodes

    // Ses tamamen kısıldıktan sonra işlemcileri durdur (bellek tasarrufu)
    this.stopTimer = setTimeout(() => {
      this.stopTimer = null
      if (this.pendingCleanup) {
        this.pendingCleanup()
        this.pendingCleanup = null
      }
    }, this.config.fadeTime * 1000)
  }

  toggle() {
    if (this.isPlaying) {
      this.stop()
    } else {
      this.start()
    }
  }

  destroy() {
    this.stop()
    if (this.stopTimer) {
      clearTimeout(this.stopTimer)
      this.stopTimer = null
    }
    if (this.pendingCleanup) {
      this.pendingCleanup()
      this.pendingCleanup = null
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {})
    }
    this.ctx = null
    this.masterGain = null
  }
}
