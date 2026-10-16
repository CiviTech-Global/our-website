import type { HelpArticleText } from '../../types';

const company: Record<string, HelpArticleText> = {
  home: {
    title: 'Ana sayfa',
    summary: 'Sitenin başlangıç noktası: Rayan Tamaddon Jahan Gostar kimdir, neler geliştirir ve buradan nereye gidebilirsiniz.',
    heading: 'Buradan başlayın',
    intro:
      'Rayan Tamaddon Jahan Gostar; özel yazılım, web ve mobil uygulamalar, kurumsal platformlar ve veri analitiği çözümleri geliştiren bir yazılım mühendisliği şirketidir. Bu site şirketi tanıtmanın yanında birkaç hizmeti tek bir yerde toplar: yazılım proje talepleri, çevrim içi sigorta başvuruları, uzmanlarla danışmanlık, iş ilanları, serbest projeler ve bir kitap pazarı. Her birinin kendi rehberi vardır ve hepsi yardım merkezinde toplanmıştır.',
    steps: [
      ['Ne aradığınızı belirleyin', 'Yazılım sipariş etmek için Hizmetler’e ya da doğrudan Proje başlatın’a; sigorta için Sigorta’ya; iş veya proje için Pazar yeri’ne gidin.'],
      ['Her sayfanın rehberini açın', 'Her sayfada üst çubuktaki Rehber düğmesi (veya ? tuşu) o sayfanın açıklamasını yanında açar.'],
      ['Talep gönderin ve kodu saklayın', 'Gönderdiğiniz her talebin bir takip kodu vardır; Talep takibi sayfasında bu kodla durumunu görürsünüz.'],
      ['Hesabınız varsa her şey panelinizde', 'Giriş yaptığınızda takip kodlarınız, mesajlarınız ve pazar yeri etkinliğiniz panelinizde bir arada durur.'],
    ],
    points: [
      ['Yazılım geliştirme', 'Fikirden devreye almaya ve bakıma kadar; ücretsiz ve bağlayıcı olmayan maliyet tahmini ve teknik teklifle.'],
      ['Ek hizmetler', 'Her ürün için ayrı formla birçok türde çevrim içi sigorta başvurusu; uzmanlarla teknik ve kariyer danışmanlığı.'],
      ['Pazar yeri', 'Yayından önce incelenen iş ilanları ve serbest projeler; üyeler arasında bir kitap pazarı.'],
      ['Altı dil', 'Site Farsça, İngilizce, Türkçe, Almanca, Fransızca ve İspanyolca kullanılabilir; dili üst çubuktan değiştirin.'],
    ],
    faqs: [
      ['Rayan Tamaddon Jahan Gostar tam olarak ne yapar?', 'Özel yazılım, web ve mobil uygulamalar, kurumsal ve kamu teknolojisi platformları ile veri analitiği ve görselleştirme tasarlar ve geliştirir. İşimizin büyük kısmı açık kaynaktır.'],
      ['CiviTech Global ile Rayan Tamaddon Jahan Gostar arasındaki ilişki nedir?', 'CiviTech Global, Rayan Tamaddon Jahan Gostar’ın uluslararası markasıdır: tek şirket, tek ekip.'],
      ['Siteyi kullanmak için kayıt olmam gerekir mi?', 'Proje, sigorta veya danışmanlık talebi, CV gönderme ya da bize ulaşma için hayır. İlan vermek, projeye teklif vermek veya kitap satmak için hesap gerekir.'],
      ['Talebimin nerede olduğunu nasıl öğrenirim?', 'Gönderirken aldığınız takip koduyla Talep takibi sayfasında. Giriş yapmışsanız kod Taleplerim altında da saklanır.'],
      ['Sitenin güven damgası var mı?', 'Evet. ENAMAD e-ticaret güven damgası her sayfanın altında yer alır.'],
    ],
    related: {
      services: 'Yazılım geliştirme hizmetlerinin tam listesi ve bir projenin nasıl yürüdüğü.',
      'start-project': 'Ücretsiz teknik teklif ve maliyet tahminine giden en kısa yol.',
      about: 'İşimizin arkasındaki misyon, vizyon ve değerler.',
      'help-centre': 'Tüm rehberler tek yerde, aramayla.',
    },
  },

  services: {
    title: 'Yazılım tasarım ve geliştirme hizmetleri',
    summary: 'Neler geliştirdiğimiz, her projenin geçtiği aşamalar ve ek hizmetlerimiz bir bakışta.',
    intro:
      'Bu sayfa dört ana hizmetimizi tanıtır: akıllı özel yazılım geliştirme, web ve mobil uygulama geliştirme, kurumsal ve kamu teknolojisi platformları, veri analitiği ve görselleştirme. Büyüklüğü ne olursa olsun her proje dört aşamadan geçer: fikir ve danışmanlık, analiz ve tasarım, geliştirme ve test, devreye alma ve destek. Sigorta hizmetleri de aynı sayfada ek hizmet olarak yer alır.',
    steps: [
      ['Doğru hizmeti bulun', 'Kartları okuyun; ihtiyacınız birkaç hizmete yayılıyorsa sorun değil, proje talebinde hepsini anlatırsınız.'],
      ['Aşamaları görün', 'Proje süreci bölümü, talebinizden teslimata ve desteğe kadar neler olduğunu gösterir.'],
      ['Proje talebi gönderin', 'Proje başlatın düğmesi ihtiyaç formunu açar; teknik teklif ve maliyet tahmini ücretsizdir.'],
    ],
    points: [
      ['Her taahhütten önce yazılı teklif', 'İş başlamadan kapsamı, teslimatları, varsayımları, kapsam dışını, zaman planını ve fiyat aralığını görürsünüz.'],
      ['Aşama aşama geliştirme', 'Yazılım kısa ve görünür aşamalarla geliştirilir; her adımda ilerlemeyi görür ve geri bildirim verirsiniz.'],
      ['Açık kaynak, bağımlılık yok', 'Açık standartlar ve açık kaynak teknolojiler üzerine kurulur; yazılımınız özgürce geliştirilebilir kalır.'],
      ['Teslimattan sonra da yanınızda', 'Yayından sonra bakım, güncelleme ve teknik destek.'],
    ],
    faqs: [
      ['Küçük projeleri de üstleniyor musunuz?', 'Evet. Kararımızı projenin büyüklüğü belirlemez; bir iş uzmanlık alanımızın dışındaysa bunu baştan dürüstçe söyleriz.'],
      ['Maliyeti nasıl öğrenirim?', 'Talep gönderdikten sonra fiyat aralığı içeren yazılı bir teklif alırsınız. Talebin incelenmesi ve teklifin yazılması ücretsizdir.'],
      ['Ne kadar sürer?', 'Kapsama bağlıdır. Ayrıntılı zaman planı yazılı teklifin bir parçasıdır ve iş başlamadan önce görürsünüz.'],
      ['Mevcut yazılımımı yeniden yazabilir veya bakımını yapabilir misiniz?', 'Evet. “Mevcut yazılımı yeniden yazma veya modernleştirme” ve “Bakım ve destek” talep formundaki proje türleridir.'],
      ['Talep göndermeden önce biriyle görüşebilir miyim?', 'Evet. Danışmanlık sayfasından teknik bir görüşme isteyin; danışmanlık sizi hiçbir şeye bağlamaz.'],
    ],
    related: {
      'start-project': 'İhtiyaç formu: hizmeti seçtikten sonraki adım.',
      portfolio: 'Geliştirdiklerimizden örnekler ve kullandığımız teknolojiler.',
      consult: 'Ne istediğinizden henüz emin değilseniz önce konuşun.',
      insurance: 'Ek hizmetimiz: birçok türde çevrim içi sigorta başvurusu.',
    },
  },

  'start-project': {
    title: 'Yazılım proje talebi',
    summary: 'İhtiyacınızı anlatın; teknik teklifi, zaman planını ve fiyat aralığını ücretsiz ve bağlayıcı olmadan alın.',
    intro:
      'Bu form talebinizi resmî bir teklife dönüştürür. İhtiyacı, hedefleri, kısıtları ve bütçeyi ne kadar net anlatırsanız teklif o kadar kesin olur. Gönderdikten sonra bir takip kodu alırsınız; uzmanlarımız talebi inceler, belirsiz olanları sorar ve sonunda aynı kodla okuyup kabul ya da reddedeceğiniz yazılı bir teklif gönderir.',
    steps: [
      ['Kendinizi tanıtın', 'Ad, e-posta ve telefon zorunludur. E-posta ve telefon birlikte kimliğinizdir; sonraki taleplerde aynı ikisini girin.'],
      ['Projeyi anlatın', 'Başlığı, proje türünü, iş birliği modelini ve platformları seçin; ihtiyaç bölümünde bugün neyin çalışmadığını ve ne beklediğinizi kendi sözlerinizle yazın.'],
      ['Zamanı ve bütçeyi belirtin', 'Kesin bir rakam değil, bir bütçe aralığı verin. Belirli bir bütçeniz yoksa o seçeneği işaretleyin.'],
      ['Belgeleri ekleyin', 'En fazla 8 dosya (her biri 10 MB’a kadar, toplam 25 MB). İncelemeden önce gizlilik sözleşmesi gerekiyorsa NDA seçeneğini işaretleyin.'],
      ['Takip kodunu saklayın', 'Gönderdikten sonra kodu kopyalayın. Teklifi bu kodla Talep takibi sayfasında okursunuz.'],
    ],
    points: [
      ['Resmî ve ücretsiz teklif', 'Kapsam, teslimatlar, varsayımlar, dahil olmayanlar, zaman planı ve fiyat aralığı.'],
      ['Kabul edene kadar yükümlülük yok', 'Teklifi kabul edene kadar hiçbir şeye bağlı değilsiniz; reddederseniz iş orada biter.'],
      ['Gizlilik', 'Gönderdikleriniz bizde kalır; gerekirse incelemeden önce NDA imzalanır.'],
    ],
    tips: [
      ['“Kapsam dışı” alanını boş bırakmayın', 'Neyi istemediğinizi baştan bilmek teklifi daha kesin, fiyatı daha gerçekçi yapar.'],
      ['Neden bütçe aralığı?', 'Bu aşamada bir yazılım tahmini kabaca −%25 ile +%75 arasında doğrudur; iki taraf için de aralık tek bir rakamdan daha gerçekçidir.'],
      ['Kod kaybolmasın diye giriş yapın', 'Göndermeden önce giriş yaptıysanız takip kodu Taleplerim altında otomatik saklanır.'],
    ],
    faqs: [
      ['Talebin incelenmesi ve teklif ücretli mi?', 'Hayır. İkisi de ücretsizdir.'],
      ['Teklif ne zaman hazır olur?', 'Talebin karmaşıklığına bağlıdır. Durumu istediğiniz zaman takip kodunuzla görün; sorumuz olursa teklifi yazmadan önce sorarız.'],
      ['Teklifi reddedersem ne olur?', 'Hiçbir şey; reddedersiniz, o kadar. Gönderdikleriniz bizde kalır ve başka kimseye ulaşmaz.'],
      ['Takip kodumu kaybettim.', 'Giriş yapmışsanız Taleplerim altındadır. Aksi hâlde aynı e-posta ve telefonla İletişim sayfasından mesaj gönderin.'],
      ['Hangi proje türünü seçeceğimi bilmiyorum.', 'En yakın olanı veya Diğer’i seçin ve ihtiyaçta açıklayın; incelemede düzeltiriz.'],
    ],
    related: {
      services: 'Hangi hizmetin uygun olduğundan henüz emin değilseniz.',
      track: 'Teklifi takip kodunuzla okuyup kabul ettiğiniz veya reddettiğiniz yer.',
      'my-requests': 'Üyeler için: tüm takip kodlarınız tek bir listede.',
      consult: 'Göndermeden önce bağlayıcı olmayan teknik bir görüşme.',
    },
  },

  about: {
    title: 'Hakkımızda',
    summary: 'Rayan Tamaddon Jahan Gostar kimdir: misyon, vizyon, değerler ve yaptıklarımız.',
    intro:
      'Bu sayfa şirketi tanıtır: misyonumuz, bireyler, işletmeler ve kurumlar için özel ve açık kaynak yazılım geliştirerek medeniyetin teknolojiden her gün daha fazla yararlanmasına yardımcı olmaktır. Vizyonumuz tamamen akıllı bir medeniyettir; bu yolda açık kaynak mühendisliğinin ve yeni nesil mühendislerin evi olmak istiyoruz.',
    points: [
      ['Misyon ve vizyon', 'Bunu neden yaptığımız ve nereye varmak istediğimiz.'],
      ['Değerler', 'İnovasyon, şeffaflık, topluluk ve mükemmellik; her birinin günlük işte anlamı.'],
      ['Bizi tanıyın', 'Ekip, projeler, müşteriler, iş ortakları ve bloga bağlantılar.'],
    ],
    faqs: [
      ['CiviTech Global nedir?', 'Rayan Tamaddon Jahan Gostar’ın uluslararası markasıdır.'],
      ['Neden açık kaynak?', 'Kod şeffaf ve denetlenebilirdir, hiçbir tedarikçiye bağlı değildir, güvenliğini geniş bir topluluk sınar ve sahip olma maliyeti daha düşüktür.'],
      ['Sizinle nasıl çalışabilirim?', 'Proje için Proje başlatın, iş için CV gönderin, staj için Gönüllülük ve staj.'],
    ],
    related: {
      team: 'İşi yapan kişiler ve nasıl çalıştıkları.',
      portfolio: 'Şimdiye kadar geliştirdiklerimiz.',
      customers: 'Yazılımını geliştirdiğimiz kurumlar.',
      join: 'Bu ekibin parçası olmak istiyorsanız.',
    },
  },

  team: {
    title: 'Ekibimiz',
    summary: 'Bu platformu ve müşteri projelerini geliştiren mühendisler, tasarımcılar ve iş birlikçiler.',
    heading: 'Ekibimiz nasıl çalışır',
    intro:
      'Her projenin arkasında birbirinin işini gözden geçiren, kararları yazıya döken ve ilk mesajdan teslimata kadar işin sorumluluğunu taşıyan bir yazılım mühendisleri ekibi vardır. Rayan Tamaddon Jahan Gostar; açık kaynak, küresel bir mühendis topluluğuyla iş birliği ve yeni başlayanlara açık bir kapı üzerine kuruldu. Bunun günlük işte ne anlama geldiği aşağıda.',
    points: [
      ['Gözden geçirilen ve test edilen kod', 'Her değişiklik yayına girmeden önce başka bir mühendis tarafından okunur ve testlerle güvence altına alınır. Amaç yalnızca teslim günü değil, yıllarca çalışan koddur.'],
      ['Kararlar kâğıt üzerinde', 'Kapsam, varsayımlar, işe dahil olmayanlar, zaman planı ve fiyat aralığı yazılı bir teklifte yer alır. Yazılmamış olan, üzerinde anlaşılmamış demektir.'],
      ['İlk günden erişilebilir', 'Geliştirdiğimiz her şey klavye ve ekran okuyucuyla çalışır, ucuz bir telefonda da açılır. Bu bir yan özellik değil, bir karardır.'],
      ['Açık kaynak, açık kapı', 'İşimizin bir kısmı küresel bir toplulukla birlikte açık kaynak projelerde yürür; gönüllülük ve staj programı ise yeni başlayanlara gerçek projelerde çalışma imkânı verir.'],
    ],
    faqTitle: 'Ekip hakkında sık sorulan sorular',
    faqs: [
      ['Ekibe nasıl katılabilirim?', 'CV’nizi “CV gönderin” sayfasından gönderin. Okuruz ve deneyiminize uygun bir pozisyon açıldığında sizinle iletişime geçeriz.'],
      ['Yeni başlıyorum. Bana yer var mı?', 'Evet. “Gönüllülük ve staj” programı tam da bunun için var: deneyimli mühendislerle birlikte gerçek projeler.'],
      ['CiviTech Global ile Rayan Tamaddon Jahan Gostar arasındaki ilişki nedir?', 'CiviTech Global, Rayan Tamaddon Jahan Gostar’ın uluslararası markasıdır: tek şirket, tek ekip.'],
      ['Bu ekiple nasıl proje başlatırım?', 'Talebinizi “Proje başlatın” sayfasından iletin. Bir takip kodu alırsınız ve size ücretsiz, bağlayıcı olmayan yazılı bir teklif hazırlanır.'],
    ],
    related: {
      join: 'İş için CV gönderin.',
      volunteer: 'Yeni başlayanların yolu: gerçek projelerde gönüllülük ve staj.',
      experts: 'Teknik ve kariyer danışmanlığı veren uzmanlar.',
      'start-project': 'Bu ekiple proje başlatın.',
    },
  },

  portfolio: {
    title: 'Projelerimiz',
    summary: 'Süren ve teslim edilen projeler: geliştirdiğimiz platformlar, uygulamalar ve sistemler.',
    intro:
      'Bu sayfa işimizden örnekler gösterir. Her proje için kısa bir açıklama, durumu (sürüyor veya teslim edildi), kullanılan teknolojiler ve varsa ekran görüntüleri ile bağlantısı yer alır. Proje belirli bir müşteri için yapıldıysa müşteri de gösterilir.',
    steps: [
      ['Listeye göz atın', 'Projeleri duruma (sürüyor veya teslim edildi) ya da kullanılan teknolojiye göre süzün.'],
      ['Ekran görüntülerini açın', 'Her projenin galerisi nasıl göründüğünü ve çalıştığını gösterir.'],
      ['Benzerini mi istiyorsunuz?', 'Ne demek istediğinizi tam anlamamız için talebinizde bu projeden söz edin.'],
    ],
    faqs: [
      ['Tüm projeleriniz burada mı?', 'Hepsi değil. Bazı projeler gizlidir ve yalnızca müşterinin izniyle yayımlanır.'],
      ['Kodu görebilir miyim?', 'Açık kaynak projeler için evet; depo bağlantısı yayımlandıysa projede yer alır.'],
      ['Bunlardan birine benzer bir şey istiyorum.', 'Proje başlatın sayfasında ihtiyacınızı anlatın ve bu projeden söz edin.'],
    ],
    related: {
      services: 'Bu projelerin çıktığı hizmetler.',
      customers: 'Bu yazılımları geliştirdiğimiz kurumlar.',
      'start-project': 'Kendi projenizi başlatın.',
    },
  },

  customers: {
    title: 'Müşteri kulübü',
    summary: 'Yazılımını geliştirdiğimiz kurumlar ve bizimle çalışmak hakkında söyledikleri.',
    heading: 'Müşterimiz olmak ne demek',
    intro:
      'Müşteri kulübü, yazılımını geliştirdiğimiz kurum ve işletmeleri listeler. Listeden daha önemlisi, her müşterinin ilk mesajdan teslim edilen yazılıma kadar yaşadığı deneyimdir; küçük ya da büyük her projede herkese verdiğimiz söz budur.',
    points: [
      ['Ücretsiz yazılı teklif', 'Talebinizi incelemek ve teklif yazmak ücretsizdir. Teklif; kapsamı, çıktıları, varsayımları, işe dahil olmayanları, zaman planını ve fiyat aralığını içerir.'],
      ['Her zaman erişilebilen takip kodu', 'Talep gönderdiğinizde bir takip kodu alırsınız. Gecenin üçü dahil her saatte işinizin durumunu gösterir ve teklifi kabul etmenizi ya da reddetmenizi sağlar.'],
      ['İşten önce fiyat', 'Hiçbir şey başlamadan fiyat aralığını görürsünüz. İşin bir kısmı parasına değmiyorsa bunu erkenden söyleriz.'],
      ['Açık yanıtlar', 'Bir iş uzmanlık alanımızın dışındaysa bunu açıkça söyleriz. Kararımızı projenin büyüklüğü belirlemez; küçük projeleri de üstleniriz.'],
    ],
    faqTitle: 'Müşterilerden sık gelen sorular',
    faqs: [
      ['Fiyat teklifi için ücret ödüyor muyum?', 'Hayır. Talebinizin incelenmesi ve teklifin yazılması ücretsizdir.'],
      ['Teklifi reddedersem ne olur?', 'Hiçbir şey. Reddedersiniz, o kadar. Gönderdiğiniz her şey bizde kalır ve başka kimseye gitmez.'],
      ['Takip kodumu kaybettim.', 'Talebi gönderirken kullandığınız telefon numarası ya da e-posta adresinden bize ulaşın, kodu size yeniden verelim.'],
      ['Biten iş birlikleri bu listede kalıyor mu?', 'Evet. Eski müşteriler ayrı bir bölümde kalır: “bunu onlar için geliştirdik” hâlâ doğrudur.'],
    ],
    related: {
      portfolio: 'Bu müşteriler için geliştirdiğimiz projeler.',
      'start-project': 'Müşterimiz olun: proje talebi gönderin.',
      partners: 'Birlikte çalıştığımız kurumlar.',
    },
  },

  partners: {
    title: 'İş ortaklarımız',
    summary: 'Birlikte yazılım geliştirdiğimiz teknoloji, akademik, topluluk ve stratejik ortaklar.',
    heading: 'Bizimle çalışmak',
    intro:
      'İş ortaklarımız, teknoloji şirketlerinden üniversitelere ve açık kaynak topluluklarına kadar birlikte yazılım geliştirdiğimiz kurumlardır. Her ortaklığın kendine özgü bir biçimi vardır ama zemini aynıdır: iş, kararlar ve sınırlar konusunda şeffaflık ve güvenilebilir bir kalite.',
    points: [
      ['Teknoloji ortakları', 'Teknolojisini, altyapısını veya araçlarını kendi işimizle birlikte kullandığımız ya da ürününün bir parçasını geliştirmek için bizi seçen şirketler.'],
      ['Akademik ortaklar', 'Yeni nesil mühendisleri yetiştirmek için birlikte çalıştığımız üniversiteler ve eğitim merkezleri; öğrencilere gerçek projelere açılan bir kapı.'],
      ['Topluluk ortakları', 'Katkıda bulunduğumuz, yalnız değil başkalarıyla birlikte üretmeyi mümkün kılan topluluklar ve açık kaynak projeleri.'],
      ['Stratejik ortaklar ve bayiler', 'Çözümlerimizi kendi pazarlarında temsil eden ya da satan veya uzun vadede bizimle yol yürüyen kurumlar.'],
    ],
    faqTitle: 'Ortaklık hakkında sık sorulan sorular',
    faqs: [
      ['Nasıl ortaklık önerebilirim?', '“İletişim” sayfasından aklınızdaki ortaklığı anlatan bir mesaj gönderin. Bir takip kodu alırsınız ve yanıtımızı aynı sayfada bu kodla okursunuz.'],
      ['Bir ortakta ne arıyorsunuz?', 'Kendimizin de dayandığı değerleri: şeffaflık, hıza asla feda edilmeyen kalite ve başkalarıyla birlikte üretmek.'],
      ['Bir ortak bu sayfada ne zaman yer alır?', 'Ortaklık kurulduğunda. Sona eren ortaklıklar da ayrı bir bölümde kalır.'],
    ],
    related: {
      customers: 'Yazılım geliştirdiğimiz kurumlar.',
      contact: 'Ortaklık önerinizi buradan gönderin.',
      volunteer: 'Üniversiteler için: öğrencilerin staj yolu.',
    },
  },

  contact: {
    title: 'İletişim',
    summary: 'Mesaj gönderin, takip kodu alın ve yanıtı bu kodla aynı sayfada okuyun; e-posta gerekmez.',
    heading: 'Mesajınız nasıl takip edilir',
    intro:
      'Bize yazmak için ne hesap gerekir ne de e-posta beklemek. Mesajınızı gönderirsiniz, bir takip kodu alırsınız ve yanıtı bu kodla aynı sayfada okursunuz.',
    points: [
      ['E-posta yerine takip kodu', 'E-posta adresiniz yalnızca mesajınızı tanımlar; ona yanıt gönderilmez. Yanıtımızı bu sayfada, takip kodunuzla okursunuz.'],
      ['Kod yalnızca bir kez gösterilir', 'Mesajınızı gönderir göndermez kodu not edin veya kopyalayın: mesajınıza dönmenin tek yolu budur.'],
      ['Açık bir durum', 'Her mesaj “Yanıt bekliyor”, “Yanıtlandı” veya “Kapatıldı” durumundadır. Kodunuzu girdiğinizde durumu ve yanıtı birlikte görürsünüz.'],
      ['Her iş için doğru sayfa', 'Yazılım projesi için “Proje başlatın”, bir uzmanla görüşmek için “Danışmanlık talebi” sayfasını kullanın. Sigorta talepleri kendi kodlarıyla “Talep takibi” sayfasından izlenir.'],
    ],
    tips: [
      ['Kodu şimdi kopyalayın', 'Mesajın takip kodu yalnızca bir kez gösterilir ve e-posta gönderilmez; kod olmadan yanıta ulaşamazsınız.'],
    ],
    faqTitle: 'İletişim hakkında sık sorulan sorular',
    faqs: [
      ['Yanıtı e-postayla gönderir misiniz?', 'Hayır. Yanıt bu sayfadadır ve takip kodunuzla okunur; kodu saklamanın önemi bu yüzdendir.'],
      ['Yanıt ne kadar sürer?', 'Mesajlara kısa sürede bakarız. Yanıt verene kadar mesaj “Yanıt bekliyor” olarak görünür.'],
      ['Takip kodumu kaybettim.', 'Öncekinden söz eden yeni bir mesaj gönderin; yanıtı yeni mesajın koduyla okursunuz.'],
      ['Proje başlatmak için hangi sayfayı kullanmalıyım?', '“Proje başlatın”. Orada talebiniz kapsam, zaman planı ve fiyat aralığı içeren yazılı bir teklife dönüşür.'],
    ],
    related: {
      'start-project': 'Yazılım projesi için kendi formu daha iyi yanıt alır.',
      consult: 'Bir uzmanla konuşmak için danışmanlık isteyin.',
      track: 'Proje, sigorta, CV ve danışmanlık taleplerinin takibi.',
    },
  },

  join: {
    title: 'CV gönderin',
    summary: 'CV’nizi gönderin; deneyiminize uygun bir pozisyon açılır açılmaz sizinle iletişime geçelim.',
    heading: 'CV’den görüşmeye',
    intro:
      'Bu form Rayan Tamaddon Jahan Gostar’da çalışmak isteyenler içindir: yazılım mühendisleri, tasarımcılar veya ürün yöneticileri; yeni başlayan ya da deneyimli. CV’nizi okuruz ve uygun bir pozisyon açıldığında iletişime geçeriz. CV’nizin durumunu istediğiniz zaman bir takip koduyla görürsünüz.',
    steps: [
      ['Bilgilerinizi girin', 'Ad, e-posta ve telefon zorunludur; e-posta ve telefon birlikte sonraki takiplerde sizi tanımlar.'],
      ['CV’nizi ekleyin', 'PDF, Word (docx) veya LaTeX (tex), en fazla 10 MB. Kısa bir not isteğe bağlıdır.'],
      ['Takip kodunu saklayın', 'Gönderdikten sonra bir kod alırsınız; CV’nizin durumunu Talep takibi sayfasında görün.'],
    ],
    tips: [
      ['Gönderim sınırı', 'Her kişi günde en fazla iki kez (bir saat arayla) ve yalnızca iki gün CV gönderebilir; bu yüzden son hâlini gönderin.'],
    ],
    faqs: [
      ['Yeni başlıyorum; CV göndermeli miyim?', 'Evet. Henüz iş deneyiminiz yoksa Gönüllülük ve staj programı da sizin için var.'],
      ['Her CV’ye yanıt veriyor musunuz?', 'Okuruz ve durumunu takip kodunuzla görebilirsiniz. Uygun bir pozisyon açıldığında iletişime geçeriz.'],
      ['CV’mi güncelleyebilir miyim?', 'Yeni sürümü yeniden gönderin; günde iki kez ve iki gün sınırı içinde.'],
      ['Belirli bir ilana başvurabilir miyim?', 'Evet; İş ilanları’ndaki ilanlar için doğrudan ilanın sayfasından başvurun.'],
    ],
    related: {
      volunteer: 'Staj veya gönüllü çalışma arıyorsanız.',
      jobs: 'Bizden ve diğer şirketlerden açık pozisyonlar.',
      team: 'Katılacağınız ekiple tanışın.',
      track: 'Takip koduyla CV’nizin durumu.',
    },
  },

  volunteer: {
    title: 'Gönüllülük ve staj',
    summary: 'Gönüllü veya stajyer olarak gerçek projelerde çalışın ve deneyimli mühendislerle birlikte gelişin.',
    intro:
      'Bu program öğrenciler ve yeni mezunlar, kariyerini yazılıma çevirenler ve açık kaynak ile kamu projelerine katkı vermek isteyen geliştiriciler içindir. İki biçimi vardır: boş zamanınızı katı bir zaman taahhüdü olmadan projelere verdiğiniz gönüllülük ve öğrenme planı, mentor ve son değerlendirme içeren belirli süreli staj.',
    steps: [
      ['Katılım türünü seçin', 'Gönüllü veya stajyer; her birinin formda kendi açıklaması vardır.'],
      ['Ne ve ne zaman', 'Alanınız (ön yüz, arka uç, mobil, veri, tasarım vb.), haftalık saat, başlangıç tarihi ve çalışma biçimi (yerinde, hibrit veya uzaktan).'],
      ['Eğitim ve becerilerinizi yazın', 'Üniversite, bölüm, beceriler ve GitHub veya portföy bağlantısı; ne kadar eksiksiz olursa doğru projeyi bulmak o kadar kolaydır.'],
      ['Gönderin ve kodu saklayın', 'Başvurunuzu takip koduyla izleyin.'],
    ],
    points: [
      ['Gerçek projeler', 'Uydurma alıştırmalar değil, gerçekten kullanılan yazılımlar üzerinde çalışma.'],
      ['İnceleme ve mentorluk', 'Deneyimli mühendislerden kod incelemesi ve rehberlik.'],
      ['Sertifika', 'Programı tamamlayanlara sertifika ve referans mektubu.'],
    ],
    faqs: [
      ['Gönüllülük ücretli mi?', 'Gönüllülük ücretsiz ve zaman açısından esnektir. İş arıyorsanız CV gönderin sayfasını kullanın.'],
      ['Deneyimsiz başvurabilir miyim?', 'Evet; program bunun için var. Sahip olduğunuz becerileri, ne kadar az olursa olsun, yazın.'],
      ['Uzaktan çalışma mümkün mü?', 'Evet. Formda çalışma biçimi olarak yerinde, hibrit veya uzaktan seçin.'],
      ['Staj ile gönüllülük arasındaki fark nedir?', 'Staj; öğrenme planı, mentor ve son değerlendirme içeren belirli bir dönemdir. Gönüllülük ise katı zaman taahhüdü olmadan esnektir.'],
    ],
    related: {
      join: 'İş arıyorsanız.',
      team: 'Birlikte çalışacağınız mühendisler.',
      experts: 'Uzmanlardan kariyer danışmanlığı için.',
    },
  },

  blog: {
    title: 'Blog',
    summary: 'Sigorta ve yazılım hakkında pratik rehberler: fiyatlar, satın alma ipuçları ve karşılaştırmalar.',
    intro:
      'Blogda gerçek bir karara yardımcı olan yazılar yayımlarız: zorunlu trafik ve kasko fiyatları, sigorta alırken dikkat edilecekler veya bir yazılım projesinin nasıl tanımlanacağı. Yazıların çoğu Farsçadır, bazılarının İngilizce sürümü vardır; dilinizde bulunmayan bir yazı o dilin listesinde görünmez.',
    steps: [
      ['Bir yazı bulun', 'Listeye göz atın; her yazının özeti, yayın tarihi ve tahmini okuma süresi vardır.'],
      ['Okuyun, sonra harekete geçin', 'Her yazı çevrim içi sigorta başvurusuna bir bağlantıyla biter; hazırsanız talebi oradan başlatabilirsiniz.'],
    ],
    faqs: [
      ['Yazılar ne sıklıkla yayımlanır?', 'Söyleyecek yeni bir şeyimiz olduğunda; niceliğe değil niteliğe önem veririz.'],
      ['Yazılardaki fiyatlar kesin mi?', 'Hayır. Fiyatlar yazının yayın tarihine aittir ve değişebilir; kesin fiyatı başvururken alırsınız.'],
      ['Gördüğüm bir yazı neden başka dilde yok?', 'Her yazı yalnızca yazıldığı dillerde yayımlanır; makine çevirisi yayımlamayız.'],
    ],
    related: {
      insurance: 'Bir sigorta yazısını okuduktan sonra o sigortaya başvurun.',
      services: 'Teknik yazıların ilgili olduğu yazılım hizmetleri.',
      'help-centre': 'Sitenin her bölümünü kullanma rehberleri için.',
    },
  },

  track: {
    title: 'Talep takibi',
    summary: 'Takip kodunuzla proje, sigorta, CV veya danışmanlık talebinin durumunu görün.',
    intro:
      'Bu sitede yaptığınız her talebin on karakterlik bir takip kodu vardır. Bu sayfa, türü ne olursa olsun talebin durumunu bu koddan gösterir: yazılım proje talebi (ve burada kabul veya reddettiğiniz teklifimiz), sigorta talebi (ve kararlaştırılan arama zamanı), CV veya danışmanlık talebi (gerekirse iptal edebilirsiniz). İletişim formu mesajları İletişim sayfasında ayrıca takip edilir.',
    steps: [
      ['Kodu girin', 'Kodu aldığınız gibi yazın; harfler otomatik olarak büyük harfe çevrilir.'],
      ['Durumu görün', 'Talep türü, gönderim tarihi, son güncelleme ve mevcut durum gösterilir.'],
      ['Teklif geldiyse karar verin', 'Proje talebi için yazılı teklifi açın ve kabul edin ya da reddedin.'],
    ],
    points: [
      ['Her şey için tek sayfa', 'Projeler, sigorta, CV’ler ve danışmanlıklar aynı formla izlenir.'],
      ['Paylaşılabilir bağlantı', 'Kod sayfa adresinde kalır; bağlantıyı yer imlerine ekleyebilir veya sigortanın ait olduğu kişiye gönderebilirsiniz.'],
    ],
    tips: [
      ['Hepsini tek yerde tutun', 'Hesabınız varsa kodlarınızı Taleplerim altına ekleyin; her seferinde yazmanız gerekmez.'],
    ],
    faqs: [
      ['Takip kodum nerede?', 'Talebi gönderir göndermez gösterilir. Giriş yapmışsanız Taleplerim altında da saklanır.'],
      ['Bu kodla talep bulunamadı diyor.', 'Kodu tekrar kontrol edin; sıfırı O harfiyle veya biri I harfiyle karıştırmayın. Sorun sürerse İletişim sayfasından mesaj gönderin.'],
      ['İletişim formu mesajını burada mı takip ederim?', 'Hayır; iletişim mesajları kendi kodlarıyla İletişim sayfasında takip edilir.'],
      ['Kodumla başkaları neyi görebilir?', 'Kodu olan herkes durumu görebilir; kodu bir parola gibi saklayın ve yalnızca gerekli kişiyle paylaşın.'],
    ],
    related: {
      'start-project': 'Yazılım proje talebi gönderin.',
      insurance: 'Sigorta talebi gönderin.',
      join: 'CV gönderin.',
      'my-requests': 'Üyeler için: tüm kodlar tek listede.',
    },
  },

  'help-centre': {
    title: 'Yardım merkezi',
    summary: 'Sitedeki tüm rehberler tek yerde, gruplanmış ve aranabilir.',
    intro:
      'Yardım merkezi sitenin her bölümü için ne yaptığını, nasıl kullanıldığını, hangi bölümlerle birlikte çalıştığını ve sık sorulan soruların yanıtlarını açıklar. Aynı rehberlere her sayfada Rehber düğmesi veya ? tuşuyla ulaşılır. Üye paneli rehberlerini herkes okuyabilir; böylece hesap açmadan önce neler sunduğunu bilirsiniz.',
    steps: [
      ['Arayın', '“Takip kodu”, “doğrulama” veya “teklif” gibi bir şey yazın.'],
      ['Ya da bir koleksiyona göz atın', 'Rehberler sitenin bölümlerine göre gruplanmıştır.'],
      ['Rehberden bölüme gidin', 'Her rehberde Bu bölüme git düğmesi ve ilgili bölümlere bağlantılar vardır.'],
    ],
    faqs: [
      ['Sorumun yanıtını bulamadım.', 'İletişim sayfasından sorun; sık gelen sorular rehberlere eklenir.'],
      ['Rehber benim dilimde değil.', 'Herkese açık sayfaların rehberleri sitenin altı dilinin hepsinde yazılmıştır; üye ve yönetim paneli rehberleri şimdilik Farsça ve İngilizcedir.'],
    ],
    related: {
      home: 'Ana sayfaya dön.',
      contact: 'Sorunuzun yanıtı rehberlerde yoksa.',
      dashboard: 'Üye paneli rehberi.',
    },
  },
};

export default company;
