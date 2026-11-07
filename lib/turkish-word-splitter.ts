/**
 * Türkçe Yapışık Kelime Ayırıcı, Sözlük ve Kök Bulucu (Turkish Stemmer & Word Splitter)
 *
 * Çevrimdışı (offline) 188.000+ kelimelik temizlenmiş Türkçe sözlük (turkish_words.json),
 * kademeli ek soyma (progressive stemming), ünlüyle başlayan eklerde ünsüz yumuşaması onarımı
 * (softening reversal), büyük ünlü uyumu (vowel harmony) ve hece çatısı doğrulaması,
 * tezlik/yeterlilik birleşik fiil analizi ve kural tabanlı yapışık kelime ayırma algoritmaları.
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
  'â', 'î', 'û', 'Â', 'Î', 'Û',
])

export const BACK_VOWELS = new Set(['a', 'ı', 'o', 'u', 'A', 'I', 'O', 'U', 'â', 'û', 'Â', 'Û'])
export const FRONT_VOWELS = new Set(['e', 'i', 'ö', 'ü', 'E', 'İ', 'Ö', 'Ü', 'î', 'Î'])

export const KNOWN_PROPER_NOUNS = new Set([
  'yu', 'hua', 'jiazhen', 'youqing', 'fengxia', 'fugui', 'kugen', 'erxi',
  'chunsheng', 'longer', 'wangxi', 'wangsı', 'liu', 'chen', "long'er",
  'changchun', 'yangtze', 'fuchun', 'xian', 'xu', 'weng',
])

export const KNOWN_EXPLICIT_COMPOUNDS = new Set([
  'balkabağı', 'balkabak', 'afacan', 'karaağaç', 'tahtırevan', 'pisboğaz',
  'karmakarışık', 'başkomutan', 'doğumhane', 'cephane', 'yalınayak',
  'alıkoy', 'kapkalın', 'sükunet', 'sükünet', 'unutulmaz',
])

export const NEVER_MERGE_PAIR_LEFT = new Set([
  'bir', 'bu', 'şu', 'o', 've', 'de', 'da', 'ki', 'ne', 'en', 'çok', 'az', 'her', 'hiç',
  'var', 'yok', 'ben', 'sen', 'biz', 'siz', 'ama', 'fakat', 'ancak', 'için', 'gibi', 'kadar',
  'sonra', 'önce', 'daha', 'yine', 'bile', 'mi', 'mı', 'mu', 'mü', 'ya', 'hem', 'ise', 'ile',
  'fark', 'terk', 'el', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan', 'yüz', 'bin',
  'geri', 'ileri', 'değil', 'fazla', 'oyuncak', 'hiçbir', 'birkaç', 'onu', 'onun', 'ona', 'eder', 'hadi', 'sadaka', 'tek', 'iki', 'içeri',
])

export const NEVER_BOUND_SUFFIX_RIGHT = new Set([
  'siz', 'sen', 'ben', 'biz', 'tur', 'mi', 'mı', 'mu', 'mü', 'misin', 'mısın', 'musun', 'müsün',
  'düğünü', 'düğün', 'düğüne', 'bir', 'bu', 'şu', 've', 'de', 'da', 'ki', 'ne', 'ile', 'için', 'gibi', 'kadar',
])

export const TURKISH_QUESTION_PARTICLES = new Set([
  'mi', 'mı', 'mu', 'mü',
  'misin', 'mısın', 'musun', 'müsün',
  'miyiz', 'mıyız', 'muyuz', 'müyüz',
  'misiniz', 'mısınız', 'musunuz', 'müsünüz',
  'miydi', 'mıydı', 'muydu', 'müydü',
  'miymiş', 'mıymiş', 'muymuş', 'müymüş',
  'miysek', 'mıysek', 'muysek', 'müysek',
])

export const SINGLE_SUFFIXES: string[] = [
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
  'sal', 'sel', 'ıcı', 'ici', 'ucu', 'ücü',
  'yış', 'yiş', 'yuş', 'yüş',
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
  'a', 'e', 'ı', 'i', 'u', 'ü',
  'm', 'n', 'r', 'z', 'k',
].sort((a, b) => b.length - a.length)

export const TURKISH_SUFFIXES = SINGLE_SUFFIXES

// Tek başına yeni kelime başlatamayan çekim/yapım eki kalıpları
export const BOUND_CONTINUATION_REGEX =
  /^(lar[ıi]?([mn][ıi]z[aeıi]?|n[ıi]n|nd[ae]n?|n[aeıi]|m[ae]|l[ae]|y[ae]|d[ae]n?|ki)?|ler[i]?([mn]iz[ei]?|nin|nd[ae]n?|n[aei]|m[ae]|l[ae]|y[ae]|d[ae]n?|ki)?|l[ıiuü](ğ[ıiuü][mn]?[ıiuü]?z?[aeıiuü]?|ğ[ıiuü]nd[ae]n?|k|kl[ae]r[ıi]?|yd[ıiuü]|ym[ıiuü]ş|s[ıiuü]n|y[ıiuü]m|d[ıiuü]r)?|s[ıiuü]z(l[ıiuü]k|l[ae]r[ıi]?|d[ıiuü]r)?|s[ıiuü](n[ıiuü]n|nd[ae]n?|n[ae]|n[ıiuü]|yd[ıiuü]|ym[ıiuü]ş|yl[ae])|[mnv]?[ıiuü]ş(t[ıiuü][mnk]?|l[ae]r(d[ıiuü])?|t[ıiuü]r|s[ae]|ç[ae]s[ıi]n[ae])?|[dt][ıiuü](ğ[ıiuü][mn]?[ıiuü]?z?[aeıiuü]?|ğ[ıiuü]nd[ae]n?|k(l[ae]r[ıi]?|ç[ae])?|m|n[ıiuü]z?|l[ae]r|r|ys[ae])|y?acak(t[ıi][mnk]?|l[ae]r[ıi]?|s[ıi]n|t[ıi]r)?|y?ecek(t[i][mnk]?|l[ae]r[i]?|sin|tir)?|cekler|caklar|ceğime|cağıma|ceğini|cağını|ceğimizi|cağımızı|y?acağ[ıi][mnz]*|y?eceğ[i][mnz]*|[ıiuü]?yor(du[mnk]?|lar(d[ıi])?|mu[şs](çasına|[tu])?|um|sun(uz)?|uz)?|m[ae](k|kten|kta|ktan|kle|y[aeıi]|y[ıi]n[ıi]z?|y[ıi]p|d[ae]n|l[ıi](yd[ıi][mnk]?|y[ıi]m|dir|s[ıi]n)?|m[ıi]ş(t[ıi][mn]?)?|d[ıi][mnk]?|z(s[ae][mn]?|d[ıi][mn]?|l[ae]r)?|yacak|yecek|[mn]([ıi]n)?)|m[ıiuü]yor(um|sun|du[mnk]?|lar(d[ıi])?|uz)?|y?abil(ir(di[k]?|im|iz|sin|sek|ler)?|di[mnk]?|iyor(du|muş)?|ecek(ti)?|mek|miş(tim)?|se[mn]?|sin)|y?ebil(ir(di[k]?|im|iz|sin|sek|ler)?|di[mnk]?|iyor(du|muş)?|ecek(ti)?|mek|miş(tim)?|se[mn]?|sin)|y?ama(d[ıi][mnk]?|z(d[ıi]|s[ıi]n|l[ae]r)?|yacak|yız|m|yışıma)|y?eme(d[i][mnk]?|z(di|sin|ler)?|yecek|yiz|m|sinler)|nd[ae](n|ki(ler)?|yd[ıi][k]?|ym[ıi]ş)?|[ıiuü]nd[ae](n|ki(ler)?|yd[ıi])?|[ıiuü]n[aeıiuü]|z[ıiuü]n|m[ıiuü]n|[dt][ae](n|ki(ler)?|yd[ıi][km]?|ym[ıi]ş|ys[ae])|y?l[ae](r[ıi]?)?|y?d[ıiuü][mnk]?|y?m[ıiuü]ş(t[ıiuü][mn]?)?|y?s[ae](yd[ıi][mnk]?|[mnk])?|r[ıiuü](n[ıiuü]n|nd[ae]n?|n[ae]|n[ıiuü]|m[ıiuü]z?[aeıiuü]?|yl[ae]|z)|l[ae]n(d[ıi][mnk]?|d[ıi]kç[ae]|d[ıi]rd[ıi]|m[ıi]ş(t[ıi])?|m[ıi]yordu|iyor(du)?|mek|mak|mam[ıi]|mem[i]|m[ae]y[ae]|ıp|ip|arak|erek|ır(lardı)?)|l[ae]ş(t[ıi][mnk]?|t[ıi]ğ[ıi]nd[ae]|m[ıi]ş(t[ıi])?|iyor(du)?|maktan|mekten|mek|mak|ır(dı|lar)?|ayım|ince)|y?[ıiuü]p|y?[ae]r[ae]k|r[ae]k|y?[ıiuü]nc[ae](y[ae])?|d[ıiuü]kç[ae]|t[ıiuü]kç[ae]|c[ae]s[ıi]n[ae]|ç[ae]s[ıi]n[ae]|c[ıiuü]ğ[ıiuü][mn]?|ç[ıiuü]ğ[ıiuü][mn]?|y[ae]n|y[ıiuü]m|[ıiuü]y[ıiuü]m|y[ae]l[ıi]m|[aeıi]rs[ae][kn]|c[ıi]lar(la)?|n[ıiuü])$/i

const COMMON_2CHAR_WORDS = new Set([
  've', 'de', 'da', 'bu', 'şu', 'ne', 'en', 'az', 'el', 'ev', 'et', 'iş', 'iç',
  'su', 'on', 'üç', 'ay', 'at', 'ot', 'ok', 'un', 'ya', 'ki',
])

const VALID_APOS_CASE_PREFIXES = [
  'nın', 'nin', 'nun', 'nün',
  'ndan', 'nden', 'dan', 'den', 'tan', 'ten',
  'nda', 'nde', 'da', 'de', 'ta', 'te',
  'yla', 'yle', 'la', 'le',
  'ın', 'in', 'un', 'ün',
  'yı', 'yi', 'yu', 'yü',
  'ya', 'ye', 'na', 'ne',
  'ı', 'i', 'u', 'ü', 'a', 'e',
]

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
  onyuan: ['on', 'yuan'],
  milliyetçininne: ['milliyetçinin', 'ne'],
  buradadur: ['burada', 'dur'],
  butür: ['bu', 'tür'],
  birtür: ['bir', 'tür'],
  şeyyemez: ['şey', 'yemez'],
  öylecedikildim: ['öylece', 'dikildim'],
  ayakkabıdikebildiğim: ['ayakkabı', 'dikebildiğim'],
  doğrusiirdü: ['doğru', 'sürdü'],
  doğrusürdü: ['doğru', 'sürdü'],
  noktayageldiğinde: ['noktaya', 'geldiğinde'],
  kazandığımtüm: ['kazandığım', 'tüm'],
  adamlarata: ['adamlara', 'ta'],
  içiısınsın: ['içi', 'ısınsın'],
  dediki: ['dedi', 'ki'],
  budınum: ['bu', 'durum'],
  budınumun: ['bu', 'durumun'],
}

const GERUND_REGEX =
  /(y?ıp|y?ip|y?up|y?üp|y?arak|y?erek|y?ınca|y?ince|y?unca|y?ünce|madan|meden|y?ken|ken|dığında|diğinde|duğunda|düğünde|tığında|tiğinde|tuğunda|tüğünde|dığımızda|diğimizde|duğumuzda|düğümüzde|tığımızda|tiğimizde|dıkça|dikçe|dukça|dükçe|tıkça|tikçe|tukça|tükçe)$/i
const SUFFIX_ENDING_REGEX =
  /(dık|dik|duk|dük|tık|tik|tuk|tük|mış|miş|muş|müş|mıştı|mişti|muştu|müştü|mıştır|miştir|muştur|müştür|dır|dir|dur|dür|tır|tir|tur|tür|nın|nin|nun|nün|ın|in|un|ün|dan|den|tan|ten|da|de|ta|te|na|ne|ya|ye|a|e|yı|yi|yu|yü|ı|i|u|ü|la|le|yla|yle|an|en|ar|er|ır|ir|ur|ür)$/i

/**
 * Türkçe ek kuyruğunun (tail) geçerli morfolojik eklerden oluşup oluşmadığını doğrular.
 * Fonotaktik kural: Yalnız 'm' ve 'n' ekleri yalnızca önceki karakter ünlü (vowel) ise geçerlidir (baba-m, popo-n; çalış-m geçersiz).
 * Yalnız 'r', 'z', 'k' ekleri yalnızca zincir içi (depth > 0) ve önceki karakter ünlü ise geçerlidir.
 */
