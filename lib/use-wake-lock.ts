'use client'

import { useEffect, useRef } from 'react'

/**
 * Screen Wake Lock Hook (Ekranın kararmasını ve uykuya geçmesini önler)
 * Okuma sırasında (playing === true veya zen === true) ekranın açık kalmasını sağlar.
 * Destekleyen tarayıcılar: Chrome (Android/Desktop), Safari (iOS 16.4+/macOS), Edge vb.
 */
export function useWakeLock(enabled: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    let isMounted = true

    const requestLock = async () => {
      if (!enabled) return
      if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

      try {
        if (wakeLockRef.current && !wakeLockRef.current.released) {
          return
        }
        const lock = await navigator.wakeLock.request('screen')
        if (!isMounted) {
          await lock.release().catch(() => {})
          return
        }
        wakeLockRef.current = lock
        lock.addEventListener('release', () => {
          if (wakeLockRef.current === lock) {
            wakeLockRef.current = null
          }
        })
      } catch {
        // Pil tasarruf modu veya sekmenin arka planda olması durumunda güvenle yutulur
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
