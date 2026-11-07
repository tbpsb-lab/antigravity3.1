/**
 * Türkçe Yapışık Kelime Ayırıcı, Sözlük ve Kök Bulucu (Turkish Stemmer & Word Splitter)
 *
 * Çevrimdışı (offline) 188.000+ kelimelik temizlenmiş Türkçe sözlük (turkish_words.json),
 * kademeli ek soyma (progressive stemming), ünlüyle başlayan eklerde ünsüz yumuşaması onarımı
 * (softening reversal), tezlik/yeterlilik birleşik fiil analizi ve kural tabanlı yapışık kelime
 * ayırma algoritmalarını birleştiren hibrit motor.
 */

import turkishWordsData from './turkish_words.json'

// Türkçe'ye özgü güvenli küçük harf dönüşümü (İ -> i, I -> ı ve combining dot \u0307 temizliği)
export function toTurkishLower(str: string): string {
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/\u0307/g, '')
}

// 1. ADIM: Sözlük Kurulumu - O(1) arama için JavaScript Set nesnesi
export const turkishDictSet: Set<string> = new Set(
  (turkishWordsData as string[]).map((w) => toTurkishLower(w)),
)

export const ALL_VOWELS = new Set([
  'a', 'e', 'ı', 'i', 'o', 'ö', 'u', 'ü',
  'A', 'E', 'I', 'İ', 'O', 'Ö', 'U', 'Ü',
])

