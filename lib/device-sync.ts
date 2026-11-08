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

export function getSyncVaultId(): string {
  if (typeof window === 'undefined') return 'HZL-1000'

  // 1. URL parametresini kontrol et: ?sync=XYZ
  try {
    const params = new URLSearchParams(window.location.search)
    const urlSync = params.get('sync')
    if (urlSync && urlSync.trim()) {
      const cleanSync = urlSync.trim().toUpperCase()
      localStorage.setItem(VAULT_KEY, cleanSync)
      // URL'yi temizle (kullanıcıyı rahatsız etmesin)
      params.delete('sync')
      const newQuery = params.toString() ? `?${params.toString()}` : ''
      window.history.replaceState({}, '', window.location.pathname + newQuery)
      return cleanSync
    }
  } catch {}

  // 2. localStorage kontrolü
  let vaultId = localStorage.getItem(VAULT_KEY)
  if (!vaultId) {
    // 6 haneli kolay okunur kod üret: HZL-XXXX
    const randomCode = Math.floor(1000 + Math.random() * 9000)
    vaultId = `HZL-${randomCode}`
    localStorage.setItem(VAULT_KEY, vaultId)
  }
  return vaultId
}

export function setSyncVaultId(newVaultId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(VAULT_KEY, newVaultId.trim().toUpperCase())
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

export function generateSyncUrl(vaultId: string): string {
  if (typeof window === 'undefined') return ''
  const origin = window.location.origin
  const pathname = window.location.pathname
  return `${origin}${pathname}?sync=${encodeURIComponent(vaultId)}`
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
