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
  /** Doğal göz kırpmalarını (100-350ms) filtreleyen, uzun göz kapatma eşiği (ms, varsayılan: 450) */
  blinkGracePeriodMs?: number
  /** Gözlerin kısılması / yorgunluk algılama süre eşiği (ms, varsayılan: 750) */
  squintDurationMs?: number
  /** Başın sağa/sola çevrilmesi durumunda duraklatma gecikmesi (ms, varsayılan: 300) */
  headTurnDurationMs?: number
  /** Yüzün kadrajdan çıkması durumunda duraklatma gecikmesi (ms, varsayılan: 350) */
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

  if (!pOuter || !pInner || !pTop1 || !pBot1 || !pTop2 || !pBot2) return 0.25

  const v1 = distance2D(pTop1, pBot1)
  const v2 = distance2D(pTop2, pBot2)
  const h = distance2D(pOuter, pInner)

  if (h <= 0.0001) return 0.25
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
 * Baş duruşunu (Pose: Yaw, Pitch ve Simetri) MediaPipe yüz koordinatlarından hesaplar.
 * Burun ucu (1), yüz kenarları (234, 454), göz uçları (33, 263), alın (10), çene (152).
 */
export function calculateHeadPose(landmarks: Landmark3D[]) {
  const nose = landmarks[1]
  const leftFaceEdge = landmarks[454]
  const rightFaceEdge = landmarks[234]
  const rightEyeOuter = landmarks[33]
  const leftEyeOuter = landmarks[263]
  const forehead = landmarks[10]
  const chin = landmarks[152]

  if (!nose || !leftFaceEdge || !rightFaceEdge || !rightEyeOuter || !leftEyeOuter) {
    return {
      yawRatio: 0,
      symmetryRatio: 0.5,
      yawAngleDeg: 0,
      pitchRatio: 0.35,
      isHeadTurned: false,
      isHeadFacingScreen: true,
    }
  }

  // 1. Burun ucunun iki gözün orta noktasına göre yatay sapması
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

  // 4. Dikey kafa eğimi (Pitch)
  let pitchRatio = 0.35
  if (forehead && chin) {
    const faceHeight = Math.abs(chin.y - forehead.y)
    const midEyeY = (rightEyeOuter.y + leftEyeOuter.y) / 2.0
    pitchRatio = faceHeight > 0.001 ? (nose.y - midEyeY) / faceHeight : 0.35
  }

  // Baş sağa veya sola çevrilmiş mi?
  const isYawTurned =
    Math.abs(yawRatio) > 0.22 ||
    symmetryRatio < 0.32 ||
    symmetryRatio > 0.68 ||
    Math.abs(yawAngleDeg) > 17.0

  // Aşırı yukarı veya aşağı bakış
  const isPitchTurned = pitchRatio < 0.16 || pitchRatio > 0.56

  const isHeadTurned = isYawTurned || isPitchTurned

  // Baş doğrudan ekrana bakıyor mu?
  const isHeadFacingScreen =
    Math.abs(yawRatio) <= 0.15 &&
    symmetryRatio >= 0.38 &&
    symmetryRatio <= 0.62 &&
    Math.abs(yawAngleDeg) <= 13.0 &&
    pitchRatio >= 0.22 &&
    pitchRatio <= 0.48

  return {
    yawRatio,
    symmetryRatio,
    yawAngleDeg,
    pitchRatio,
    isHeadTurned,
    isHeadFacingScreen,
  }
}

/**
 * İris merkezleri (468, 473) yardımıyla bakış yönünü (Gaze) doğrular.
 */
export function calculateGazeDirection(landmarks: Landmark3D[]) {
  const rightIris = landmarks[468]
  const leftIris = landmarks[473]
  const rOuter = landmarks[33]
  const rInner = landmarks[133]
  const lOuter = landmarks[263]
  const lInner = landmarks[362]

  if (!rightIris || !leftIris || !rOuter || !rInner || !lOuter || !lInner) {
    return { isGazeAverted: false, avgGaze: 0.5 }
  }

  const rWidth = rInner.x - rOuter.x
  const lWidth = lOuter.x - lInner.x

  if (Math.abs(rWidth) < 0.008 || Math.abs(lWidth) < 0.008) {
    return { isGazeAverted: false, avgGaze: 0.5 }
  }

  const rPos = (rightIris.x - rOuter.x) / rWidth
  const lPos = (leftIris.x - lInner.x) / lWidth
  const avgGaze = (rPos + lPos) / 2.0

  // Bakışlar aşırı sola (<0.22) veya aşırı sağa (>0.78) kaymış mı?
  const isGazeAverted = avgGaze < 0.22 || avgGaze > 0.78

  return { isGazeAverted, avgGaze }
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
  blinkGracePeriodMs = 450,
  squintDurationMs = 750,
  headTurnDurationMs = 300,
  noFaceDurationMs = 350,
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

    // Adaptif göz açıklık referans değeri (kullanıcının doğal göz yapısına otomatik uyum sağlar)
    let baselineOpenEAR = 0.25

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

          // DURUM 1: Kamera önünde yüz algılanamadı
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
          const gaze = calculateGazeDirection(landmarks)

          // Kullanıcı ekrana doğru bakarken adaptif açık göz EAR değerini dinamik olarak güncelle
          if (headPose.isHeadFacingScreen && !gaze.isGazeAverted && avgEar >= 0.18) {
            baselineOpenEAR = baselineOpenEAR * 0.98 + avgEar * 0.02
            baselineOpenEAR = Math.max(0.21, Math.min(0.33, baselineOpenEAR))
          }

          // Adaptif eşik değerleri
          const closedThreshold = Math.min(0.13, baselineOpenEAR * 0.52)
          const squintThreshold = Math.min(0.185, baselineOpenEAR * 0.70)
          const openThreshold = Math.max(0.165, baselineOpenEAR * 0.76)

          const isLookingAway = headPose.isHeadTurned || gaze.isGazeAverted
          const isEyesClosed = avgEar < closedThreshold
          const isEyesSquinted = !isEyesClosed && avgEar < squintThreshold

          // DURUM 2: Baş sağa/sola çevrildi veya bakışlar ekrandan uzaklaştı
          if (isLookingAway) {
            eyeClosedStartTime = null
            squintStartTime = null
            restoreConsecutiveFrames = 0

            if (headTurnStartTime === null) {
              headTurnStartTime = now
            } else if (!isAttentionLost && now - headTurnStartTime >= headTurnDurationMs) {
              isAttentionLost = true
              onTrackingStatusChangeRef.current?.('attention-lost')
              onBlinkOrLookAwayRef.current(headPose.isHeadTurned ? 'head-turned' : 'looking-away')
            }
            return
          }

          headTurnStartTime = null

          // DURUM 3: Gözler tamamen kapandı (Doğal kısa kırpma mı yoksa uzun kapanma mı?)
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

          // Gözler açık: önceki durum doğal bir kısa göz kırpması mıydı?
          if (eyeClosedStartTime !== null) {
            const closedDuration = now - eyeClosedStartTime
            if (!isAttentionLost && closedDuration >= 70 && closedDuration < blinkGracePeriodMs) {
              // Kısa göz kırpması (< 450ms): akış duraklatılmaz, mikro telafi iletilir
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
            const isFullyFocused =
              headPose.isHeadFacingScreen &&
              !gaze.isGazeAverted &&
              avgEar >= openThreshold

            if (isFullyFocused) {
              restoreConsecutiveFrames += 1
              // Kararlı geri dönüş için ardışık 2 kare (~100-120ms) doğrudan ekrana bakılmasını bekle
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
