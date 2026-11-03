'use client'

import { useEffect, useRef } from 'react'

export type Landmark3D = {
  x: number
  y: number
  z: number
}

export type AttentionLossReason = 'eyes-closed' | 'no-face'

export type EyeTrackerProps = {
  /** Özellik aktif mi? Kapalıyken kamera ve MediaPipe hiç çalıştırılmaz. */
  enabled: boolean
  /** Göz açıklık oranı (EAR) eşik değeri (Varsayılan: 0.18) */
  earThreshold?: number
  /** Doğal anlık göz kırpmalarını (100-200ms) filtrelemek için dikkat kaybı tolerans süresi (ms) */
  attentionLossDelayMs?: number
  /** Göz kapandığında (EAR < eşik) veya kamera önünde yüz algılanamadığında tetiklenir */
  onBlinkOrLookAway: (reason: AttentionLossReason) => void
  /** Dikkat tekrar ekrana döndüğünde (yüz algılandı ve EAR >= eşik) tetiklenir */
  onAttentionRestored: () => void
  /** Kısa doğal göz kırpmasında (< attentionLossDelayMs) mikro telafi için isteğe bağlı callback */
  onMicroBlink?: () => void
  /** Kamera izni verilmediğinde veya kamera bulunamadığında tetiklenir */
  onPermissionDenied?: (errorMessage: string) => void
  /** Kamera ve model başarıyla hazır olduğunda tetiklenir */
  onTrackingStatusChange?: (status: 'inactive' | 'initializing' | 'active' | 'attention-lost' | 'error') => void
}

// MediaPipe FaceMesh Sol Göz 3D Landmark İndeksleri
// 33: Sol dış köşe, 133: Sol iç köşe
// (160, 144) ve (158, 153): Dikey üst ve alt göz kapağı çiftleri
const LEFT_EYE_INDICES = {
  outerCorner: 33,
  innerCorner: 133,
  upper1: 160,
  lower1: 144,
  upper2: 158,
  lower2: 153,
} as const

/**
 * İki 3D nokta arasındaki Öklid (Euclidean) mesafesini hesaplar.
 */
function euclideanDistance3D(p1: Landmark3D, p2: Landmark3D): number {
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  const dz = (p1.z || 0) - (p2.z || 0)
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * Sol gözün dikey ve yatay 3D landmark koordinatlarını kullanarak
 * EAR (Eye Aspect Ratio - Göz Açıklık Oranı) değerini hesaplar.
 *
 * EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
 */
export function calculateLeftEyeEAR(landmarks: Landmark3D[]): number {
  const p1 = landmarks[LEFT_EYE_INDICES.outerCorner]
  const p2 = landmarks[LEFT_EYE_INDICES.upper1]
  const p3 = landmarks[LEFT_EYE_INDICES.upper2]
  const p4 = landmarks[LEFT_EYE_INDICES.innerCorner]
  const p5 = landmarks[LEFT_EYE_INDICES.lower2]
  const p6 = landmarks[LEFT_EYE_INDICES.lower1]

  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) {
    return 1.0
  }

  const verticalDist1 = euclideanDistance3D(p2, p6)
  const verticalDist2 = euclideanDistance3D(p3, p5)
  const horizontalDist = euclideanDistance3D(p1, p4)

  if (horizontalDist === 0) return 1.0
  return (verticalDist1 + verticalDist2) / (2.0 * horizontalDist)
}

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error(' Tarayıcı ortamı bulunamadı.'))
      return
    }
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`Script yüklenemedi: ${src}`)), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.crossOrigin = 'anonymous'
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error(`Script yüklenemedi: ${src}`))
    document.head.appendChild(script)
  })
}

