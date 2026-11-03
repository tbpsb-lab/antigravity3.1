import { MAX_WPM, MIN_WPM, type ThemeId } from '@/lib/rsvp'
import { FONT_SCALE_MAX, FONT_SCALE_MIN, type FontFace } from '@/components/reader/font-settings'

export type ReaderSettings = {
  theme?: ThemeId
  fontFace?: FontFace
  fontScale?: number
  chunkSize?: number
  wpm?: number
  readFootnotes?: boolean
  bionicEnabled?: boolean
  neuroAudioEnabled?: boolean
}

const SETTINGS_KEY = 'hizlioku_reader_settings'
const VALID_THEMES: Set<ThemeId> = new Set(['ios', 'linear', 'kindle'])
const VALID_FACES: Set<FontFace> = new Set(['theme', 'sans', 'serif', 'mono'])

/**
 * Kullanıcı okuma ayarlarını (tema, font boyutu, font tipi, chunk boyutu, wpm, dipnot, nöro-ses)
 * localStorage'da sessizce saklar.
 */
export function saveReaderSettings(settings: Partial<ReaderSettings>): void {
  if (typeof window === 'undefined') return

  try {
    const existing = loadReaderSettings()
    const merged: ReaderSettings = { ...existing, ...settings }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged))
  } catch {
    // Tarayıcı kotalarını sessizce yut
  }
}

/**
 * Tarayıcı açıldığında veya yenilendiğinde kaydedilmiş kullanıcı ayarlarını
 * tip ve sınır doğrulamasından geçirerek döndürür.
 */
export function loadReaderSettings(): ReaderSettings {
  if (typeof window === 'undefined') return {}

  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    const safe: ReaderSettings = {}
    if (VALID_THEMES.has(parsed.theme)) {
      safe.theme = parsed.theme
    }
    if (VALID_FACES.has(parsed.fontFace)) {
      safe.fontFace = parsed.fontFace
    }
    if (typeof parsed.fontScale === 'number' && Number.isFinite(parsed.fontScale)) {
      safe.fontScale = Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, parsed.fontScale))
    }
    if (typeof parsed.chunkSize === 'number' && Number.isFinite(parsed.chunkSize)) {
      safe.chunkSize = Math.min(4, Math.max(1, Math.round(parsed.chunkSize)))
    }
    if (typeof parsed.wpm === 'number' && Number.isFinite(parsed.wpm)) {
      safe.wpm = Math.min(MAX_WPM, Math.max(MIN_WPM, Math.round(parsed.wpm)))
    }
    if (typeof parsed.readFootnotes === 'boolean') {
      safe.readFootnotes = parsed.readFootnotes
    }
    if (typeof parsed.bionicEnabled === 'boolean') {
      safe.bionicEnabled = parsed.bionicEnabled
    }
    if (typeof parsed.neuroAudioEnabled === 'boolean') {
      safe.neuroAudioEnabled = parsed.neuroAudioEnabled
    }
    return safe
  } catch {
    return {}
  }
}
