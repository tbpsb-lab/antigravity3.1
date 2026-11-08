'use client'

/**
 * HızlıOku Cihaz Eşleştirme ve Senkronizasyon Altyapısı
 * - Karekod (QR) ve 6-8 haneli kod ile anında cihaz bağlama
 * - BroadcastChannel ile sekmeler/cihazlar arası canlı iletişim
 * - Kindle tarzı "en ileri pozisyonu koru" ve çakışma önleme
 */

export type SyncedDevice = {
  id: string
  name: string
  type: 'desktop' | 'mobile' | 'tablet'
  lastSeen: number
  isCurrent?: boolean
}

export type SyncPayload = {
  vaultId: string
  senderDeviceId: string
  senderDeviceName: string
  docTitle?: string
  wordIndex: number
  pageNumber?: number
  chunkSize: number
  wpm: number
  theme: string
  fontFace: string
  fontScale: number
  timestamp: number
}

const VAULT_KEY = 'hizlioku_sync_vault_id'
const DEVICE_ID_KEY = 'hizlioku_device_id'
const DEVICES_LIST_KEY = 'hizlioku_paired_devices'
const CHANNEL_NAME = 'hizlioku_realtime_sync'

export function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop'
  const ua = navigator.userAgent.toLowerCase()
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android/i.test(ua)) return 'mobile'
  return 'desktop'
}

export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Cihaz'
  const type = getDeviceType()
  const ua = navigator.userAgent
  let browser = 'Tarayıcı'
  if (/chrome/i.test(ua) && !/edg/i.test(ua)) browser = 'Chrome'
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari'
  else if (/firefox/i.test(ua)) browser = 'Firefox'
  else if (/edg/i.test(ua)) browser = 'Edge'

  if (type === 'mobile') return `Telefon (${browser})`
  if (type === 'tablet') return `Tablet (${browser})`
  return `Bilgisayar (${browser})`
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server'
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 10)
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export function sanitizeVaultId(raw: string | null | undefined): string {
  if (!raw) return ''
  const trimmed = raw.trim()

  // Kullanıcı tam URL veya sorgu dizesi yapıştırdıysa:
  if (trimmed.includes('://') || trimmed.includes('?') || trimmed.includes('/')) {
    try {
      const full = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
      const url = new URL(full)
      const s = url.searchParams.get('sync') || url.searchParams.get('s')
      if (s) {
        const clean = s.trim().toUpperCase()
        return clean.startsWith('HZL-') ? clean : `HZL-${clean}`
      }
    } catch {}

    const match = trimmed.match(/HZL-\d{4,8}/i)
    if (match) return match[0].toUpperCase()

    const digitMatch = trimmed.match(/\b\d{4,8}\b/)
    if (digitMatch) return `HZL-${digitMatch[0]}`
  }

  const clean = trimmed.toUpperCase()
  if (/^HZL-\d{4,8}$/.test(clean)) return clean
  if (/^\d{4,8}$/.test(clean)) return `HZL-${clean}`

  const match = clean.match(/HZL-\d{4,8}/)
  if (match) return match[0]

  const cleanChars = clean.replace(/[^A-Z0-9-]/g, '').substring(0, 12)
  return cleanChars.startsWith('HZL-') ? cleanChars : `HZL-${cleanChars}`
}

export function getSyncVaultId(): string {
  if (typeof window === 'undefined') return 'HZL-1000'

  // 1. URL parametresini kontrol et: ?sync=XYZ veya ?s=XYZ
  try {
    const params = new URLSearchParams(window.location.search)
    const urlSync = params.get('sync') || params.get('s')
    if (urlSync && urlSync.trim()) {
      const cleanSync = sanitizeVaultId(urlSync)
      if (cleanSync) {
        localStorage.setItem(VAULT_KEY, cleanSync)
        return cleanSync
      }
    }
  } catch {}

  // 2. localStorage kontrolü
  const rawVault = localStorage.getItem(VAULT_KEY)
  let vaultId = sanitizeVaultId(rawVault)
  if (!vaultId) {
    // 6 haneli kolay okunur kod üret: HZL-XXXX
    const randomCode = Math.floor(1000 + Math.random() * 9000)
    vaultId = `HZL-${randomCode}`
  }
  // Eğer localStorage'daki değer URL gibi bozuk bir değerse, hemen temiz halini kaydet
  if (rawVault !== vaultId) {
    try {
      localStorage.setItem(VAULT_KEY, vaultId)
    } catch {}
  }
  return vaultId
}

