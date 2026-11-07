import {
  Bookmark,
  CheckCircle2,
  Compass,
  Eye,
  FileText,
  Headphones,
  Keyboard,
  Layers,
  Maximize,
  MousePointer,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Touchpad,
  Volume2,
  Waves,
  Zap,
  type LucideIcon,
} from 'lucide-react'

export type GuideFeatureItem = {
  id: string
  title: string
  subtitle?: string
  badge?: string
  shortcutKey?: string
  icon: LucideIcon
  iconColor: string
  description: string
  category: 'core' | 'reading' | 'pdf' | 'audio' | 'nav'
  highlights?: string[]
}

export type GuideShortcutItem = {
  key: string
  description: string
  category: 'temel' | 'navigasyon' | 'metin' | 'sistem'
  icon?: LucideIcon
  iconColor?: string
}

export type GuideTouchItem = {
  title: string
  gesture: string
  description: string
  icon: LucideIcon
  iconColor: string
}

export type GuideScienceItem = {
  title: string
  subtitle: string
  description: string
  icon: LucideIcon
  iconColor: string
  bulletPoints?: string[]
}

/**
 * 1. RSVP ve Bilişsel Bilim Maddeleri
 */
export const GUIDE_SCIENCE: GuideScienceItem[] = [
  {
    title: 'Sakkad ve Regresyon Hareketlerini Sıfırlama',
    subtitle: 'Fiziksel Göz Yorgunluğunu Ortadan Kaldırın',
    icon: Eye,
    iconColor: 'text-pivot',
    description:
      'Geleneksel okumada insan gözü satır üzerinde düz bir hat izlemez; her kelimede mikro sıçramalar (sakkad) yapar ve istemsiz geriye dönüşlerle (regresyon) duraksar. Göz kaslarının bu yorucu mekanik hareketi, toplam okuma sürenizin %70 ila %80\'ini sessizce tüketir. odak, kelimeleri doğrudan gözünüzün odaklandığı sabit noktaya taşıyarak göz kası yorgunluğunu sıfıra indirir.',
  },
  {
    title: 'ORP (Optimal Tanıma Noktası) & Kırmızı Nirengi',
    subtitle: 'Piksel Hassasiyetinde Karakteristik Harf Hizalama',
    icon: Zap,
    iconColor: 'text-amber-500',
    description:
      'Bilişsel psikoloji araştırmaları, beynin bir kelimeyi ilk harfinden itibaren heceleyerek değil; kelimenin ağırlık merkezindeki en karakteristik harfe (genellikle kelimenin 1/3\'lük sol-orta noktası) kilitlenerek tanıdığını kanıtlamıştır. Platformdaki kırmızı dikey nirengi çizgisi, her kelimenin ORP harfini piksel hassasiyetiyle aynı dikey eksene hizalar. Gözünüz sabit kalır, algılama eşiği minimuma iner.',
  },
  {
    title: 'İç Seslendirme (Subvocalization) Bariyerini Aşma',
    subtitle: 'Konuşma Sınırından Düşünce Hızına Geçiş',
    icon: Sparkles,
    iconColor: 'text-sky-500',
    description:
      'Pek çok okur, okurken kelimeleri zihninde fısıldar. Bu alışkanlık okuma hızınızı konuşma sınırına (dakikada ~200-250 kelime) kilitler. RSVP ile hızınızı kademeli olarak 400-600 WPM seviyesine çıkardığınızda, iç ses susar; zihniniz doğrudan görsel kavramaya geçer ve düşünce hızınızla okuma hızınız eşitlenir.',
  },
  {
    title: 'Nöroakustik Çapa: Pembe Gürültü (1/f) & 40 Hz Gama Vuruşları',
    subtitle: 'Çift Katmanlı Algoritmik Akustik Rezonans',
    icon: Waves,
    iconColor: 'text-indigo-500',
    description:
      'Gözler hızlandıkça zihnin çevresel seslerle dikkatinin dağılmasını önlemek için Web Audio API tabanlı nöroakustik ses motoru geliştirilmiştir:',
    bulletPoints: [
      'Pembe Gürültü (1/f Spektrumu): Beyaz gürültünün aksine her oktavda eşit enerji taşır (yağmur ve okyanus dalgası frekansı). Beyin korteksindeki akustik değişimleri absorbe eder ve zihinsel yorgunluğu azaltır.',
      '40 Hz Gama Binaural Vuruşları (Kulaklık Tavsiye Edilir): Sol kulağa 200 Hz, sağ kulağa 240 Hz saf sinüs dalgası iletilir. Beynin superior olivary çekirdeği aradaki 40 Hz\'lik gama farkını birleştirerek nöral senkronizasyon ve derin kavrama hali oluşturur.',
    ],
  },
]

