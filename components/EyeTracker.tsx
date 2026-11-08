'use client'

import { useEffect, useRef } from 'react'

export type Landmark3D = {
  x: number
  y: number
  z: number
}

export type AttentionLossReason =
  | 'head-turned'
  | 'looking-away'
  | 'eyes-closed'
  | 'eyes-squinted'
  | 'no-face'

export type EyeTrackerProps = {
  /** Özellik aktif mi? Kapalıyken kamera ve MediaPipe hiç çalıştırılmaz. */
  enabled: boolean
  /** Doğal göz kırpmalarını (100-350ms) filtreleyen, uzun göz kapatma eşiği (ms, varsayılan: 420) */
  blinkGracePeriodMs?: number
  /** Gözlerin kısılması / yorgunluk algılama süre eşiği (ms, varsayılan: 800) */
  squintDurationMs?: number
  /** Başın sağa/sola çevrilmesi durumunda hızlı duraklatma gecikmesi (ms, varsayılan: 150) */
  headTurnDurationMs?: number
  /** Yüzün kadrajdan çıkması durumunda duraklatma gecikmesi (ms, varsayılan: 200) */
  noFaceDurationMs?: number
  /** Dikkat kaybı tetiklendiğinde çağrılır */
  onBlinkOrLookAway: (reason: AttentionLossReason) => void
  /** Dikkat doğrudan ekrana döndüğünde çağrılır */
  onAttentionRestored: () => void
  /** Kısa doğal göz kırpmalarında (< blinkGracePeriodMs) mikro telafi bildirimi */
  onMicroBlink?: () => void
  /** Kamera izni verilmediğinde veya kamera bulunamadığında tetiklenir */
  onPermissionDenied?: (errorMessage: string) => void
  /** Kamera ve model çalışma durumu değiştiğinde tetiklenir */
  onTrackingStatusChange?: (
    status: 'inactive' | 'initializing' | 'active' | 'attention-lost' | 'error',
  ) => void
}

/**
 * İki 2D nokta arasındaki Öklid mesafesi.
 * Göz kapağı açıklığı (EAR) hesaplamasında derinlik (z) gürültüsünü önlemek için 2D kullanılır.
 */