// Kademeli ek soyma (stemming) için Türkçe çekim ve yapım ekleri listesi (uzundan kısaya)
export const TURKISH_SUFFIXES = [
  // 6-12 harfli birleşik çekim/yapım ekleri
  'lamayacağımı', 'lemeyeceğimi', 'amayacağımı', 'emeyeceğimi', 'amayacağını', 'emeyeceğini',
  'datamıyordum', 'detemiyordum', 'palamamasını', 'pelememesini', 'leştiriyormuş', 'laştırıyormuş',
  'ulmayanların', 'ülmeyenlerin', 'mayanların', 'meyenlerin', 'mamasını', 'memesini',
  'tığımızda', 'tiğimizde', 'tuğumuzda', 'tüğümüzde',
  'dığımızda', 'diğimizde', 'duğumuzda', 'düğümüzde',
  'tığınızda', 'tiğinizde', 'tuğunuzda', 'tüğünüzde',
  'dığınızda', 'diğinizde', 'duğunuzda', 'düğünüzde',
  'tıklarında', 'tiklerinde', 'tuklarında', 'tüklerinde',
  'dıklarında', 'diklerinde', 'duklarında', 'düklerinde',
  'larındaki', 'lerindeki', 'sındaki', 'sindeki',
  'kınımızdaki', 'kinimizdeki', 'mızdaki', 'mizdeki', 'muzdaki', 'müzdeki',
  'tığında', 'tiğinde', 'tuğunda', 'tüğünde',
  'dığında', 'diğinde', 'duğunda', 'düğünde',
  'tirmektedir', 'tirmekteler', 'mektedir', 'maktadır',
  'tirilmiş', 'tirilmişti', 'tirilmiştir',
  'laştırılmış', 'leştirilmiş', 'laştırılma', 'leştirilme',
  'landırıyor', 'lendiriyor', 'landırılmış', 'lendirilmiş',
  'ebiliyordu', 'abiliyordu', 'emiyordum', 'amıyordum', 'emiyordu', 'amıyordu', 'amıyorum', 'emiyorum',
  'ebildiğim', 'abildiğim', 'ebildiğin', 'abildiğin', 'ebildiği', 'abildiği',
  'ebilmek', 'abilmek', 'ebilmeli', 'abilmeli',
  'mayacağımı', 'meyeceğimi', 'mayacağını', 'meyeceğini',
  'meyecekler', 'mayacaklar', 'yecekler', 'yacaklar', 'ecekler', 'acaklar',
  'meliydik', 'malıydık', 'meliydim', 'malıydım', 'meliydi', 'malıydı', 'malısın', 'melisin',
  'yakaldığını', 'yakaldım', 'yakaldı',
  'talandım', 'telendim', 'talandı', 'telendi', 'landım', 'lendim',
  'kuttuğunu', 'küttüğünü', 'tuğunu', 'tüğünü', 'duğunu', 'düğünü',
  'dıklarım', 'diklerim', 'duklarım', 'düklerim', 'tıklarım', 'tiklerim',
  // 4-5 harfli ekler
  'tıkça', 'tikçe', 'tukça', 'tükçe',
  'dıkça', 'dikçe', 'dukça', 'dükçe',
  'yarak', 'yerek', 'arak', 'erek', 'narak', 'nerek',
  'yınca', 'yince', 'yunca', 'yünce', 'ınca', 'ince', 'unca', 'ünce',
  'madan', 'meden', 'yken', 'rken', 'larken', 'lerken', 'arken', 'erken', 'ırken', 'irken', 'urken', 'ürken',
  'maktan', 'mekten', 'makta', 'mekte',
  'mışlar', 'mişler', 'muşlar', 'müşler',
  'mıştır', 'miştir', 'muştur', 'müştür',
  'mıştım', 'miştim', 'muştum', 'müştüm',
  'mıştın', 'miştin', 'muştun', 'müştün',
  'mıştık', 'miştik', 'muştuk', 'müştük',
  'mıştı', 'mişti', 'muştu', 'müştü',
  'acaktır', 'ecektir', 'acaktı', 'ecekti', 'acaktım', 'ecektim', 'acağım', 'eceğim',
  'larımızı', 'lerimizi', 'larımız', 'lerimiz', 'larında', 'lerinde', 'larından', 'lerinden',
  'larına', 'lerine', 'larını', 'lerini', 'larının', 'lerinin',
  'ımızın', 'imizin', 'umuzun', 'ümüzün',
  'ımızda', 'imizde', 'umuzda', 'ümüzde',
  'ımızdan', 'imizden', 'umuzdan', 'ümüzden',
  'ımıza', 'imize', 'umuza', 'ümüze',
  'ımızı', 'imizi', 'umuzu', 'ümüzü',
  'saydı', 'seydi', 'taydı', 'teydi', 'daydı', 'deydi',
  'ndaki', 'ndeki', 'ındaki', 'indeki', 'undaki', 'ündeki', 'daki', 'deki', 'taki', 'teki',
  'sıyla', 'siyle', 'suyla', 'süyle', 'ıyla', 'iyle', 'uyla', 'üyle',
  'ıyorsun', 'iyorsun', 'uyorsun', 'üyorsun',
  'ıyorum', 'iyorum', 'uyorum', 'üyorum', 'riyorum', 'rıyorum', 'ruyorum', 'rüyorum',
  'ıyoruz', 'iyoruz', 'uyoruz', 'üyoruz',
  'ıyordu', 'iyordu', 'uyordu', 'üyordu', 'iyormuş', 'ıyormuş', 'uyormuş', 'üyormuş',
  'ıyordum', 'iyordum', 'uyordum', 'üyordum',
  'ebilsin', 'abilsin', 'ebilir', 'abilir', 'ebildi', 'abildi',
  'ayamaz', 'eyemez', 'yamaz', 'yemez', 'amaz', 'emez', 'amadı', 'emedi', 'amadım', 'emedim',
  'laşma', 'leşme', 'laştı', 'leşti', 'landı', 'lendi', 'lanmış', 'lenmiş', 'lanmıştı', 'lenmişti',
  'lanmamı', 'lenmemi', 'lamaya', 'lemeye', 'lanıp', 'lenip',
  'yişinden', 'yışından', 'yuşundan', 'yüşünden', 'işinden', 'ışından', 'uşundan', 'üşünden',
  'lığında', 'liğinde', 'luğunda', 'lüğünde', 'lığından', 'liğinden',
  'lisin', 'lısın', 'lusun', 'lüsün',
  'dığı', 'diği', 'duğu', 'düğü', 'tığı', 'tiği', 'tuğu', 'tüğü',
  'masını', 'mesini', 'mayın', 'meyin', 'mazsa', 'mezse', 'mazsam', 'mezsem',
  'ruldum', 'rüldüm', 'uldum', 'üldüm', 'ıldım', 'ildim',
  'pardım', 'perdim', 'ardım', 'erdim', 'ırdım', 'irdim', 'urdum', 'ürdüm',
  // 3 harfli ekler
  'dan', 'den', 'tan', 'ten', 'nda', 'nde', 'ndan', 'nden',
  'lar', 'ler', 'nın', 'nin', 'nun', 'nün',
  'mız', 'miz', 'muz', 'müz', 'nız', 'niz', 'nuz', 'nüz',
  'lık', 'lik', 'luk', 'lük', 'lığ', 'liğ', 'luğ', 'lüğ',
  'sız', 'siz', 'suz', 'süz',
  'mak', 'mek', 'mamı', 'memi', 'manı', 'meni', 'maya', 'meye',
  'mış', 'miş', 'muş', 'müş',
  'yor', 'ıyor', 'iyor', 'uyor', 'üyor',
  'aca', 'ece', 'acak', 'ecek',
  'dım', 'dim', 'dum', 'düm', 'tım', 'tim', 'tum', 'tüm',
  'dık', 'dik', 'duk', 'dük', 'tık', 'tik', 'tuk', 'tük',
  'dın', 'din', 'dun', 'dün', 'tın', 'tin', 'tun', 'tün',
  'dır', 'dir', 'dur', 'dür', 'tır', 'tir', 'tur', 'tür',
  'ydı', 'ydi', 'ydu', 'ydü', 'ydım', 'ydim', 'ydum', 'ydüm',
  'yla', 'yle', 'sin', 'sın', 'sun', 'sün',
  'ken', 'yıp', 'yip', 'yup', 'yüp', 'nıp', 'nip',
  'sal', 'sel',
  'ıcı', 'ici', 'ucu', 'ücü',
  'yış', 'yiş', 'yuş', 'yüş',
  // 2 harfli ekler
  'da', 'de', 'ta', 'te',
  'na', 'ne', 'ya', 'ye', 'yı', 'yi', 'yu', 'yü', 'nı', 'ni', 'nu', 'nü',
  'ın', 'in', 'un', 'ün',
  'ım', 'im', 'um', 'üm',
  'sı', 'si', 'su', 'sü',
  'ma', 'me', 'dı', 'di', 'du', 'dü', 'tı', 'ti', 'tu', 'tü',
  'sa', 'se', 'ca', 'ce', 'ça', 'çe',
  'la', 'le', 'ar', 'er', 'ır', 'ir', 'ur', 'ür',
  'ıp', 'ip', 'up', 'üp',
  'an', 'en', 'al', 'el', 'ul', 'ül',
  'ış', 'iş', 'uş', 'üş', 'il', 'in',
  'lı', 'li', 'lu', 'lü',
  // 1 harfli ekler
  'a', 'e', 'ı', 'i', 'u', 'ü',
]

