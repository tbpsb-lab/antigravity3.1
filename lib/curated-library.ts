export type CuratedPassage = {
  id: string
  title: string
  author: string
  category: 'Edebiyat' | 'Bilim' | 'Felsefe' | 'Odak'
  wordCount: number
  estimatedSeconds: number
  description: string
  text: string
}

export const CURATED_LIBRARY: CuratedPassage[] = [
  {
    id: 'sabahattin-ali-madonna',
    title: 'Kürk Mantolu Madonna',
    author: 'Sabahattin Ali',
    category: 'Edebiyat',
    wordCount: 168,
    estimatedSeconds: 30,
    description: 'İnsan ruhunun derinliklerine ve sessiz bağlılıklara dair unutulmaz bir klasik pasajı.',
    text: `# Kürk Mantolu Madonna
Sabahattin Ali

İçimizde konuşan, bizimle beraber yaşayan fakat sesini kimseye duyuramayan ikinci bir insan vardır. Bu insan, hakiki benliğimizdir. Dünyadaki bütün gürültü patırtı içinde sadece onun fısıltısını dinleyebilenler, asıl huzuru ve yalnızlığın asil ağırlığını anlarlar.

Bir insanın diğer bir insanı bütünüyle anlaması belki de imkânsızdır. Fakat anlamaya çalışmanın yarattığı o derin şefkat, hayatın en büyük tesellisidir. İnsanlar birbirlerini ararlar, bulduklarını sanırlar ve sonra yine kendi iç dünyalarının sessiz kıyılarına çekilirler.

Bana öyle geliyor ki, bir insana bağlanmak, onunla birlikte dünyanın bütün yükünü omuzlamak demektir. Bu bağlılıkta ne riya vardır ne de menfaat; sadece iki ruhun sessizce birbiriyle selamlaşması vardır.`,
  },
  {
    id: 'neuroplasticity-reading',
    title: 'Beyin, Nöroplastisite ve RSVP',
    author: 'Bilişsel Sinirbilim',
    category: 'Bilim',
    wordCount: 184,
    estimatedSeconds: 32,
    description: 'İnsan beyninin görsel bilgiyi nasıl işlediğini ve göz sıçramalarını sıfırlayan bilimsel mekanizma.',
    text: `# Nöroplastisite ve Görsel Algı
Bilişsel Sinirbilim Araştırmaları

Geleneksel okumada insan beyni, kelimelerin anlamından ziyade göz kaslarının mekanik hareketlerine enerji harcar. Her satırda gerçekleşen istemsiz sakkad sıçramaları ve geriye dönüşler (regresyon), okuma sürecinin neredeyse yüzde yetmişini tüketir.

Hızlı Seri Görsel Sunum (RSVP) yöntemi ise bu mekanik yükü tamamen sıfırlar. Kelimeler retinadaki fovea merkezine doğrudan ve tek bir odak noktasında yansıtıldığında, beynin görsel korteksi sembolleri anında kavrar. İç seslendirme refleksi hafifler ve kavrama hızı düşünce hızına yaklaşır.

Nöroplastisite sayesinde beyin, kelimeleri harf harf hecelemek yerine bütüncül kavramsal desenler olarak tanımayı öğrenir. Bu durum zihnin anlama kapasitesini ve derin odaklanma süresini katlar.`,
  },
  {
    id: 'marcus-aurelius-meditations',
    title: 'Kendime Düşünceler',
    author: 'Marcus Aurelius',
    category: 'Felsefe',
    wordCount: 156,
    estimatedSeconds: 28,
    description: 'Stoacı felsefenin zamana, zihinsel dinginliğe ve şimdiki ana bakışı.',
    text: `# Kendime Düşünceler
Marcus Aurelius

Sabah uyandığında kendine şunu söyle: Bugün karşılaşacağım insanlar bencil, nankör, kıskanç ve huysuz olabilirler. Fakat onların bu kusurları, iyi ile kötüyü birbirinden ayıramamalarından ileri gelir. Bense iyinin doğasını ve asaletini bilirim.

Zihnini kendi içinde topla. İnsanların sığınacak yer aramak için dağlara veya deniz kıyılarına kaçmalarına gerek yoktur; hiçbir yer bir insanın kendi ruhundan daha sakin ve huzurlu olamaz.

Hayatın kısalığını hatırla. Şimdiki andan başka kaybedecek hiçbir şeyimiz yoktur. Öyleyse zihnini boş kuruntulardan arındır, önündeki görevi bir Roma vatandaşına yakışır ciddiyet ve sevgiyle yerine getir.`,
  },
  {
    id: 'focus-warmup-100',
    title: '100 Kelimelik Odak Isınması',
    author: 'odak Platformu',
    category: 'Odak',
    wordCount: 100,
    estimatedSeconds: 18,
    description: 'Göz kaslarını dinlendirip RSVP hız ritmine alıştıran 100 kelimelik dinamik ısınma metni.',
    text: `# 100 Kelimelik Odak Egzersizi
odak Hazırlık İstasyonu

Gözlerinizi kırmızı odak noktasına kilitleyin. Kelimeleri takip etmek için çaba harcamayın; kelimelerin size gelmesine izin verin.

Nefesinizi yavaşlatın ve sakin bir ritme kavuşun. RSVP okumasında anahtar, harfleri değil anlamı doğrudan kavramaktır. Birkaç saniye içinde göz kaslarınız dinlenecek ve zihniniz berraklaşacaktır.

Hız arttıkça iç sesiniz susar; bu durum tamamen doğaldır ve beyninizin sembolleri doğrudan kavramsal bilgiye dönüştürdüğünü gösterir. Harika gidiyorsunuz.`,
  },
]
