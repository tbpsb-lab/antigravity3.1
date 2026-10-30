import type { ThemeId } from '@/lib/rsvp'
import type { FontFace } from '@/components/reader/font-settings'

export type ReaderSettings = {
  theme?: ThemeId
  fontFace?: FontFace
  fontScale?: number
  chunkSize?: number
  wpm?: number
  readFootnotes?: boolean
}

const SETTINGS_KEY = 'hizlioku_reader_settings'

/**
 * Kullanıcı okuma ayarlarını (tema, font boyutu, font tipi, chunk boyutu, wpm, dipnot)
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
 * Tarayıcı açıldığında veya yenilendiğinde kaydedilmiş kullanıcı ayarlarını döndürür.
 */
export function loadReaderSettings(): ReaderSettings {
  if (typeof window === 'undefined') return {}

  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as ReaderSettings
  } catch {
    return {}
  }
}