/**
 * 2. Özellikler Listesi (Sürekli Güncel, Tek Noktadan Yönetilen Kayıt Defteri)
 */
export const GUIDE_FEATURES: GuideFeatureItem[] = [
  {
    id: 'chunking-bionic',
    title: 'Kelime Bloklama & Akıllı Bionic',
    subtitle: '1K, 2K, 3K, 4K Çoklu Kelime & Akıllı Kök Vurgulama',
    badge: '1K • 2K • 3K • 4K',
    shortcutKey: 'C / B',
    icon: Layers,
    iconColor: 'text-purple-500',
    category: 'reading',
    description:
      "Kelimeleri 1'li, 2'li, 3'lü veya 4'lü bloklar halinde `C` tuşu ile akıtma imkanı. Çoklu kelimede Akıllı Bionic `B` tuşu ile kök harfleri vurgulayarak bağlaç ve ekleri gölgede bırakır; periferik görüşünüzü maksimum hızda devreye sokar.",
    highlights: [
      "RSVP ekranındaki kelime etiketine tıklayarak veya `C` tuşuyla anında geçiş",
      "Çoklu kelime modunda (2K-4K) `B` tuşuyla Bionic kök okumayı etkinleştirme",
    ],
  },
  {
    id: 'pdf-smart-engine',
    title: 'Akıllı PDF & Kitap Okuma Motoru',
    subtitle: 'Önsöz Atlatma, OCR Yazım Denetimi & Sayfa Sayacı',
    badge: 'Gelişmiş PDF',
    icon: FileText,
    iconColor: 'text-sky-500',
    category: 'pdf',
    description:
      "Yüklenen kitaplarda kapak, telif ve önsöz gibi okunmayan bölümleri otomatik algılayıp atlayarak doğrudan birinci bölümden başlar. Bozuk OCR tarama hatalarını ve satır sonu hece bölünmelerini akıllı Türkçe yazım denetimiyle kusursuzlaştırır.",
    highlights: [
      "Kitabın gerçek sayfa numarasını takip eden sayaç (`sf: 11 / 205`)",
      "Yu Hua'nın 'Yaşamak' başyapıtı varsayılan olarak yüklü",
      'Cihaz içi %100 yerel ayrıştırma (hiçbir veri sunucuya gitmez)',
    ],
  },
  {
    id: 'smart-footnotes',
    title: 'Akıllı Dipnot Sistemi',
    subtitle: 'Metin İçi Dipnot İzolasyonu & Açıklama Penceresi',
    badge: 'D Tuşu',
    shortcutKey: 'D',
    icon: Bookmark,
    iconColor: 'text-amber-500',
    category: 'reading',
    description:
      "Metin içindeki dipnot referanslarını (örneğin Erxi*, fen1ik*) ve dipnot içeriklerini akıllıca yakalar. `D` tuşu ile dipnotları okuma akışına dahil edebilir veya atlayabilirsiniz. Dipnot geldiğinde bağlam çubuğunda açıklaması anında belirir.",
  },
  {
    id: 'zen-mode-curl',
    title: 'Zen Modu & Sayfa Kıvrımı Şeffaflığı',
    subtitle: 'Sıfır Dikkat Dağıtıcı Arayüz & %80 Transparan Kıvrım',
    badge: 'Zen Modu',
    shortcutKey: 'Boşluk / Çift Tık',
    icon: Maximize,
    iconColor: 'text-emerald-500',
    category: 'reading',
    description:
      "Okuma başladığında veya ekrana çift tıklandığında tüm düğmeler ve arayüz gizlenir. Sağ alttaki nostaljik kitap sayfası kıvrımı görseli Zen modunda %80 şeffaflıkla (%20 opaklık) silikleşir; gözünüzü yormadan estetik bir okuma keyfi sunar.",
  },
  {
    id: 'neuro-audio-engine',
    title: 'Nöroakustik Ses Motoru',
    subtitle: 'Saf Algoritmik Pembe Gürültü ve 40 Hz Gama Vuruşları',
    badge: 'M Tuşu',
    shortcutKey: 'M',
    icon: Volume2,
    iconColor: 'text-indigo-500',
    category: 'audio',
    description:
      "Web Audio API ile harici dosya yüklemeden saf matematiksel Pembe Gürültü (1/f) ve 40 Hz Gama Vuruşları (Sol 200 Hz, Sağ 240 Hz) sentezler. Çevresel gürültüyü maskeler, derin odaklanma sağlar (`M` tuşu).",
  },
  {
    id: 'eye-tracking-ai',
    title: 'Yapay Zeka Göz ve Dikkat Takibi',
    subtitle: 'Web Kamerasıyla Otomatik Akış Duraklatma',
    badge: 'G Tuşu',
    shortcutKey: 'G',
    icon: Eye,
    iconColor: 'text-emerald-500',
    category: 'core',
    description:
      "Cihazınızın web kamerasıyla gözlerinizi takip eder (`G` tuşu). Bakışınız ekrandan veya okuma noktasından ayrıldığında akışı otomatik duraklatır; tekrar odaklandığınızda kaldığı yerden devam eder.",
  },
  {
    id: 'context-peek-rewind',
    title: 'Akıllı Cümle Başı & Context Peek',
    subtitle: '3 Satırlı Bağlam Penceresi & Nabız Animasyonu',
    badge: '← / →',
    shortcutKey: '← / →',
    icon: RotateCcw,
    iconColor: 'text-teal-500',
    category: 'nav',
    description:
      "Duraklatıldığında okunan cümlenin 3 satırlı bağlamını sunar; geri sarma tuşuna (`←`) basıldığında kelime kelime değil, doğrudan cümlenin başına zıplar ve hafif bir nabızla parlar.",
  },
  {
    id: 'precision-speed-control',
    title: 'Çift Yönlü 25 WPM Hassas Hız Kontrolü',
    subtitle: 'Fare Tekerleği, Yön Tuşları ve Dikey Mobil Kaydırma',
    badge: '100–1200 WPM',
    shortcutKey: '↑ / ↓ / Scroll',
    icon: MousePointer,
    iconColor: 'text-cyan-500',
    category: 'core',
    description:
      "Farenin tekerleğiyle gerek arayüzde gerekse okuma akışı devam ederken ritmi hiç bozmadan 25'er kelimelik hassas hız kontrolü. Yumuşak kalkış (ramp-up) ve 500 kelimede bir 0.5 sn bilişsel dinlenme.",
  },
]