async function resolveMediaPipeModules(): Promise<{ FaceMesh: any; Camera: any }> {
  const win = window as any

  let FaceMeshCtor = win.FaceMesh
  if (!FaceMeshCtor) {
    try {
      const fmMod: any = await import('@mediapipe/face_mesh')
      FaceMeshCtor = fmMod?.FaceMesh || fmMod?.default?.FaceMesh || win.FaceMesh
    } catch {
      // UMD fallback
    }
  }
  if (!FaceMeshCtor) {
    await loadScriptOnce('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js')
    FaceMeshCtor = win.FaceMesh
  }

  let CameraCtor = win.Camera
  if (!CameraCtor) {
    try {
      const camMod: any = await import('@mediapipe/camera_utils')
      CameraCtor = camMod?.Camera || camMod?.default?.Camera || win.Camera
    } catch {
      // UMD fallback
    }
  }
  if (!CameraCtor) {
    await loadScriptOnce('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js')
    CameraCtor = win.Camera
  }

  if (!FaceMeshCtor || !CameraCtor) {
    throw new Error('MediaPipe FaceMesh veya Camera modülü başlatılamadı.')
  }

  return { FaceMesh: FaceMeshCtor, Camera: CameraCtor }
}

export function EyeTracker({
  enabled,
  earThreshold = 0.18,
  attentionLossDelayMs = 380,
  onBlinkOrLookAway,
  onAttentionRestored,
  onMicroBlink,
  onPermissionDenied,
  onTrackingStatusChange,
}: EyeTrackerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Callback referanslarını güncel tut (gereksiz kamera yeniden başlatmalarını önler)
  const onBlinkOrLookAwayRef = useRef(onBlinkOrLookAway)
  onBlinkOrLookAwayRef.current = onBlinkOrLookAway

  const onAttentionRestoredRef = useRef(onAttentionRestored)
  onAttentionRestoredRef.current = onAttentionRestored

  const onMicroBlinkRef = useRef(onMicroBlink)
  onMicroBlinkRef.current = onMicroBlink

  const onPermissionDeniedRef = useRef(onPermissionDenied)
  onPermissionDeniedRef.current = onPermissionDenied

  const onTrackingStatusChangeRef = useRef(onTrackingStatusChange)
  onTrackingStatusChangeRef.current = onTrackingStatusChange

  useEffect(() => {
    if (!enabled) {
      onTrackingStatusChangeRef.current?.('inactive')
      return
    }

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      onTrackingStatusChangeRef.current?.('error')
      onPermissionDeniedRef.current?.('Tarayıcınız kamera erişimini desteklemiyor.')
      return
    }

    let isCancelled = false
    let faceMeshInstance: any = null
    let cameraInstance: any = null
    let activeStream: MediaStream | null = null

    // Dikkat ve göz kırpma zamanlayıcı durumları
    let anomalyStartTime: number | null = null
    let isAttentionLost = false
    let wasBlinkingInCurrentBout = false
    let restoreConsecutiveFrames = 0

    const stopAllResources = () => {
      try {
        if (cameraInstance && typeof cameraInstance.stop === 'function') {
          cameraInstance.stop()
        }
      } catch {}
      cameraInstance = null

      try {
        const videoEl = videoRef.current
        const stream = (videoEl?.srcObject as MediaStream | null) || activeStream
        if (stream) {
          stream.getTracks().forEach((track) => {
            try {
              track.stop()
            } catch {}
          })
        }
        if (videoEl) {
          videoEl.srcObject = null
        }
      } catch {}
      activeStream = null

      try {
        if (faceMeshInstance && typeof faceMeshInstance.close === 'function') {
          faceMeshInstance.close()
        }
      } catch {}
      faceMeshInstance = null
    }

    async function initEyeTracker() {
      onTrackingStatusChangeRef.current?.('initializing')

      // 1. Önce kamera iznini doğrula (izin verilmezse özellik derhal inactive olur)
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: 'user',
            frameRate: { ideal: 15, max: 24 },
          },
          audio: false,
        })
      } catch (err: any) {
        if (isCancelled) return
        stopAllResources()
        onTrackingStatusChangeRef.current?.('error')
        const msg =
          err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
            ? 'Kamera izni verilmedi. Göz takibi devre dışı bırakıldı.'
            : 'Kamera başlatılamadı veya bulunamadı.'
        onPermissionDeniedRef.current?.(msg)
        return
      }

      if (isCancelled) {
        stopAllResources()
        return
      }

      // Başlangıç izin kontrolü stream'ini kapatıp MediaPipe Camera'ya devret
      activeStream.getTracks().forEach((t) => t.stop())
      activeStream = null

      try {
        const { FaceMesh, Camera } = await resolveMediaPipeModules()
        if (isCancelled || !videoRef.current) {
          stopAllResources()
          return
        }

        faceMeshInstance = new FaceMesh({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        })

        faceMeshInstance.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })

        faceMeshInstance.onResults((results: any) => {
          if (isCancelled) return

          const now = performance.now()
          const faces: Landmark3D[][] | undefined = results?.multiFaceLandmarks
          const hasFace = Array.isArray(faces) && faces.length > 0

          if (!hasFace) {
            // Kamera önünde yüz algılanamadı (ekrandan uzaklaşma / baş çevirme)
            restoreConsecutiveFrames = 0
            if (anomalyStartTime === null) {
              anomalyStartTime = now
            } else if (!isAttentionLost && now - anomalyStartTime >= attentionLossDelayMs) {
              isAttentionLost = true
              onTrackingStatusChangeRef.current?.('attention-lost')
              onBlinkOrLookAwayRef.current('no-face')
            }
            return
          }

          const landmarks = faces[0]
          const leftEar = calculateLeftEyeEAR(landmarks)

          if (leftEar < earThreshold) {
            // Sol göz EAR değeri eşiğin (örn. 0.18) altında
            restoreConsecutiveFrames = 0
            wasBlinkingInCurrentBout = true
            if (anomalyStartTime === null) {
              anomalyStartTime = now
            } else if (!isAttentionLost && now - anomalyStartTime >= attentionLossDelayMs) {
              isAttentionLost = true
              onTrackingStatusChangeRef.current?.('attention-lost')
              onBlinkOrLookAwayRef.current('eyes-closed')
            }
          } else {
            // Göz açık (EAR >= earThreshold) ve yüz kamerada
            if (
              anomalyStartTime !== null &&
              !isAttentionLost &&
              wasBlinkingInCurrentBout &&
              now - anomalyStartTime >= 60 &&
              now - anomalyStartTime < attentionLossDelayMs
            ) {
              // Kısa doğal göz kırpma (< 380ms): akışı durdurmadan mikro telafi bildir
              onMicroBlinkRef.current?.()
            }

            anomalyStartTime = null
            wasBlinkingInCurrentBout = false

            if (isAttentionLost) {
              restoreConsecutiveFrames += 1
              // Kararlı geri dönüş için ardışık 2 kare boyunca gözün açık ve ekranda olmasını bekle
              if (restoreConsecutiveFrames >= 2) {
                isAttentionLost = false
                restoreConsecutiveFrames = 0
                onTrackingStatusChangeRef.current?.('active')
                onAttentionRestoredRef.current()
              }
            }
          }
        })

        cameraInstance = new Camera(videoRef.current, {
          onFrame: async () => {
            if (isCancelled || !faceMeshInstance || !videoRef.current) return
            try {
              await faceMeshInstance.send({ image: videoRef.current })
            } catch {
              // Tekil kare hatalarını sessizce yut
            }
          },
          width: 320,
          height: 240,
        })

        await cameraInstance.start()
        if (!isCancelled) {
          onTrackingStatusChangeRef.current?.('active')
        }
      } catch (err) {
        if (isCancelled) return
        stopAllResources()
        onTrackingStatusChangeRef.current?.('error')
        onPermissionDeniedRef.current?.('Göz izleme modeli yüklenemedi.')
      }
    }

    initEyeTracker()

    return () => {
      isCancelled = true
      stopAllResources()
    }
  }, [enabled, earThreshold, attentionLossDelayMs])

  return (
    <video
      ref={videoRef}
      className="hidden pointer-events-none"
      playsInline
      muted
      aria-hidden="true"
    />
  )
}
