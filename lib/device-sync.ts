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
  type?: 'progress' | 'presence' | 'presence_query' | 'unpair'
  vaultId: string
  senderDeviceId: string
  senderDeviceName: string
  senderDeviceType?: 'desktop' | 'mobile' | 'tablet'
  targetDeviceId?: string
  targetDeviceName?: string
  knownDevices?: { id: string; name: string; type: 'desktop' | 'mobile' | 'tablet'; lastSeen?: number }[]
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

export const CLOUD_SYNC_SERVERS = [
  'https://ntfy.envs.net',
  'https://ntfy.sh',
]

export function generateNewVaultCode(): string {
  const randomCode = Math.floor(1000 + Math.random() * 9000)
  return `HZL-${randomCode}`
}

// Eski tombstone / blokaj kalıntılarını temizle (Kullanıcı kuralı: Blokaj yok)
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('hizlioku_unpaired_tombstones')
  } catch {}
}

export function markDeviceUnpaired(_deviceId?: string): void {}
export function isDeviceUnpaired(_deviceId?: string): boolean { return false }
export function clearUnpairedTombstone(_deviceId?: string): void {}

export function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop'
  const ua = navigator.userAgent.toLowerCase()
  const hasTouch = typeof navigator !== 'undefined' && (navigator.maxTouchPoints || 0) > 0

  // iPad ve iPadOS tespiti (Modern iPadOS varsayılan olarak Mac userAgent gönderir)
  const isIPad =
    /ipad/i.test(ua) ||
    (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1) ||
    (hasTouch && /macintosh/i.test(ua))

  if (isIPad || /tablet|(android(?!.*mobile))/i.test(ua)) return 'tablet'

  if (/mobile|iphone|ipod|android/i.test(ua)) {
    // Büyük ekranlı dokunmatik Android tabletler
    if (typeof window !== 'undefined') {
      const minDim = Math.min(window.innerWidth, window.innerHeight)
      const maxDim = Math.max(window.innerWidth, window.innerHeight)
      if (minDim >= 600 && maxDim >= 900) return 'tablet'
    }
    return 'mobile'
  }

  // Windows / Surface / Dokunmatik tablet modları
  if (hasTouch && typeof window !== 'undefined') {
    const minDim = Math.min(window.innerWidth, window.innerHeight)
    if (minDim >= 600 && minDim <= 1024) return 'tablet'
  }

  return 'desktop'
}

export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Cihaz'
  const type = getDeviceType()
  const ua = navigator.userAgent
  let browser = 'Tarayıcı'

  if (/edg/i.test(ua)) browser = 'Edge'
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome'
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox'
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari'

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

  const match = clean.match(/HZL[_-]?(\d{4,8})/)
  if (match) return `HZL-${match[1]}`

  const standaloneDigits = trimmed.match(/\b\d{4,8}\b/)
  if (standaloneDigits) return `HZL-${standaloneDigits[0]}`

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

export function upsertPairedDevice(dev: { id: string; name: string; type: 'desktop' | 'mobile' | 'tablet'; lastSeen?: number }): SyncedDevice[] {
  if (typeof window === 'undefined') return []
  const currentId = getDeviceId()
  let list = getPairedDevices()

  const existingIdx = list.findIndex((d) => d.id === dev.id)
  const isNew = existingIdx === -1 && dev.id !== currentId
  const now = Date.now()
  const cleanName = dev.id === currentId ? `${getDeviceName()} (Bu Cihaz)` : dev.name.replace(' (Bu Cihaz)', '')

  if (existingIdx !== -1) {
    list[existingIdx].lastSeen = now
    list[existingIdx].name = cleanName
    list[existingIdx].type = dev.type
  } else {
    list.push({
      id: dev.id,
      name: cleanName,
      type: dev.type,
      lastSeen: now,
      isCurrent: dev.id === currentId,
    })
  }

  try {
    localStorage.setItem(DEVICES_LIST_KEY, JSON.stringify(list))
    window.dispatchEvent(
      new CustomEvent('paired-devices-updated', {
        detail: { deviceId: dev.id, deviceName: cleanName, isNew },
      })
    )
  } catch {}

  return list
}