/**
 * 3. Klavye & Fare Kısayolları (Masaüstü Tam Kılavuz)
 */
export const GUIDE_SHORTCUTS: GuideShortcutItem[] = [
  {
    key: 'Boşluk (Space)',
    description: 'Başlat / Duraklat (Okurken otomatik Zen Modu)',
    category: 'temel',
    icon: Zap,
    iconColor: 'text-pivot',
  },
  {
    key: 'C Tuşu',
    description: 'Kelime Bloklama (1K, 2K, 3K, 4K geçişi)',
    category: 'metin',
    icon: Layers,
    iconColor: 'text-purple-500',
  },
  {
    key: 'B Tuşu',
    description: 'Akıllı Bionic Öbekleme (2K–4K modunda kök vurgusu)',
    category: 'metin',
    icon: Sparkles,
    iconColor: 'text-sky-500',
  },
  {
    key: 'D Tuşu',
    description: 'Metin İçi Dipnotları Oku / Atla (Açık/Kapalı)',
    category: 'metin',
    icon: Bookmark,
    iconColor: 'text-amber-500',
  },
  {
    key: '← (Sol Ok)',
    description: 'Akıllı Cümle Başına Geri Sar (Peek vurgusu)',
    category: 'navigasyon',
    icon: RotateCcw,
    iconColor: 'text-teal-500',
  },
  {
    key: '→ (Sağ Ok)',
    description: 'Sonraki Cümleye İlerle',
    category: 'navigasyon',
    icon: RotateCcw,
    iconColor: 'text-teal-500',
  },
  {
    key: 'Shift + ←',
    description: 'Önceki Bölüm veya Sayfaya Atla',
    category: 'navigasyon',
    icon: Compass,
    iconColor: 'text-blue-500',
  },
  {
    key: 'Shift + →',
    description: 'Sonraki Bölüm veya Sayfaya Atla',
    category: 'navigasyon',
    icon: Compass,
    iconColor: 'text-blue-500',
  },
  {
    key: '↑ / ↓ veya Scroll',
    description: 'Hassas Okuma Hızı Ayarı (±25 WPM)',
    category: 'temel',
    icon: MousePointer,
    iconColor: 'text-cyan-500',
  },
  {
    key: 'M Tuşu',
    description: 'Nöro-Odak Sesi (Pembe Gürültü & 40 Hz Gama)',
    category: 'temel',
    icon: Volume2,
    iconColor: 'text-indigo-500',
  },
  {
    key: 'G Tuşu',
    description: 'Yapay Zeka Destekli Göz & Dikkat Takibi',
    category: 'temel',
    icon: Eye,
    iconColor: 'text-emerald-500',
  },
  {
    key: '1, 2, 3 Tuşları',
    description: 'Temaları Değiştir (1: Cam, 2: Neon, 3: Kağıt)',
    category: 'sistem',
    icon: Sparkles,
    iconColor: 'text-amber-500',
  },
  {
    key: 'F Tuşu',
    description: 'Tam Ekran Modunu Aç / Kapat',
    category: 'sistem',
    icon: Maximize,
    iconColor: 'text-purple-400',
  },
  {
    key: 'ESC Tuşu',
    description: 'Durdur / Açık Pencereleri ve Modalları Kapat',
    category: 'sistem',
    icon: Zap,
    iconColor: 'text-slate-400',
  },
]

