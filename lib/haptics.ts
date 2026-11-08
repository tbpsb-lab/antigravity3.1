// odak Mobil Dokunsal (Haptik) Geri Bildirim Motoru
let hasPrimed = false

/**
 * Mobil Chrome ve Android tarayıcılarda kullanıcı jesti (user activation) gereksinimini
 * ilk dokunuş anında (touchstart / pointerdown) önceden açarak swipe sırasındaki
 * touchmove kaynaklı kısıtlamayı (Intervention) ortadan kaldırır.
 */
export function primeHaptics() {
  if (typeof window === 'undefined' || hasPrimed) return
  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      // 0ms çağrısı motorda fiziksel titreşim yapmaz, ancak tarayıcıda izni aktive eder
      navigator.vibrate(0)
      hasPrimed = true
    }
  } catch {
    // Sessizce devam et
  }
}

export function triggerHaptic(type: 'step' | 'jump' | 'success' | 'tap' = 'step') {
  if (typeof window === 'undefined') return
  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      if (type === 'step') {
        // Hız değişimi (WPM ±25): Telefon motorunun hissedilir netlikte dönmesi için 24ms mikro-tık
        navigator.vibrate(24)
      } else if (type === 'jump') {
        // Cümle atlama / geri sarma: İkili belirgin dokunuş
        navigator.vibrate([20, 35, 20])
      } else if (type === 'success') {
        // Okuma tamamlanma / başarı ritmi
        navigator.vibrate([30, 45, 30, 45, 50])
      } else if (type === 'tap') {
        navigator.vibrate(18)
      }
    }
  } catch {
    // Tarayıcı desteklemiyorsa sessizce devam et
  }
}