// Tek başına yeni kelime başlatamayan çekim/yapım eki kalıpları
export const BOUND_CONTINUATION_REGEX =
  /^(lar[ıi]?([mn][ıi]z[aeıi]?|n[ıi]n|nd[ae]n?|n[aeıi]|m[ae]|l[ae]|y[ae]|d[ae]n?|ki)?|ler[i]?([mn]iz[ei]?|nin|nd[ae]n?|n[aei]|m[ae]|l[ae]|y[ae]|d[ae]n?|ki)?|l[ıiuü](ğ[ıiuü][mn]?[ıiuü]?z?[aeıiuü]?|ğ[ıiuü]nd[ae]n?|k|kl[ae]r[ıi]?|yd[ıiuü]|ym[ıiuü]ş|s[ıiuü]n)?|s[ıiuü]z(l[ıiuü]k|l[ae]r[ıi]?|d[ıiuü]r)?|s[ıiuü](n[ıiuü]n|nd[ae]n?|n[ae]|n[ıiuü]|yd[ıiuü]|ym[ıiuü]ş|yl[ae])|[mnv]?[ıiuü]ş(t[ıiuü][mnk]?|l[ae]r(d[ıiuü])?|t[ıiuü]r|s[ae]|ç[ae]s[ıi]n[ae])?|[dt][ıiuü](ğ[ıiuü][mn]?[ıiuü]?z?[aeıiuü]?|ğ[ıiuü]nd[ae]n?|k(l[ae]r[ıi]?|ç[ae])?|m|n[ıiuü]z?|l[ae]r|r|ys[ae])|y?acak(t[ıi][mnk]?|l[ae]r[ıi]?|s[ıi]n|t[ıi]r)?|y?ecek(t[i][mnk]?|l[ae]r[i]?|sin|tir)?|cekler|caklar|y?acağ[ıi][mnz]*|y?eceğ[i][mnz]*|[ıiuü]?yor(du[mnk]?|lar(d[ıi])?|mu[şs][tu]?|um|sun(uz)?|uz)?|m[ae](k|kten|kta|ktan|y[aeıi]|y[ıi]n[ıi]z?|y[ıi]p|d[ae]n|l[ıi](yd[ıi][mnk]?)?|m[ıi]ş(t[ıi][mn]?)?|d[ıi][mnk]?|z(s[ae][mn]?|d[ıi][mn]?|l[ae]r)?|yacak|yecek|[mn][ıi])|m[ıiuü]yor(um|sun|du[mnk]?|lar(d[ıi])?|uz)?|y?abil(ir(di|im|sin|ler)?|di[mnk]?|iyor(du)?|ecek|mek|se[mn]?|sin)|y?ebil(ir(di|im|sin|ler)?|di[mnk]?|iyor(du)?|ecek|mek|se[mn]?|sin)|y?ama(d[ıi][mnk]?|z(d[ıi]|s[ıi]n|l[ae]r)?|yacak)|y?eme(d[i][mnk]?|z(di|sin|ler)?|yecek)|nd[ae](n|ki(ler)?|yd[ıi]|ym[ıi]ş)?|[ıiuü]nd[ae](n|ki(ler)?|yd[ıi])?|[ıiuü]n[aeıiuü]|z[ıiuü]n|m[ıiuü]n|[dt][ae]n|d[ae]ki(ler)?|t[ae]ki(ler)?|y?l[ae](r[ıi]?)?|y?d[ıiuü][mnk]?|y?m[ıiuü]ş(t[ıiuü][mn]?)?|y?s[ae][mnk]?|r[ıiuü](n[ıiuü]n|nd[ae]n?|n[ae]|n[ıiuü]|m[ıiuü]z?[aeıiuü]?|yl[ae])|l[ae]n(d[ıi][mnk]?|m[ıi]ş(t[ıi])?|iyor(du)?|mek|mak|mam[ıi]|mem[i]|m[ae]y[ae]|ıp|ip|arak|erek)|l[ae]ş(t[ıi][mnk]?|m[ıi]ş(t[ıi])?|iyor(du)?|mek|mak)|y?[ıiuü]p|y?[ae]r[ae]k|r[ae]k|y?[ıiuü]nc[ae]|d[ıiuü]kç[ae]|t[ıiuü]kç[ae]|c[ae]s[ıi]n[ae]|ç[ae]s[ıi]n[ae]|c[ıiuü]ğ[ıiuü][mn]?|ç[ıiuü]ğ[ıiuü][mn]?)$/i