export function removePairedDevice(deviceId: string): SyncedDevice[] {
  if (typeof window === 'undefined') return []
  const currentList = getPairedDevices()
  const targetDevice = currentList.find((d) => d.id === deviceId)
  const deviceName = targetDevice?.name?.replace(' (Bu Cihaz)', '') || 'Cihaz'
  let list = currentList.filter((d) => d.id !== deviceId)
  try {
    localStorage.setItem(DEVICES_LIST_KEY, JSON.stringify(list))
    window.dispatchEvent(
      new CustomEvent('paired-devices-updated', {
        detail: { deviceId, deviceName, isRemoved: true },
      })
    )
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
  remoteDeviceId?: string
  remoteDeviceName?: string
  remoteDeviceType?: 'desktop' | 'mobile' | 'tablet'
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
  let remoteDeviceId: string | undefined
  let remoteDeviceName: string | undefined
  let remoteDeviceType: 'desktop' | 'mobile' | 'tablet' | undefined

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
      const did = url.searchParams.get('did') || url.searchParams.get('d')
      const dn = url.searchParams.get('dn')
      const dt = url.searchParams.get('dt')

      if (did) remoteDeviceId = did
      if (dn) remoteDeviceName = dn
      if (dt === 'mobile' || dt === 'tablet' || dt === 'desktop') {
        remoteDeviceType = dt
      }

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
    remoteDeviceId,
    remoteDeviceName,
    remoteDeviceType,
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

  // Cihaz kimliği ve adı (Karekod okunduğunda anında eşleşen cihazı listelemek için)
  params.set('did', getDeviceId())
  params.set('dn', getDeviceName())
  params.set('dt', getDeviceType())

  return `${origin}${pathname}?${params.toString()}`
}

/**
 * Sekmeler ve cihazlar arası gerçek zamanlı senkronizasyon yöneticisi
 */
export class SyncChannelManager {
  private channel: BroadcastChannel | null = null
  private eventSource: EventSource | null = null
  private onMessageCallback: ((payload: SyncPayload) => void) | null = null
  private vaultId: string
  private isDestroyed = false
  private visibilityHandler: (() => void) | null = null
  private focusHandler: (() => void) | null = null
  private pollTimer: any = null
  private lastIncomingProgressTimestamp = 0

  constructor(onMessage: (payload: SyncPayload) => void, initialVaultId?: string) {
    this.onMessageCallback = onMessage
    this.vaultId = initialVaultId || getSyncVaultId()

    // 1. Yerel Sekmeler Arası İletişim (BroadcastChannel)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const chanName = `${CHANNEL_NAME}_${this.vaultId.replace(/[^A-Za-z0-9_-]/g, '_')}`
        this.channel = new BroadcastChannel(chanName)
        this.channel.onmessage = (event) => {
          if (event.data && typeof event.data === 'object') {
            this.handleIncoming(event.data as SyncPayload)
          }
        }
      } catch {}
    }

    // 2. Cihazlar Arası Canlı Bulut Senkronizasyonu (ntfy.sh SSE)
    this.connectCloudStream()

    // 3. Buluttan geçmiş ve en son durumu ANINDA çek (Hızlı HTTP Poll)
    this.fetchLatestCloudState()

    // 4. Başlangıçta diğer cihazlara "Ben buradayım" bildir ve diğer cihazları sorgula
    this.broadcastPresence()

    // 5. Sekme yeniden öne geldiğinde veya ekran açıldığında anında son durumu kontrol et
    if (typeof window !== 'undefined') {
      this.visibilityHandler = () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          if (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED) {
            this.connectCloudStream()
          }
          this.fetchLatestCloudState()
        }
      }
      this.focusHandler = () => {
        if (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED) {
          this.connectCloudStream()
        }
        this.fetchLatestCloudState()
      }
      window.addEventListener('visibilitychange', this.visibilityHandler)
      window.addEventListener('focus', this.focusHandler)

      // 6. Mobil / arka plan senkronizasyon garantisi: Her 3 saniyede bir buluttan son durumu sessizce kontrol et
      // ve her 30 saniyede bir varlık pingi göndererek cihaz listesini daima canlı tut
      let tickCount = 0
      this.pollTimer = setInterval(() => {
        if (!this.isDestroyed && typeof document !== 'undefined' && document.visibilityState === 'visible') {
          if (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED) {
            this.connectCloudStream()
          }
          this.fetchLatestCloudState()
          tickCount++
          if (tickCount % 10 === 0) {
            this.broadcastPresence()
          }
        }
      }, 3000)
    }
  }

  private connectCloudStream(serverIdx = 0) {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return
    if (this.isDestroyed || !this.vaultId) return

    try {
      const server = CLOUD_SYNC_SERVERS[serverIdx % CLOUD_SYNC_SERVERS.length]
      const topic = `hizlioku_sync_${this.vaultId.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`
      // ?since=24h geçmiş paketlerin de bağlantı kurulur kurulmaz akmasını sağlar
      const sseUrl = `${server}/${topic}/sse?since=24h`
      const es = new EventSource(sseUrl)

      es.onmessage = (e) => {
        try {
          const raw = JSON.parse(e.data)
          if (raw && (raw.event === 'message' || !raw.event) && raw.message) {
            const payload = typeof raw.message === 'string' ? JSON.parse(raw.message) : raw.message
            if (payload && typeof payload === 'object') {
              this.handleIncoming(payload)
            }
          }
        } catch {}
      }

      es.onerror = () => {
        // Tarayıcı EventSource varsayılan olarak yeniden bağlanmayı dener.
        // Yalnızca bağlantı tamamen kapandıysa (CLOSED) yedek sunucuya geç.
        if (es.readyState === EventSource.CLOSED && !this.isDestroyed) {
          try {
            es.close()
          } catch {}
          const nextIdx = (serverIdx + 1) % CLOUD_SYNC_SERVERS.length
          setTimeout(() => {
            if (!this.isDestroyed) this.connectCloudStream(nextIdx)
          }, 2000)
        }
      }

      this.eventSource = es
    } catch {}
  }

  public async fetchLatestCloudState(): Promise<void> {
    if (!this.vaultId || typeof window === 'undefined' || this.isDestroyed) return
    const topic = `hizlioku_sync_${this.vaultId.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`

    for (const server of CLOUD_SYNC_SERVERS) {
      if (this.isDestroyed) break
      try {
        const res = await fetch(`${server}/${topic}/json?poll=1`, {
          cache: 'no-store',
        })
        if (!res.ok) continue
        const text = await res.text()
        if (!text || this.isDestroyed) continue
        const fileLines = text.trim().split('\n')

        // Her bir eşleşmiş uzak cihazın en son durumunu topla (Çoklu cihaz senkronizasyonu)
        const latestPerDevice = new Map<string, SyncPayload>()

        for (const line of fileLines) {
          if (!line.trim()) continue
          try {
            const raw = JSON.parse(line)
            if (raw && (raw.event === 'message' || !raw.event) && raw.message) {
              const payload = typeof raw.message === 'string' ? JSON.parse(raw.message) : raw.message
              if (payload && typeof payload === 'object' && payload.senderDeviceId !== getDeviceId()) {
                if (payload.type === 'unpair') {
                  this.handleIncoming(payload)
                  continue
                }

                // Karşı cihaz varlığını listeye ekle
                if (payload.senderDeviceId && payload.senderDeviceName) {
                  upsertPairedDevice({
                    id: payload.senderDeviceId,
                    name: payload.senderDeviceName,
                    type: payload.senderDeviceType || 'desktop',
                  })
                }

                // Çoklu cihaz mesh listesini birleştir (3+ cihazın tamamını otomatik birbirine bağla)
                if (Array.isArray(payload.knownDevices)) {
                  for (const dev of payload.knownDevices) {
                    if (dev && dev.id && dev.name && dev.id !== getDeviceId()) {
                      upsertPairedDevice({
                        id: dev.id,
                        name: dev.name,
                        type: dev.type || 'desktop',
                        lastSeen: dev.lastSeen,
                      })
                    }
                  }
                }

                if (payload.type === 'progress' || !payload.type) {
                  const ts = payload.timestamp || (raw.time ? raw.time * 1000 : 0)
                  payload.timestamp = ts
                  const existing = latestPerDevice.get(payload.senderDeviceId)
                  if (!existing || ts >= (existing.timestamp || 0)) {
                    latestPerDevice.set(payload.senderDeviceId, payload)
                  }
                }
              }
            }
          } catch {}
        }

        if (!this.isDestroyed) {
          // Her bir uzak cihazın en güncel durumunu değerlendirmeye gönder
          for (const devPayload of latestPerDevice.values()) {
            this.handleIncoming(devPayload)
          }
        }
        break
      } catch {}
    }
  }

  private handleIncoming(payload: SyncPayload) {
    if (!payload || typeof payload !== 'object') return
    // Kendi cihazımızın gönderdiği paketleri atla
    if (payload.senderDeviceId === getDeviceId()) return

    // Unpair (Eşleşmeyi Sonlandırma) paketi geldiyse:
    if (payload.type === 'unpair') {
      const myId = getDeviceId()
      const targetId = payload.targetDeviceId

      if (targetId === myId || targetId === '*') {
        // Bu cihaz eşleşmeden çıkarıldı! Karşı cihazı listemizden sil
        removePairedDevice(payload.senderDeviceId)

        // Ortak vault'tan ayrıl, bağımsız yeni kod üret
        const newVaultId = generateNewVaultCode()
        setSyncVaultId(newVaultId)
        this.updateVaultId(newVaultId)

        // Bildirimi ilet
        const senderName = payload.senderDeviceName || 'Diğer cihaz'
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('device-unpaired-notify', {
              detail: {
                senderDeviceId: payload.senderDeviceId,
                senderDeviceName: senderName,
              },
            })
          )
        }
      } else if (targetId) {
        removePairedDevice(targetId)
      }
      return
    }

    // Karşı cihazın varlığını cihaz listesine işle
    if (payload.senderDeviceId && payload.senderDeviceName) {
      upsertPairedDevice({
        id: payload.senderDeviceId,
        name: payload.senderDeviceName,
        type: payload.senderDeviceType || 'desktop',
      })
    }

    // Çoklu cihaz mesh listesini birleştir (3+ cihazın tamamını otomatik birbirine bağla)
    if (Array.isArray(payload.knownDevices)) {
      for (const dev of payload.knownDevices) {
        if (dev && dev.id && dev.name && dev.id !== getDeviceId()) {
          upsertPairedDevice({
            id: dev.id,
            name: dev.name,
            type: dev.type || 'desktop',
            lastSeen: dev.lastSeen,
          })
        }
      }
    }

    // Karşı cihaz ilk bağlantıda kimler var diye sorduysa (presence_query), kendi varlığımızı ona ilet
    if (payload.type === 'presence_query') {
      this.sendDirectPresence('presence')
    }

    this.onMessageCallback?.(payload)
  }

  public broadcastUnpair(targetDeviceId: string, targetDeviceName?: string): void {
    if (this.isDestroyed) return
    const fullPayload: SyncPayload = {
      type: 'unpair',
      vaultId: this.vaultId,
      senderDeviceId: getDeviceId(),
      senderDeviceName: getDeviceName(),
      senderDeviceType: getDeviceType(),
      targetDeviceId,
      targetDeviceName,
      wordIndex: 0,
      chunkSize: 1,
      wpm: 300,
      theme: 'ios',
      fontFace: 'theme',
      fontScale: 1,
      timestamp: Date.now(),
    }

    try {
      this.channel?.postMessage(fullPayload)
    } catch {}

    this.postToCloud(fullPayload)
  }

  public broadcast(payload: Omit<SyncPayload, 'senderDeviceId' | 'senderDeviceName' | 'timestamp' | 'vaultId' | 'knownDevices'>): void {
    if (this.isDestroyed) return
    const knownDevices = getPairedDevices().map((d) => ({
      id: d.id,
      name: d.name.replace(' (Bu Cihaz)', ''),
      type: d.type,
      lastSeen: d.lastSeen,
    }))
    const fullPayload: SyncPayload = {
      ...payload,
      type: payload.type || 'progress',
      vaultId: this.vaultId,
      senderDeviceId: getDeviceId(),
      senderDeviceName: getDeviceName(),
      senderDeviceType: getDeviceType(),
      knownDevices,
      timestamp: Date.now(),
    }

    // Yerel sekmelere ilet
    try {
      this.channel?.postMessage(fullPayload)
    } catch {}

    // Cihazlar arası bulut köprüsüne ilet
    this.postToCloud(fullPayload)
  }

  public broadcastPresence(): void {
    this.sendDirectPresence('presence_query')
  }

  private sendDirectPresence(type: 'presence' | 'presence_query') {
    if (this.isDestroyed) return
    const knownDevices = getPairedDevices().map((d) => ({
      id: d.id,
      name: d.name.replace(' (Bu Cihaz)', ''),
      type: d.type,
      lastSeen: d.lastSeen,
    }))
    const fullPayload: SyncPayload = {
      type,
      vaultId: this.vaultId,
      senderDeviceId: getDeviceId(),
      senderDeviceName: getDeviceName(),
      senderDeviceType: getDeviceType(),
      knownDevices,
      wordIndex: 0,
      chunkSize: 1,
      wpm: 300,
      theme: 'ios',
      fontFace: 'theme',
      fontScale: 1,
      timestamp: Date.now(),
    }

    try {
      this.channel?.postMessage(fullPayload)
    } catch {}

    this.postToCloud(fullPayload)
  }

  private postToCloud(payload: SyncPayload) {
    if (!this.vaultId || typeof window === 'undefined') return
    const topic = `hizlioku_sync_${this.vaultId.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`
    const bodyStr = JSON.stringify(payload)
    for (const server of CLOUD_SYNC_SERVERS) {
      try {
        fetch(`${server}/${topic}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Title': 'HizliOku Sync',
          },
          body: bodyStr,
          keepalive: true,
        }).catch(() => {})
      } catch {}
    }
  }

  public updateVaultId(newVaultId: string) {
    if (!newVaultId) return
    const isSame = this.vaultId === newVaultId
    this.vaultId = newVaultId

    if (!isSame) {
      if (this.eventSource) {
        this.eventSource.close()
        this.eventSource = null
      }
      if (this.channel) {
        this.channel.close()
        this.channel = null
      }

      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const chanName = `${CHANNEL_NAME}_${this.vaultId.replace(/[^A-Za-z0-9_-]/g, '_')}`
          this.channel = new BroadcastChannel(chanName)
          this.channel.onmessage = (event) => {
            if (event.data && typeof event.data === 'object') {
              this.handleIncoming(event.data as SyncPayload)
            }
          }
        } catch {}
      }

      this.connectCloudStream()
    }

    this.fetchLatestCloudState()
    this.broadcastPresence()
    setTimeout(() => {
      if (!this.isDestroyed) {
        this.broadcastPresence()
        this.fetchLatestCloudState()
      }
    }, 1500)
  }

  public destroy(): void {
    this.isDestroyed = true
    if (typeof window !== 'undefined') {
      if (this.visibilityHandler) window.removeEventListener('visibilitychange', this.visibilityHandler)
      if (this.focusHandler) window.removeEventListener('focus', this.focusHandler)
      this.visibilityHandler = null
      this.focusHandler = null
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    if (this.channel) {
      this.channel.close()
      this.channel = null
    }
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.onMessageCallback = null
  }
}