/**
 * 4. Mobil & Dokunmatik Kontroller
 */
export const GUIDE_TOUCH_CONTROLS: GuideTouchItem[] = [
  {
    title: '3 Görünmez Dokunma Bölgesi (Tap Zones)',
    gesture: 'Ekran Dokunuşları',
    icon: Touchpad,
    iconColor: 'text-emerald-500',
    description:
      'Sol %25: Cümlenin başına geri sarar • Orta %50: Okumayı anında başlatır veya duraklatır • Sağ %25: 1 kelime ileri atlar.',
  },
  {
    title: 'Dikey Kaydırma (Vertical Swipe) Hız Ayarı',
    gesture: 'Yukarı / Aşağı Kaydırma',
    icon: Zap,
    iconColor: 'text-amber-500',
    description:
      'Okuma alanı üzerinde parmağınızı yukarı kaydırdığınızda hızınız 25\'er WPM artar, aşağı kaydırdığınızda azalır. Sayfanın yanlışlıkla yenilenmesini önleyen dokunmatik kilit bulunur.',
  },
  {
    title: 'Çift Dokunma ile Zen Modu',
    gesture: 'Ekrana Çift Tıklama / Dokunma',
    icon: Maximize,
    iconColor: 'text-sky-500',
    description:
      'Arayüzdeki tüm kontrol panellerini anında gizleyerek sadece metne odaklanmanızı sağlar. Sağ alttaki sayfa kıvrımı %80 şeffaflaşır.',
  },
]

/**
 * 5. Künye & Uygulama Bilgileri
 */
export const APP_METADATA = {
  name: 'odak',
  version: '2.4.0',
  releaseDate: '7 Kasım 2026',
  creator: 'Alper BEYAZ',
  location: 'Marmaris',
  architecture: [
    'Next.js 15 & React 19',
    'Tailwind CSS & Web Audio API',
    'Cihaz İçi PDF.js & EPUB Parser',
    'Türkçe ORP Algoritması',
    'Tamamen Çevrimdışı (PWA)',
  ],
}