export const NEVER_BOUND_SUFFIX_RIGHT = new Set([
  'siz', 'sen', 'ben', 'biz', 'tur', 'düğünü', 'düğün', 'düğüne',
  'bir', 'bu', 'şu', 've', 'de', 'da', 'ki', 'ne', 'ile', 'için', 'gibi', 'kadar',
])

const COMMON_2CHAR_WORDS = new Set([
  've', 'de', 'da', 'bu', 'şu', 'ne', 'en', 'az', 'el', 'ev', 'et', 'iş', 'iç',
  'su', 'on', 'üç', 'ay', 'at', 'ot', 'ok', 'un', 'ya', 'ki', 'mi', 'mı', 'mu', 'mü',
])

const EXPLICIT_GLUED_MAP: Record<string, [string, string]> = {
  birgün: ['bir', 'gün'],
  birişim: ['bir', 'işim'],
  birşey: ['bir', 'şey'],
  herşey: ['her', 'şey'],
  çokşey: ['çok', 'şey'],
  hiçbirşey: ['hiçbir', 'şey'],
  lafeder: ['laf', 'eder'],
  edergibi: ['eder', 'gibi'],
  edenyaşlı: ['eden', 'yaşlı'],
  kuyudansu: ['kuyudan', 'su'],
  elyavaşça: ['el', 'yavaşça'],
  kovasu: ['kova', 'su'],
  onyaş: ['on', 'yaş'],
  milliyetçininne: ['milliyetçinin', 'ne'],
  buradadur: ['burada', 'dur'],
  butür: ['bu', 'tür'],
  birtür: ['bir', 'tür'],
  şeyyemez: ['şey', 'yemez'],
  öylecedikildim: ['öylece', 'dikildim'],
  ayakkabıdikebildiğim: ['ayakkabı', 'dikebildiğim'],
  doğrusiirdü: ['doğru', 'sürdü'],
  doğrusürdü: ['doğru', 'sürdü'],
}