export function canParseTail(tail: string, prevChar: string = '', depth: number = 0): boolean {
  if (!tail) return true
  if (tail === 'm' || tail === 'n') {
    return ALL_VOWELS.has(prevChar)
  }
  if (tail === 'r' || tail === 'z' || tail === 'k') {
    return depth > 0 && ALL_VOWELS.has(prevChar)
  }
  if (depth >= 5) return false

  for (const suf of SINGLE_SUFFIXES) {
    if (tail.startsWith(suf)) {
      if (suf.length === 1 && 'mnrzk'.includes(suf)) {
        if (!ALL_VOWELS.has(prevChar) || tail.length > 1) {
          continue
        }
      }
      if (canParseTail(tail.slice(suf.length), suf[suf.length - 1], depth + 1)) {
        return true
      }
    }
  }
  return false
}

/**
 * Türkçe büyük ünlü uyumunu (vowel harmony) ve ünlü çatışmasını (vowel collision) denetler.
 */
export function tailHarmonyOk(stem: string, tail: string): boolean {
  if (!tail) return true
  if (stem && ALL_VOWELS.has(stem[stem.length - 1]) && ALL_VOWELS.has(tail[0])) {
    return false
  }
  if (/[aeıioöuü]{2}/.test(tail)) {
    return false
  }
  let t = tail
  for (const neutral of ['yor', 'ken', 'ki']) {
    const pos = t.indexOf(neutral)
    if (pos >= 0) {
      t = t.slice(0, pos)
    }
  }
  for (const able of ['abil', 'ebil']) {
    const pos = t.indexOf(able)
    if (pos >= 0) {
      t = t.slice(0, pos + 1)
    }
  }
  const tv: string[] = []
  for (const c of t) {
    if (ALL_VOWELS.has(c)) tv.push(c)
  }
  if (!tv.length) return true

  const tvBack = BACK_VOWELS.has(tv[0])
  for (let i = 1; i < tv.length; i++) {
    if (BACK_VOWELS.has(tv[i]) !== tvBack) return false
  }

  const sv: string[] = []
  for (const c of stem) {
    if (ALL_VOWELS.has(c)) sv.push(c)
  }
  if (sv.length > 0) {
    const lastStemV = sv[sv.length - 1]
    const allStemSame = sv.every((c) => BACK_VOWELS.has(c) === BACK_VOWELS.has(lastStemV))
    if (allStemSame) {
      return tvBack === BACK_VOWELS.has(lastStemV)
    }
  }
  return true
}

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
 * Bir kök adayının sözlükte olup olmadığını denetler.
 */