function distance2D(p1: Landmark3D, p2: Landmark3D): number {
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 6-noktalı standart EAR (Eye Aspect Ratio) hesaplaması.
 * EAR = (||pTop1 - pBot1|| + ||pTop2 - pBot2||) / (2 * ||pOuter - pInner||)
 */
function calculateSingleEyeEAR(
  landmarks: Landmark3D[],
  outerIdx: number,
  innerIdx: number,
  top1Idx: number,
  bot1Idx: number,
  top2Idx: number,
  bot2Idx: number,
): number {
  const pOuter = landmarks[outerIdx]
  const pInner = landmarks[innerIdx]
  const pTop1 = landmarks[top1Idx]
  const pBot1 = landmarks[bot1Idx]
  const pTop2 = landmarks[top2Idx]
  const pBot2 = landmarks[bot2Idx]

  if (!pOuter || !pInner || !pTop1 || !pBot1 || !pTop2 || !pBot2) return 0.22

  const v1 = distance2D(pTop1, pBot1)
  const v2 = distance2D(pTop2, pBot2)
  const h = distance2D(pOuter, pInner)

  if (h <= 0.0001) return 0.22
  return (v1 + v2) / (2.0 * h)
}

/**
 * Göz açıklık oranını (EAR) iki göz için ayrı ayrı ve ortalama olarak hesaplar.
 * Sağ göz (anatomik sağ, kamerada sol): 33, 133, 160, 144, 158, 153
 * Sol göz (anatomik sol, kamerada sağ): 263, 362, 387, 373, 385, 380
 */
export function calculateEyeMetrics(landmarks: Landmark3D[]) {
  const rightEar = calculateSingleEyeEAR(landmarks, 33, 133, 160, 144, 158, 153)
  const leftEar = calculateSingleEyeEAR(landmarks, 263, 362, 387, 373, 385, 380)
  const avgEar = (rightEar + leftEar) / 2.0

  return { rightEar, leftEar, avgEar }
}

/**
 * Geriye dönük uyumluluk için sol göz EAR fonksiyonu.
 */
export function calculateLeftEyeEAR(landmarks: Landmark3D[]): number {
  return calculateSingleEyeEAR(landmarks, 263, 362, 387, 373, 385, 380)
}

/**
 * Başın yatay eksende (Yaw) sağa veya sola çevrilip çevrilmediğini
 * MediaPipe yüz landmark koordinatlarından hassas şekilde hesaplar.
 * Burun ucu (1), yüz kenarları (234, 454), göz dış uçları (33, 263).
 */
export function calculateHeadPose(landmarks: Landmark3D[]) {
  const nose = landmarks[1]
  const leftFaceEdge = landmarks[454]
  const rightFaceEdge = landmarks[234]
  const rightEyeOuter = landmarks[33]
  const leftEyeOuter = landmarks[263]

  if (!nose || !leftFaceEdge || !rightFaceEdge || !rightEyeOuter || !leftEyeOuter) {
    return {
      yawRatio: 0,
      symmetryRatio: 0.5,
      yawAngleDeg: 0,
      isHeadTurned: false,
      isHeadFacingScreen: true,
    }
  }

  // 1. Burun ucunun iki gözün orta noktasına göre yatay sapması (Normal ekranda: -0.05 ~ +0.05)
  const eyeMidX = (rightEyeOuter.x + leftEyeOuter.x) / 2.0
  const eyeDist = Math.abs(leftEyeOuter.x - rightEyeOuter.x)
  const yawRatio = eyeDist > 0.001 ? (nose.x - eyeMidX) / eyeDist : 0

  // 2. Yanak - burun simetri oranı (Doğrudan karşıya bakışta ~0.50)
  const faceWidth = Math.abs(leftFaceEdge.x - rightFaceEdge.x)
  const distRightCheekToNose = Math.abs(nose.x - rightFaceEdge.x)
  const symmetryRatio = faceWidth > 0.001 ? distRightCheekToNose / faceWidth : 0.5

  // 3. Yüz kenarları derinlik (Z) farkı üzerinden 3D Yaw açısı
  const dx = leftFaceEdge.x - rightFaceEdge.x
  const dz = (leftFaceEdge.z || 0) - (rightFaceEdge.z || 0)
  const yawAngleDeg = Math.atan2(dz, dx) * (180.0 / Math.PI)

  // Baş sağa veya sola çevrilmiş mi? (~12-14 derecelik belirgin dönüşte anında tetiklenir)
  const isHeadTurned =
    Math.abs(yawRatio) > 0.10 ||
    symmetryRatio < 0.40 ||
    symmetryRatio > 0.60 ||
    Math.abs(yawAngleDeg) > 11.0

  // Baş doğrudan ekrana / kameraya bakıyor mu?
  const isHeadFacingScreen =
    Math.abs(yawRatio) <= 0.08 &&
    symmetryRatio >= 0.42 &&
    symmetryRatio <= 0.58 &&
    Math.abs(yawAngleDeg) <= 8.5

  return {
    yawRatio,
    symmetryRatio,
    yawAngleDeg,
    isHeadTurned,
    isHeadFacingScreen,
  }
}

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Tarayıcı ortamı bulunamadı.'))
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
  blinkGracePeriodMs = 420,
  squintDurationMs = 800,
  headTurnDurationMs = 150,
  noFaceDurationMs = 200,
  onBlinkOrLookAway,
  onAttentionRestored,
  onMicroBlink,
  onPermissionDenied,
  onTrackingStatusChange,
}: EyeTrackerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Callback referanslarını güncel tut
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

    // İzleme ve dikkat durumu referansları
    let isAttentionLost = false
    let restoreConsecutiveFrames = 0

    // Zaman sayıcıları
    let noFaceStartTime: number | null = null
    let eyeClosedStartTime: number | null = null
    let squintStartTime: number | null = null
    let headTurnStartTime: number | null = null

    // Eşik değerleri (Normal rahat ekrana bakış EAR ~0.15-0.24 arasıdır)
    // Göz kapalı: EAR < 0.10
    // Göz kısıldı / yorgunluk: 0.10 <= EAR < 0.135
    // Göz açık ve dikkatli: EAR >= 0.138
    const CLOSED_THRESHOLD = 0.10
    const SQUINT_THRESHOLD = 0.135
    const OPEN_THRESHOLD = 0.138

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

      // 1. Önce kamera iznini doğrula
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: 'user',
            frameRate: { ideal: 20, max: 24 },
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

      // Stream'i kapatıp MediaPipe Camera'ya devret
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

          // DURUM 1: Kamera önünde yüz algılanamadı (Kullanıcı tamamen uzaklaştı)
          if (!hasFace) {
            restoreConsecutiveFrames = 0
            eyeClosedStartTime = null
            squintStartTime = null
            headTurnStartTime = null

            if (noFaceStartTime === null) {
              noFaceStartTime = now
            } else if (!isAttentionLost && now - noFaceStartTime >= noFaceDurationMs) {
              isAttentionLost = true
              onTrackingStatusChangeRef.current?.('attention-lost')
              onBlinkOrLookAwayRef.current('no-face')
            }
            return
          }

          noFaceStartTime = null
          const landmarks = faces[0]

          // Her iki gözün EAR oranları ve ortalaması
          const { avgEar } = calculateEyeMetrics(landmarks)
          const headPose = calculateHeadPose(landmarks)

          const isEyesClosed = avgEar < CLOSED_THRESHOLD
          const isEyesSquinted = !isEyesClosed && avgEar < SQUINT_THRESHOLD

          // DURUM 2: Baş sağa veya sola çevrildi (Hızlı tepki: ~150ms içinde algılar)
          if (headPose.isHeadTurned) {
            eyeClosedStartTime = null
            squintStartTime = null
            restoreConsecutiveFrames = 0

            if (headTurnStartTime === null) {
              headTurnStartTime = now
            } else if (!isAttentionLost && now - headTurnStartTime >= headTurnDurationMs) {
              isAttentionLost = true
              onTrackingStatusChangeRef.current?.('attention-lost')
              onBlinkOrLookAwayRef.current('head-turned')
            }
            return
          }

          headTurnStartTime = null

          // DURUM 3: Gözler tamamen kapandı (Doğal anlık kırpma mı yoksa uyuma/kapatma mı?)
          if (isEyesClosed) {
            squintStartTime = null
            restoreConsecutiveFrames = 0

            if (eyeClosedStartTime === null) {
              eyeClosedStartTime = now
            } else if (!isAttentionLost && now - eyeClosedStartTime >= blinkGracePeriodMs) {
              isAttentionLost = true
              onTrackingStatusChangeRef.current?.('attention-lost')
              onBlinkOrLookAwayRef.current('eyes-closed')
            }
            return
          }

          // Gözler açık: önceki durum kısa bir doğal göz kırpması mıydı?
          if (eyeClosedStartTime !== null) {
            const closedDuration = now - eyeClosedStartTime
            if (!isAttentionLost && closedDuration >= 60 && closedDuration < blinkGracePeriodMs) {
              // Kısa göz kırpması (< 420ms): akış duraklatılmaz
              onMicroBlinkRef.current?.()
            }
            eyeClosedStartTime = null
          }

          // DURUM 4: Gözler kısıldı (Yorgunluk / uyuklama tespiti)
          if (isEyesSquinted) {
            restoreConsecutiveFrames = 0

            if (squintStartTime === null) {
              squintStartTime = now
            } else if (!isAttentionLost && now - squintStartTime >= squintDurationMs) {
              isAttentionLost = true
              onTrackingStatusChangeRef.current?.('attention-lost')
              onBlinkOrLookAwayRef.current('eyes-squinted')
            }
            return
          }

          squintStartTime = null

          // DURUM 5: Dikkat tekrar doğrudan ekrana döndüğünde otomatik devam et
          if (isAttentionLost) {
            // Baş ekrana dönük ve gözler normal açıkken devam et
            const isFullyFocused = headPose.isHeadFacingScreen && avgEar >= OPEN_THRESHOLD

            if (isFullyFocused) {
              restoreConsecutiveFrames += 1
              // Kararlı geri dönüş için ardışık 2 kare (~80-100ms) doğrudan ekrana bakılmasını bekle
              if (restoreConsecutiveFrames >= 2) {
                isAttentionLost = false
                restoreConsecutiveFrames = 0
                eyeClosedStartTime = null
                squintStartTime = null
                headTurnStartTime = null
                noFaceStartTime = null
                onTrackingStatusChangeRef.current?.('active')
                onAttentionRestoredRef.current()
              }
            } else {
              restoreConsecutiveFrames = 0
            }
          }
        })

        let isProcessingFrame = false
        cameraInstance = new Camera(videoRef.current, {
          onFrame: async () => {
            if (isCancelled || !faceMeshInstance || !videoRef.current || isProcessingFrame) return
            isProcessingFrame = true
            try {
              await faceMeshInstance.send({ image: videoRef.current })
            } catch {
              // Kare iletim hatalarını sessizce yut
            } finally {
              isProcessingFrame = false
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
  }, [
    enabled,
    blinkGracePeriodMs,
    squintDurationMs,
    headTurnDurationMs,
    noFaceDurationMs,
  ])

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