const GERUND_REGEX =
  /(y?ıp|y?ip|y?up|y?üp|y?arak|y?erek|y?ınca|y?ince|y?unca|y?ünce|madan|meden|y?ken|ken|dığında|diğinde|duğunda|düğünde|tığında|tiğinde|tuğunda|tüğünde|dığımızda|diğimizde|duğumuzda|düğümüzde|tığımızda|tiğimizde|dıkça|dikçe|dukça|dükçe|tıkça|tikçe|tukça|tükçe)$/i
const SUFFIX_ENDING_REGEX =
  /(dık|dik|duk|dük|tık|tik|tuk|tük|mış|miş|muş|müş|mıştı|mişti|muştu|müştü|mıştır|miştir|muştur|müştür|dır|dir|dur|dür|tır|tir|tur|tür|nın|nin|nun|nün|ın|in|un|ün|dan|den|tan|ten|da|de|ta|te|na|ne|ya|ye|a|e|yı|yi|yu|yü|ı|i|u|ü|la|le|yla|yle|an|en|ar|er|ır|ir|ur|ür)$/i

/**
 * Türkçe ünsüz yumuşamasını (ünsüz değişimi) tersine çevirerek olası kök varyantlarını üretir:
 * sonu 'ğ' ise 'k' yap ('uygarlığ' -> 'uygarlık')
 * sonu 'b' ise 'p' yap ('kitab' -> 'kitap')
 * sonu 'c' ise 'ç' yap ('ağac' -> 'ağaç')
 * sonu 'd' ise 't' yap ('kanad' -> 'kanat')
 */
export function getSofteningVariants(stem: string): string[] {
  const variants = [stem]
  if (stem.endsWith('ğ')) {
    variants.push(stem.slice(0, -1) + 'k')
  } else if (stem.endsWith('b')) {
    variants.push(stem.slice(0, -1) + 'p')
  } else if (stem.endsWith('c')) {
    variants.push(stem.slice(0, -1) + 'ç')
  } else if (stem.endsWith('d')) {
    variants.push(stem.slice(0, -1) + 't')
  }
  return variants
}

/**
 * Bir kök adayının (yalnızca ünlüyle başlayan bir ek soyulduysa ünsüz yumuşaması varyantları ile birlikte)
 * sözlükte olup olmadığını denetler.
 */
export function checkStemInDict(stem: string, allowSoftening: boolean = true): boolean {
  if (stem.length < 2) return false
  if (turkishDictSet.has(stem)) return true
  const noCirc = stem.replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
  if (noCirc !== stem && turkishDictSet.has(noCirc)) return true
  if (allowSoftening && stem.length >= 3) {
    const variants = getSofteningVariants(stem)
    for (let i = 1; i < variants.length; i++) {
      if (turkishDictSet.has(variants[i])) {
        return true
      }
      const vNoCirc = variants[i].replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
      if (vNoCirc !== variants[i] && turkishDictSet.has(vNoCirc)) {
        return true
      }
    }
  }
  return false
}

