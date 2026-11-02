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
    wordCount: 152,
    estimatedSeconds: 30,
    description: 'İnsan ruhunun derinliklerine ve sessiz bağlılıklara dair unutulmaz bir klasik pasajı.',
    text: `İçimizde konuşan, bizimle beraber yaşayan fakat sesini kimseye duyuramayan ikinci bir insan vardır. Bu insan, hakiki benliğimizdir. Dünyadaki bütün gürültü patırtı içinde sadece onun fısıltısını dinleyebilenler, asıl huzuru ve yalnızlığın asil ağırlığını anlarlar.

Bir insanın diğer bir insanı bütünüyle anlaması belki de imkânsızdır. Fakat anlamaya çalışmanın yarattığı o derin şefkat, hayatın en büyük tesellisidir. İnsanlar birbirlerini ararlar, bulduklarını sanırlar ve sonra yine kendi iç dünyalarının sessiz kıyılarına çekilirler. Birbirini anlamak bir tesadüf değil, ruhun gösterdiği en yüksek sabırdır.

Bana öyle geliyor ki, bir insana bağlanmak, onunla birlikte dünyanın bütün yükünü omuzlamak demektir. Bu bağlılıkta ne riya vardır ne de menfaat; sadece iki ruhun sessizce birbiriyle selamlaşması vardır. Yeryüzünde hiçbir kuvvet, samimi bir kalbin karşılıksız sevgisinden daha güçlü ve daha kalıcı olamaz. İnsan kalbi ancak bir başka kalbe sığındığında kendi eksikliğini tamamlar. Sessizliğin ortasında kurulan bu bağ, zamanın ve mesafelerin ötesine geçer. Birbirine bağlanan iki ruh, fırtınaların ortasında bile sarsılmaz bir sükûnet bulur.`,
  },
  {
    id: 'marcus-aurelius-meditations',
    title: 'Kendime Düşünceler',
    author: 'Marcus Aurelius',
    category: 'Felsefe',
    wordCount: 196,
    estimatedSeconds: 38,
    description: 'Stoacı felsefenin zamana, zihinsel dinginliğe ve şimdiki ana bakışı.',
    text: `Sabah uyandığında kendine şunu söyle: Bugün karşılaşacağım insanlar bencil, nankör, kıskanç, kibirli ve huysuz olabilirler. Fakat onların bu kusurları, iyi ile kötüyü birbirinden ayıramamalarından ileri gelir. Bense iyinin doğasını ve asaletini bilirim; bu sebeple hiçbirinin kötülüğü beni incitemez ve kirletemez. Bizler birbirimizle uyum içinde yaşamak için doğduk; tıpkı iki el, iki ayak ve alt çeneyle üst çene gibi. Birbirine karşı öfke beslemek, doğanın düzenine karşı gelmektir.

Zihnini kendi içinde topla. İnsanların sığınacak yer aramak için dağ başlarına, kırlara veya deniz kıyılarına kaçmalarına hiç gerek yoktur; hiçbir yer bir insanın kendi ruhundan daha sakin ve huzurlu bir barınak olamaz. Ruhuna çekil ve orada şimdiki anın saflığını, dinginliğini yeniden keşfet.

Hayatın kısalığını her an hatırla. Dün geçmişte kaldı, yarın ise henüz gelmedi; öyleyse şu andan başka kaybedecek hiçbir şeyimiz yoktur. Zihnini gereksiz kuruntulardan arındır, önündeki görevi bir bilgeye yakışır ciddiyet, adalet ve sevgiyle yerine getir. Her eylemini sanki hayatının son anıymış gibi eksiksiz, tutkudan arınmış ve dürüstçe tamamla. İçindeki kılavuz sesi dinlediğin sürece dış dünyanın fırtınaları sana dokunamaz; hakiki huzur yalnızca kendi zihnindedir. Ruhunu hırslardan, boş heveslerden ve anlamsız kaygılardan arındırdığında, dünyanın hiçbir karmaşası içsel dinginliğini bozamaz. Kendine dürüst ol, doğaya uyum sağla ve her anın kıymetini bil.`,
  },
  {
    id: 'neuroplasticity-reading',
    title: 'Beyin, Nöroplastisite ve RSVP',
    author: 'Bilişsel Sinirbilim',
    category: 'Bilim',
    wordCount: 294,
    estimatedSeconds: 58,
    description: 'Göz sıçramalarını sıfırlayan foveal odaklanma ve zihnin anlama mekanizması.',
    text: `Geleneksel okuma eyleminde insan beyni, kelimelerin anlamından ziyade göz kaslarının mekanik hareketlerine muazzam bir enerji harcar. Bir satırı tararken gözlerimiz kesintisiz akmaz; sakkad adı verilen istemsiz sıçramalar, fiksasyon duraklamaları ve geriye dönüşler (regresyon) gerçekleştirir. Bu mekanik çaba, okuma sürecine harcanan toplam sürenin yaklaşık yüzde yetmişini sessizce tüketir. Beyin, gözün satır üzerindeki yer arama gayretini beklemek zorunda kalır.

Hızlı Seri Görsel Sunum (RSVP) yöntemi ise bu biyomekanik darboğazı tamamen ortadan kaldırır. Kelimeler retinadaki fovea merkezine doğrudan ve tek bir optimal tanıma noktasında (ORP) yansıtıldığında, beynin görsel korteksi sembolleri anında kavrar. Göz kaslarının sağa sola sıçramasına gerek kalmadığı için göz yorgunluğu sıfırlanır. Aynı zamanda iç seslendirme refleksi hafifler ve kavrama sürati insan düşüncesinin doğal akış hızına yaklaşır.

Nöroplastisite sayesinde insan beyni, kelimeleri harf harf çözümlemek yerine bütüncül kavramsal desenler olarak tanımayı çok kısa sürede öğrenir. Zihinsel odak dağılmaz, dış uyaranların dikkati dağıtma ihtimali asgariye iner. Böylece kişi metinle doğrudan bir anlam bağı kurar; okuma hızı iki ya da üç katına çıkarken anlama derinliği ve odaklanma süresi katlanarak artar. Bilişsel kapasite, satır aramakla değil bilginin özünü kavramakla meşgul olur.

RSVP okuma alışkanlığı geliştikçe, zihin görsel girdileri neredeyse düşünme süratiyle eşzamanlı kavramaya başlar. Beynin frontal lobu aktifleşirken, iç seslendirme refleksi yerini doğrudan anlamsal kodlamaya bırakır. Bu bilişsel dönüşüm, yalnızca hızlı okumayı değil, aynı zamanda bilgiyi hafızada tutma ve sentezleme yeteneğini de kalıcı biçimde güçlendirir. Gözün satır aralarında kaybolmadığı bir zihinsel berraklık, modern insanın bilgi çağındaki en güçlü müttefikidir.

Bilimsel araştırmalar, RSVP yöntemiyle okuma yapan bireylerin metindeki ana fikre ulaşma süresinin belirgin biçimde kısaldığını ve dikkat aralıklarının uzadığını göstermektedir. Bilgi akışını kesintisiz kılan bu ritim, insan zihninin öğrenme potansiyelini en üst seviyeye taşır. Her gün birkaç dakika RSVP egzersizi yapmak, görsel algı hızını ve foveal netliği gözle görülür şekilde artırır. Göz kasları dinlenirken zihin en yüksek bilişsel verimliliğine erişir.`,
  },
  {
    id: 'stefan-zweig-mektup',
    title: 'Bilinmeyen Bir Kadının Mektubu',
    author: 'Stefan Zweig',
    category: 'Edebiyat',
    wordCount: 492,
    estimatedSeconds: 96,
    description: 'Dünya edebiyatının en lirik ve derin sadakat anlatılarından biri (500 kelimelik başyapıt).',
    text: `Sana, beni hiçbir zaman tanımamış olan sana. Masamın üzerine birikmiş bu sayfaları yazarken içimde ne bir sitem ne de geçmişe dair bir pişmanlık var; yalnızca sana olan ve bütün ömrümü dolduran o sessiz bağlılığın son nefesi var.

Çocukluğumun o dar, loş koridorlarında adını ilk duyduğum günden beri hayatım sadece senin varlığınla anlam kazandı. Sen kapıdan her girdiğinde, merdivenlerde ayak seslerini her duyduğumda bütün dünyam aydınlanırdı. Sen bunu hiç bilmedin; yanımdan geçip giderken gözlerin bana değdiğinde bile aslında beni görmüyordun. Beni hiçbir zaman diğer insanlardan ayırt etmedin, sokakta yanından geçen yabancılardan farksızdım senin için. Ama ben senin her gülüşünü, her bakışını, elinin pardösüne uzanışındaki o kendine has zarafeti zihnime bir kutsal emanet gibi kaydettim.

Bütün gençliğim boyunca seni uzaktan seyrettim. Bir gün beni fark edeceğin, gözlerimin içine bakıp kim olduğumu anlayacağın anı bekledim. Fakat hayat senin için hareketli, parlak ve kalabalık bir şölendi; bense o şölenin kapısında sessizce bekleyen gölgeden ibarettim. Sana yaklaşmak, varlığımı sana hatırlatmak istedim ama her defasında senin o kayıtsız nezaketinin ardında kayboldum. Beni bir anlığına hayatına aldığında bile, ertesi sabah adımı hatırlamayacağını biliyordum. Yine de o tek bir an, bütün ömrümün karanlık gecelerine yetecek kadar büyük bir ışıktı benim için.

Şimdi bu satırları yazarken hayatımın son perdesi kapanıyor. Çocukluğum, gençliğim, bütün umutlarım senin haberin olmadan seninle yaşandı ve şimdi senin haberin olmadan seninle birlikte toprağa karışıyor. Sana asla bir suçlama yöneltmiyorum sevgilim; güneş nasıl aydınlattığı çiçeğin ona duyduğu minneti bilmezse, sen de hayatıma kattığın bu büyük yangını bilmek zorunda değildin.

Senden geriye yalnızca zihnimde hiç solmayan o sesin, gülüşün ve gözlerinin sıcaklığı kalıyor. Dünyada hiçbir insan bir başkasını böylesine karşılıksız, böylesine derin ve sessiz bir sadakatle sevmemiştir. Eğer bir gün bu satırlar eline geçerse, bil ki dünyadan bir gölge geçti; ama o gölge bütün varlığıyla yalnızca senin için yaşadı ve seni severek bu dünyadan ayrıldı.

Sana bu mektubu ulaştıran eller soğurken, kalbimdeki sevgi ilk günkü tazeliğiyle atıyor. Hayatımı sana adamış olmaktan tek bir saniye bile pişmanlık duymadım. Eğer yeniden dünyaya gelecek olsaydım, yine senin geçtiğin yollarda bekler, yine senin o kayıtsız tebessümünle aydınlanmak isterdim. İnsanlar mutluluğu uzun yıllarda, zenginliklerde ya da büyük zaferlerde ararlar; bense bütün cennetimi senin bana baktığın o kısacık saniyelere sığdırdım.

Masamda yanan mum tükenmek üzere, odam giderek sessizleşiyor. Dışarıda şehir kendi telaşıyla akıp giderken, ben sana olan ebedi bağlılığımı bu beyaz kâğıda mühürlüyorum. Beni unutmuş olman sevgimden hiçbir şey eksiltmedi; çünkü benim sevgim senin karşılığına değil, senin varlığının güzelliğine muhtaçtı. Hoşça kal bir tanem, hoşça kal hayatımın tek ve biricik anlamı.

Bu mektup benim sana son veda hediyem, sessizce akıp giden gençliğimin sana sunulmuş en temiz armağanıdır. Beni hiçbir zaman bilmedin ama ben senin varlığınla tamamlandım. Hayatımın bütün acılarını senin tek bir gülüşün sildi. Arkamda pişmanlık bırakmadan, sadece sana duyduğum bu sonsuz sevginin huzuruyla gözlerimi kapatıyorum. Eğer bir yerlerde beni hatırlarsan, bil ki bir zamanlar seni her şeyden çok sevmiş bir kadın yaşadı bu dünyada. Sana adanmış bu ömür burada nihayete ererken, ruhum senin yanında huzur buluyor. Hoşça kal birtanem, daima mutlu ve esen kal.`,
  },
]