export function checkStemInDict(stem: string, allowSoftening: boolean = true): boolean {
  if (stem.length < 2) return false
  if (turkishDictSet.has(stem)) return true
  const noCirc = stem.replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
  if (noCirc !== stem && turkishDictSet.has(noCirc)) return true
  if (allowSoftening && stem.length >= 2) {
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
    // Demek / yemek ünlü daralması kökleri (di-yor -> diyor, yi-yor -> yiyor)
    if (stem === 'di' || stem === 'yi') {
      return true
    }
  }
  return false
}

/**
 * 2. ADIM: Türkçe Kök ve Kelime Doğrulayıcı (isValidTurkishWord)
 */
export function isValidTurkishWord(word: string): boolean {
  if (!word) return false
  const w = toTurkishLower(word.trim())
  if (!w) return false

  if (w.includes("'") || w.includes('’')) {
    const parts = w.split(/['’]/)
    if (parts.length !== 2) return false
    const [stemP, sufP] = parts
    return (
      (stemP.length >= 2 || KNOWN_PROPER_NOUNS.has(stemP)) &&
      canParseTail(sufP, stemP[stemP.length - 1] || '')
    )
  }

  if (w.length === 1) {
    return w === 'o' || w === 'a'
  }

  if (KNOWN_PROPER_NOUNS.has(w)) return true

  // Hatalı fonotaktik kalıpların ve OCR bozulmalarının hızlı reddi
  if (/[bcçdfgğhjklmnprsştvz]yor/.test(w)) return false
  if (
    /(ıi|iı|uı|ıu|üı|ıü|oı|ıo|öı|ıö|nıi|iın|uın|ıın|üın|yonı|yunı|yünı|clış|yorgnn|kınk|kınş|yapmk|sonm)/.test(
      w,
    )
  ) {
    return false
  }

  // Doğrudan sözlükte var mı?
  if (checkStemInDict(w, false)) return true

  // Olası kök + ek bölümlerini analiz et
  for (let splitIdx = w.length; splitIdx >= 2; splitIdx--) {
    const stem = w.slice(0, splitIdx)
    const tail = w.slice(splitIdx)
    if (
      checkStemInDict(stem, true) &&
      canParseTail(tail, stem[stem.length - 1]) &&
      tailHarmonyOk(stem, tail)
    ) {
      return true
    }
  }

  return false
}

/**
 * OCR harf/glif bozulmalarını ('rn' -> 'm', 'n' -> 'rı', 'ıi' -> 'ü' vb.) sistematik olarak onarır.
 */
export function repairOcrWord(word: string): string {
  const leadMatch = word.match(/^[^\wçğıöşüÇĞİÖŞÜâîûÂÎÛ0-9]+/)
  const lead = leadMatch ? leadMatch[0] : ''
  const trailMatch = word.match(/[^\wçğıöşüÇĞİÖŞÜâîûÂÎÛ0-9]+$/)
  const trail = trailMatch ? trailMatch[0] : ''
  const core = word.slice(lead.length, word.length - trail.length)
  if (!core || /\d/.test(core) || core.includes("'") || core.includes('’') || core.includes('-')) {
    return word
  }
  const lcore = toTurkishLower(core)
  if (isValidTurkishWord(lcore)) {
    return word
  }

  const ocrSubs: Array<[string, string]> = [
    ['nyor', 'rıyor'], ['nyor', 'riyor'], ['nyor', 'ruyor'], ['nyor', 'rüyor'],
    ['nn', 'rm'], ['nn', 'rın'], ['nn', 'rin'], ['nn', 'nm'], ['nn', 'un'],
    ['rn', 'm'], ['rn', 'rın'], ['rn', 'rin'],
    ['nıi', 'mi'], ['nı', 'm'], ['ın', 'm'], ['ıın', 'mı'],
    ['nu', 'mı'], ['ıru', 'mı'], ['ru', 'm'], ['run', 'nm'],
    ['ıi', 'ü'], ['ii', 'ü'], ['ıı', 'u'],
    ['lan', 'ları'], ['nk', 'rık'], ['nş', 'rış'], ['mk', 'rak'],
    ['n', 'rı'], ['n', 'ri'], ['m', 'ra'], ['m', 'rı'],
  ]

  for (const [oldS, newS] of ocrSubs) {
    if (lcore.includes(oldS)) {
      let cand = lcore.replace(oldS, newS)
      if (isValidTurkishWord(cand)) {
        if (core[0] === core[0].toUpperCase() && core[0] !== core[0].toLowerCase()) {
          cand = (cand[0] === 'i' ? 'İ' : cand[0].toUpperCase()) + cand.slice(1)
        }
        return `${lead}${cand}${trail}`
      }
    }
  }
  return word
}

/**
 * 3. ADIM: Sözlük Tabanlı Yapışık Kelime Bölücü (splitWithDictionary)
 */
export function splitWithDictionary(word: string): string[] {
  if (!word || word.length < 5 || word.includes('__FN_')) return [word]

  const leadMatch = word.match(/^[^\wçğıöşüÇĞİÖŞÜâîûÂÎÛ0-9]+/)
  const leadPunct = leadMatch ? leadMatch[0] : ''
  const trailMatch = word.match(/[^\wçğıöşüÇĞİÖŞÜâîûÂÎÛ0-9]+$/)
  const trailPunct = trailMatch ? trailMatch[0] : ''

  const rawCore = word.slice(leadPunct.length, word.length - trailPunct.length)
  const core = rawCore.normalize('NFC').replace(/\u0307/g, '')
  if (core.length < 5 || /\d/.test(core) || core.includes('-')) return [word]

  // Kesme işaretli yapışık kelimeleri ayır (örn: "Youqing'ikorkutmayalım" -> ["Youqing'i", "korkutmayalım"])
  if (core.includes("'") || core.includes('’')) {
    const parts = core.split(/['’]/)
    const aposChar = core.includes("'") ? "'" : '’'
    if (parts.length === 2) {
      const [stemP, afterApos] = parts
      const lAfter = toTurkishLower(afterApos)
      if (!canParseTail(lAfter)) {
        for (const cp of VALID_APOS_CASE_PREFIXES) {
          if (lAfter.startsWith(cp) && lAfter.length - cp.length >= 3) {
            const rem = afterApos.slice(cp.length)
            const remRepaired = repairOcrWord(rem)
            if (isValidTurkishWord(remRepaired)) {
              return [
                `${leadPunct}${stemP}${aposChar}${afterApos.slice(0, cp.length)}`,
                `${remRepaired}${trailPunct}`,
              ]
            }
          }
        }
      }
    }
    return [word]
  }

  const lowerCore = toTurkishLower(core)

  // 1. Bilinen sık yapışık kelime çiftleri
  const explicitPair = EXPLICIT_GLUED_MAP[lowerCore]
  if (explicitPair) {
    let [p1, p2] = explicitPair
    if (core[0] === core[0].toUpperCase() && core[0] !== core[0].toLowerCase()) {
      p1 = (p1[0] === 'i' ? 'İ' : p1[0].toUpperCase()) + p1.slice(1)
    }
    return [`${leadPunct}${p1}`, `${p2}${trailPunct}`]
  }

  // 2. Kelime zaten tek başına geçerli bir Türkçe kelimeyse ASLA BÖLME!
  if (isValidTurkishWord(lowerCore)) {
    return [word]
  }

  // Tezlik birleşik fiillerini bölme (-iver, -ıver, -uver, -üver: örn: kapıvermişti, çıkıverdi)
  if (
    /[a-zçğıöşüâîû][ıiuü]ver(mek|di|dim|din|dik|miş|mişti|miştim|iyor|iyordu|ecek|sin|se|iverse)?$/.test(
      lowerCore,
    )
  ) {
    return [word]
  }

  // 3. Doğrudan iki geçerli Türkçe kelimeye bölünüyor mu dene (OCR tamiratı yapmadan önce)
  const candidateMatches: Array<{
    splitIdx: number
    score: number
  }> = []

  for (let i = 2; i <= lowerCore.length - 2; i++) {
    const leftPart = lowerCore.slice(0, i)
    const rightPart = lowerCore.slice(i)

    if (rightPart.startsWith('ğ')) continue
    if (leftPart.length === 2 && !COMMON_2CHAR_WORDS.has(leftPart)) continue
    if (rightPart.length === 2 && !COMMON_2CHAR_WORDS.has(rightPart)) continue

    if (
      TURKISH_QUESTION_PARTICLES.has(rightPart) ||
      NEVER_MERGE_PAIR_LEFT.has(leftPart) ||
      NEVER_BOUND_SUFFIX_RIGHT.has(rightPart)
    ) {
      continue
    }

    // Sağ parça tek başına ek devamı ise bölme
    if (
      BOUND_CONTINUATION_REGEX.test(rightPart) ||
      canParseTail(rightPart, leftPart[leftPart.length - 1])
    ) {
      continue
    }

    if (isValidTurkishWord(leftPart) && isValidTurkishWord(rightPart)) {
      let score = 0
      if (GERUND_REGEX.test(leftPart)) score += 500
      else if (SUFFIX_ENDING_REGEX.test(leftPart)) score += 100
      if (turkishDictSet.has(leftPart)) score += 50
      if (turkishDictSet.has(rightPart)) score += 50
      score += Math.min(leftPart.length, rightPart.length) * 10

      candidateMatches.push({
        splitIdx: i,
        score,
      })
    }
  }

  if (candidateMatches.length > 0) {
    candidateMatches.sort((a, b) => b.score - a.score)
    const bestIdx = candidateMatches[0].splitIdx
    return [`${leadPunct}${core.slice(0, bestIdx)}`, `${core.slice(bestIdx)}${trailPunct}`]
  }

  // 4. Doğrudan bölünmediyse kelimeyi OCR glif tamirinden geçir
  const repairedFull = repairOcrWord(word)
  const repairedCore = repairedFull.slice(leadPunct.length, repairedFull.length - trailPunct.length)
  const lCoreRep = toTurkishLower(repairedCore)

  if (isValidTurkishWord(lCoreRep)) {
    return [repairedFull]
  }

  if (repairedCore.length >= 6) {
    const repCandidates: Array<{ splitIdx: number; score: number }> = []
    for (let i = 2; i <= lCoreRep.length - 2; i++) {
      const leftPart = lCoreRep.slice(0, i)
      const rightPart = lCoreRep.slice(i)

      if (rightPart.startsWith('ğ')) continue
      if (leftPart.length === 2 && !COMMON_2CHAR_WORDS.has(leftPart)) continue
      if (rightPart.length === 2 && !COMMON_2CHAR_WORDS.has(rightPart)) continue
      if (
        TURKISH_QUESTION_PARTICLES.has(rightPart) ||
        NEVER_MERGE_PAIR_LEFT.has(leftPart) ||
        NEVER_BOUND_SUFFIX_RIGHT.has(rightPart)
      ) {
        continue
      }
      if (
        BOUND_CONTINUATION_REGEX.test(rightPart) ||
        canParseTail(rightPart, leftPart[leftPart.length - 1])
      ) {
        continue
      }
      if (isValidTurkishWord(leftPart) && isValidTurkishWord(rightPart)) {
        let score = 0
        if (GERUND_REGEX.test(leftPart)) score += 500
        else if (SUFFIX_ENDING_REGEX.test(leftPart)) score += 100
        if (turkishDictSet.has(leftPart)) score += 50
        if (turkishDictSet.has(rightPart)) score += 50
        score += Math.min(leftPart.length, rightPart.length) * 10

        repCandidates.push({ splitIdx: i, score })
      }
    }
    if (repCandidates.length > 0) {
      repCandidates.sort((a, b) => b.score - a.score)
      const bestIdx = repCandidates[0].splitIdx
      return [
        `${leadPunct}${repairedCore.slice(0, bestIdx)}`,
        `${repairedCore.slice(bestIdx)}${trailPunct}`,
      ]
    }
  }

  return [repairedFull]
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