/**
 * 2. ADIM: Türkçe Kök Doğrulayıcı (isValidTurkishWord)
 * a) Kelime doğrudan turkishDictSet içinde varsa true döner (ek almamış kelimede ünsüz yumuşaması aranmaz).
 * b) Tezlik fiili -(y)iver- kalıbını kontrol eder.
 * c) Sonundaki çekim/yapım eklerini 3 kademeye kadar soyarak kalan kökü sözlükte arar.
 */
export function isValidTurkishWord(word: string): boolean {
  if (!word) return false
  const w = toTurkishLower(word.trim())
  if (!w) return false

  if (w.includes("'") || w.includes('’')) {
    const base = w.split(/['’]/)[0]
    return base.length >= 2
  }

  if (w.length === 1) {
    return w === 'o'
  }

  // a) Doğrudan sözlükte var mı?
  if (turkishDictSet.has(w)) return true

  // b) Tezlik fiili -(y)iver- (örn: silkeleyivermişim, bakıverdi)
  const iverMatch = w.match(
    /^([a-zçğıöşü]{3,}?)(?:y?[ıiuü])?ver(mek|di|dim|din|dik|diler|miş|mişim|mişsin|mişti|miştim|ir|iyor|ecek|sin|in)?$/,
  )
  if (iverMatch) {
    const base = iverMatch[1]
    if (
      checkStemInDict(base, true) ||
      checkStemInDict(base + 'a', false) ||
      checkStemInDict(base + 'e', false)
    ) {
      return true
    }
  }

  // c) Çekim/yapım eklerini kademeli olarak soy (Stemming)
  for (const s1 of TURKISH_SUFFIXES) {
    if (w.endsWith(s1) && w.length - s1.length >= 2) {
      const stem1 = w.slice(0, w.length - s1.length)
      const startsVowel1 = ALL_VOWELS.has(s1[0])
      if (checkStemInDict(stem1, startsVowel1)) return true

      // Ünlü daralması (anl-ıyor -> anla, bekl-iyor -> bekle)
      if (/^(ıyor|iyor|uyor|üyor|yacak|yecek|yıp|yip)/.test(s1)) {
        if (checkStemInDict(stem1 + 'a', false) || checkStemInDict(stem1 + 'e', false)) {
          return true
        }
      }

      // 2. kademe ek soyma
      for (const s2 of TURKISH_SUFFIXES) {
        if (stem1.endsWith(s2) && stem1.length - s2.length >= 2) {
          const stem2 = stem1.slice(0, stem1.length - s2.length)
          const startsVowel2 = ALL_VOWELS.has(s2[0])
          if (checkStemInDict(stem2, startsVowel2)) return true

          // 3. kademe ek soyma
          for (const s3 of TURKISH_SUFFIXES) {
            if (stem2.endsWith(s3) && stem2.length - s3.length >= 2) {
              const stem3 = stem2.slice(0, stem2.length - s3.length)
              const startsVowel3 = ALL_VOWELS.has(s3[0])
              if (checkStemInDict(stem3, startsVowel3)) return true
            }
          }
        }
      }
    }
  }

  return false
}

/**
 * 3. ADIM: Sözlük Tabanlı Yapışık Kelime Bölücü (splitWithDictionary)
 * - Önce bilinen yapışık kelime kalıplarını ("birgün" -> "bir gün", "birişim" -> "bir işim", "kovasu" -> "kova su" vb.) ayırır.
 * - Kelime tek başına geçerliyse (isValidTurkishWord === true) ASLA bölünmez!
 * - Geçerli değilse ve sağ parça tek başına kelime olamayacak bir çekim eki değilse en uygun noktadan ikiye böler.
 */
export function splitWithDictionary(word: string): string[] {
  if (!word || word.length < 5) return [word]

  const leadMatch = word.match(/^[^\wçğıöşüÇĞİÖŞÜ0-9]+/)
  const leadPunct = leadMatch ? leadMatch[0] : ''
  const trailMatch = word.match(/[^\wçğıöşüÇĞİÖŞÜ0-9]+$/)
  const trailPunct = trailMatch ? trailMatch[0] : ''

  const rawCore = word.slice(leadPunct.length, word.length - trailPunct.length)
  const core = rawCore.normalize('NFC').replace(/\u0307/g, '')
  if (core.length < 5) return [word]
  if (/[\d\-'’]/.test(core)) return [word]

  const lowerCore = toTurkishLower(core)

  // 1. Bilinen sık yapışık kelime çiftleri
  const explicitPair = EXPLICIT_GLUED_MAP[lowerCore]
  if (explicitPair) {
    let [p1, p2] = explicitPair
    if (core[0] === core[0].toUpperCase() && core[0] !== core[0].toLowerCase()) {
      p1 = p1[0].toUpperCase() + p1.slice(1)
    }
    return [`${leadPunct}${p1}`, `${p2}${trailPunct}`]
  }

  // 2. Kelime zaten tek başına geçerli bir Türkçe kelimeyse ASLA BÖLME!
  if (isValidTurkishWord(lowerCore)) {
    return [word]
  }

  if (core.length < 6) return [word]

  // 3. Olası bölünme noktalarını (i = 2 ... lowerCore.length - 2) puanla
  const candidateMatches: Array<{
    splitIdx: number
    left: string
    right: string
    score: number
  }> = []

  for (let i = 2; i <= lowerCore.length - 2; i++) {
    const leftPart = lowerCore.slice(0, i)
    const rightPart = lowerCore.slice(i)

    if (rightPart.startsWith('ğ')) continue
    if (leftPart.length === 2 && !COMMON_2CHAR_WORDS.has(leftPart)) continue
    if (rightPart.length === 2 && !COMMON_2CHAR_WORDS.has(rightPart)) continue

    // Sağ parça bir çekim/yapım eki devamı ise ASLA bölme ("sınıfta" + "ydı", "Tırnağı" + "yla" vb. engellenir)
    if (!NEVER_BOUND_SUFFIX_RIGHT.has(rightPart) && BOUND_CONTINUATION_REGEX.test(rightPart)) {
      continue
    }

    if (isValidTurkishWord(leftPart) && isValidTurkishWord(rightPart)) {
      let score = 0

      if (GERUND_REGEX.test(leftPart)) {
        score += 500
      } else if (SUFFIX_ENDING_REGEX.test(leftPart)) {
        score += 100
      }
      if (turkishDictSet.has(leftPart)) score += 50
      if (turkishDictSet.has(rightPart)) score += 50
      score += Math.min(leftPart.length, rightPart.length) * 10

      candidateMatches.push({
        splitIdx: i,
        left: core.slice(0, i),
        right: core.slice(i),
        score,
      })
    }
  }

  if (candidateMatches.length > 0) {
    candidateMatches.sort((a, b) => b.score - a.score)
    const best = candidateMatches[0]

    const restSplit = splitWithDictionary(best.right)
    return [
      `${leadPunct}${best.left}`,
      ...restSplit.slice(0, -1),
      `${restSplit[restSplit.length - 1]}${trailPunct}`,
    ]
  }

  return [word]
}

/**
 * Tek bir token'ı yapışık kelime süzgecinden geçirir (Sözlük + Stemmer)
 */
export function splitGluedTurkishWord(token: string): string[] {
  return splitWithDictionary(token)
}

/**
 * Token dizisini (kelimeler dizisi) yapışık kelime süzgecinden geçirir
 */
export function splitGluedTokens(tokens: string[]): string[] {
  if (!tokens || !tokens.length) return []
  const result: string[] = []
  for (const token of tokens) {
    if (!token) continue
    const parts = splitGluedTurkishWord(token)
    for (const p of parts) {
      if (p) result.push(p)
    }
  }
  return result
}

/**
 * Metin gövdesindeki satırları tokenize edip yapışık kelimeleri ayırarak metni yeniden oluşturur
 */
export function splitGluedText(text: string): string {
  if (!text) return ''
  return text
    .split(/\r?\n/)
    .map((line) => {
      if (!line.trim()) return line
      const isHeading = /^#{1,6}\s+/.test(line)
      const prefix = isHeading ? line.match(/^#{1,6}\s+/)?.[0] || '' : ''
      const content = isHeading ? line.slice(prefix.length) : line
      const tokens = content.split(/\s+/).filter(Boolean)
      const split = splitGluedTokens(tokens)
      return `${prefix}${split.join(' ')}`
    })
    .join('\n')
}
