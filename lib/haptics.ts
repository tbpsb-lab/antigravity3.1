// odak Mobil Dokunsal (Haptik) Geri Bildirim Motoru
export function triggerHaptic(type: 'step' | 'jump' | 'success' | 'tap' = 'step') {
  if (typeof window === 'undefined') return
  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      if (type === 'step') {
        // Hız değişimi (WPM ±25): Apple Watch Digital Crown hissi veren 10ms mikro-tık
        navigator.vibrate(10)
      } else if (type === 'jump') {
        // Cümle atlama / geri sarma: İkili hafif dokunuş
        navigator.vibrate([8, 25, 8])
      } else if (type === 'success') {
        // Okuma tamamlanma / başarı ritmi
        navigator.vibrate([15, 35, 20, 40, 30])
      } else if (type === 'tap') {
        navigator.vibrate(8)
      }
    }
  } catch {
    // Tarayıcı desteklemiyorsa sessizce devam et
  }
}
