'use client'

import { useEffect, useRef } from 'react'

interface SimpleWakeLockSentinel {
  released: boolean
  release: () => Promise<void>
  addEventListener?: (type: string, listener: () => void) => void
}

/**
 * Screen Wake Lock Hook (Ekranın kararmasını ve uykuya geçmesini önler)
 * Okuma sırasında (playing === true veya zen === true) ekranın açık kalmasını sağlar.
 * Destekleyen tarayıcılar: Chrome (Android/Desktop), Safari (iOS 16.4+/macOS), Edge vb.
 */
export function useWakeLock(enabled: boolean) {
  const wakeLockRef = useRef<SimpleWakeLockSentinel | null>(null)

  useEffect(() => {
    let isMounted = true

    const requestLock = async () => {
      if (!enabled) return
      if (typeof navigator === 'undefined') return
      const nav = navigator as unknown as {
        wakeLock?: {
          request: (type: 'screen') => Promise<SimpleWakeLockSentinel>
        }
      }
      if (!nav.wakeLock?.request) return

      try {
        if (wakeLockRef.current && !wakeLockRef.current.released) {
          return
        }
        const lock = await nav.wakeLock.request('screen')
        if (!isMounted) {
          await lock.release().catch(() => {})
          return
        }
        wakeLockRef.current = lock

        const handleRelease = () => {
          if (wakeLockRef.current === lock) {
            wakeLockRef.current = null
          }
        }

        if (typeof lock.addEventListener === 'function') {
          try {
            lock.addEventListener('release', handleRelease)
          } catch {
            (lock as any).onrelease = handleRelease
          }
        } else {
          (lock as any).onrelease = handleRelease
        }
      } catch {
        // iOS pil tasarruf modu veya PWA arka plan durumunda güvenle yutulur
      }
    }

    const releaseLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release()
        } catch {}
        wakeLockRef.current = null
      }
    }

    if (enabled) {
      requestLock()
    } else {
      releaseLock()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        requestLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMounted = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      releaseLock()
    }
  }, [enabled])
}