export function setSyncVaultId(newVaultId: string): void {
  if (typeof window === 'undefined') return
  const clean = sanitizeVaultId(newVaultId)
  if (clean) {
    try {
      localStorage.setItem(VAULT_KEY, clean)
    } catch {}
  }
}

export function getPairedDevices(): SyncedDevice[] {
  if (typeof window === 'undefined') return []
  const currentId = getDeviceId()
  const currentType = getDeviceType()
  const currentName = getDeviceName()

  let list: SyncedDevice[] = []
  try {
    const raw = localStorage.getItem(DEVICES_LIST_KEY)
    if (raw) list = JSON.parse(raw)
  } catch {}

  // Mevcut cihaz listede yoksa ekle veya güncelle
  const now = Date.now()
  const existingIdx = list.findIndex((d) => d.id === currentId)
  if (existingIdx !== -1) {
    list[existingIdx].lastSeen = now
    list[existingIdx].name = `${currentName} (Bu Cihaz)`
    list[existingIdx].isCurrent = true
  } else {
    list.unshift({
      id: currentId,
      name: `${currentName} (Bu Cihaz)`,
      type: currentType,
      lastSeen: now,
      isCurrent: true,
    })
  }

  // 14 günden eski pasif eşleşmeleri temizle
  list = list.filter((d) => now - d.lastSeen < 14 * 86400000)
  try {
    localStorage.setItem(DEVICES_LIST_KEY, JSON.stringify(list))
  } catch {}

  return list
}

export function removePairedDevice(deviceId: string): SyncedDevice[] {
  if (typeof window === 'undefined') return []
  let list = getPairedDevices().filter((d) => d.id !== deviceId)
  try {
    localStorage.setItem(DEVICES_LIST_KEY, JSON.stringify(list))
  } catch {}
  return list
}

export type SyncUrlParams = {
  index?: number
  wordIndex?: number
  pageNumber?: number
  wpm?: number
  chunkSize?: number
  theme?: string
  fontFace?: string
}

export type ParsedSyncResult = {
  vaultId: string | null
  index?: number
  pageNumber?: number
  wpm?: number
  chunkSize?: number
  theme?: string
  fontFace?: string
}

export function parseSyncInput(raw: string | null | undefined): ParsedSyncResult {
  if (!raw) return { vaultId: null }
  const trimmed = raw.trim()
  if (!trimmed) return { vaultId: null }

  let extractedVaultId: string | null = null
  let index: number | undefined
  let pageNumber: number | undefined
  let wpm: number | undefined
  let chunkSize: number | undefined
  let theme: string | undefined
  let fontFace: string | undefined

  // 1. URL veya sorgu dizesi içeriyor mu? (Örn: https://.../?s=4458&idx=50 veya ?sync=HZL-4458)
  if (trimmed.includes('?') || trimmed.includes('&') || trimmed.includes('://') || trimmed.includes('/')) {
    try {
      const full = trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : 'https://dummy.com/' + (trimmed.startsWith('?') ? trimmed : '?' + trimmed)
      const url = new URL(full)
      const s = url.searchParams.get('sync') || url.searchParams.get('s')
      const idx = url.searchParams.get('idx') || url.searchParams.get('i')
      const p = url.searchParams.get('p') || url.searchParams.get('page')
      const w = url.searchParams.get('wpm') || url.searchParams.get('w')
      const ch = url.searchParams.get('chunk') || url.searchParams.get('c')
      const t = url.searchParams.get('theme') || url.searchParams.get('t')
      const f = url.searchParams.get('font') || url.searchParams.get('f')

      if (s) extractedVaultId = sanitizeVaultId(s)
      if (idx) {
        const parsedIdx = parseInt(idx, 10)
        if (!isNaN(parsedIdx)) index = parsedIdx
      }
      if (p) {
        const parsedP = parseInt(p, 10)
        if (!isNaN(parsedP)) pageNumber = parsedP
      }
      if (w) {
        const parsedW = parseInt(w, 10)
        if (!isNaN(parsedW)) wpm = parsedW
      }
      if (ch) {
        const parsedC = parseInt(ch, 10)
        if (!isNaN(parsedC)) chunkSize = parsedC
      }
      if (t) {
        theme = t === 'k' ? 'kindle' : t === 'n' ? 'linear' : t === 'i' ? 'ios' : t
      }
      if (f) {
        fontFace = f === 't' ? 'theme' : f === 's' ? 'sans' : f === 'r' ? 'serif' : f === 'm' ? 'mono' : f
      }
    } catch {}
  }

  // 2. Eğer URL'den çıkmadıysa veya doğrudan metin içerisindeyse:
  if (!extractedVaultId) {
    const match = trimmed.match(/HZL[_-]?([0-9A-Z]{4,8})/i)
    if (match) {
      extractedVaultId = 'HZL-' + match[1].toUpperCase()
    } else {
      const numMatch = trimmed.match(/\b\d{4,8}\b/)
      if (numMatch) {
        extractedVaultId = 'HZL-' + numMatch[0]
      } else {
        extractedVaultId = sanitizeVaultId(trimmed)
      }
    }
  }

  return {
    vaultId: extractedVaultId,
    index,
    pageNumber,
    wpm,
    chunkSize,
    theme,
    fontFace,
  }
}

export function generateSyncUrl(vaultId: string, extra?: SyncUrlParams): string {
  if (typeof window === 'undefined') return ''
  const origin = window.location.origin
  const pathname = window.location.pathname
  const params = new URLSearchParams()
  
  // Kompakt eşleme parametreleri (Karekodun anında ve yüksek çözünürlükle taranabilmesi için)
  const cleanCode = vaultId.replace(/^HZL-/, '')
  params.set('s', cleanCode)

  if (typeof extra?.index === 'number' && extra.index >= 0) {
    params.set('idx', String(extra.index))
  }
  if (typeof extra?.pageNumber === 'number' && extra.pageNumber > 0) {
    params.set('p', String(extra.pageNumber))
  }
  if (typeof extra?.wpm === 'number' && extra.wpm > 0) {
    params.set('w', String(extra.wpm))
  }
  if (typeof extra?.chunkSize === 'number') {
    params.set('c', String(extra.chunkSize))
  }
  if (extra?.theme) {
    const tCode = extra.theme === 'kindle' ? 'k' : extra.theme === 'linear' ? 'n' : 'i'
    params.set('t', tCode)
  }
  if (extra?.fontFace) {
    const fCode = extra.fontFace === 'theme' ? 't' : extra.fontFace === 'sans' ? 's' : extra.fontFace === 'serif' ? 'r' : 'm'
    params.set('f', fCode)
  }
  return `${origin}${pathname}?${params.toString()}`
}

/**
 * Sekmeler ve cihazlar arası gerçek zamanlı senkronizasyon yöneticisi
 */
export class SyncChannelManager {
  private channel: BroadcastChannel | null = null
  private onMessageCallback: ((payload: SyncPayload) => void) | null = null

  constructor(onMessage: (payload: SyncPayload) => void) {
    this.onMessageCallback = onMessage
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME)
        this.channel.onmessage = (event) => {
          if (event.data && typeof event.data === 'object') {
            const payload = event.data as SyncPayload
            if (payload.senderDeviceId !== getDeviceId()) {
              this.onMessageCallback?.(payload)
            }
          }
        }
      } catch {}
    }
  }

  public broadcast(payload: Omit<SyncPayload, 'senderDeviceId' | 'senderDeviceName' | 'timestamp' | 'vaultId'>): void {
    if (!this.channel) return
    const fullPayload: SyncPayload = {
      ...payload,
      vaultId: getSyncVaultId(),
      senderDeviceId: getDeviceId(),
      senderDeviceName: getDeviceName(),
      timestamp: Date.now(),
    }
    try {
      this.channel.postMessage(fullPayload)
    } catch {}
  }

  public destroy(): void {
    if (this.channel) {
      this.channel.close()
      this.channel = null
    }
    this.onMessageCallback = null
  }
}
