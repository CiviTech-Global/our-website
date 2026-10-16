import type { HelpArticleText } from '../../types';

const jobs: Record<string, HelpArticleText> = {
  jobs: {
    title: 'İş ilanları',
    summary: 'Doğrulanmış işverenlerden İran genelinde ve uzaktan iş ilanları; arama, filtre ve bildirimlerle.',
    intro:
      'Bu bölüm iş ilanlarını listeler; Rayan Tamaddon Jahan Gostar’dan ve diğer şirketlerden. Yalnızca kimliğini ekibimizin doğruladığı işverenler ilan verebilir ve her ilan yayımlanmadan önce incelenir. İş arayanlar için her şey ücretsizdir: arama, ilan kaydetme, bildirimler ve başvuru.',
    steps: [
      ['Arayın ve süzün', 'İş unvanı, beceri veya şirket adıyla arayın; kategori, il, ülke, uzaktan çalışma veya asgari maaşa göre süzün.'],
      ['Bir ilanı açın', 'Her ilanda gereksinimler, maaş ve yan haklar, beceriler ve şirket bilgisi yer alır.'],
      ['Kaydedin veya bildirim alın', 'İlginç ilanları kaydedin; yeni ilanlardan haberdar olmak için Bu arama için bildirim al’a basın.'],
      ['Başvurun', 'CV göndermek için giriş yapın ve kimlik doğrulamasını tamamlayın; başvuru doğrudan işverene ulaşır.'],
    ],
    points: [
      ['Doğrulanmış işverenler', 'Her işverenin kimliği kontrol edilmiştir ve her ilan yayına girmeden önce okunur.'],
      ['İl ve kategori sayfaları', 'Bir ilin, bir ülkenin veya bir kategorinin ilanlarının, yer imlerine ekleyebileceğiniz kendi adresi vardır.'],
      ['Uluslararası uzaktan çalışma', 'Her ülkeden ya da belirli bir ülkeden başvurulara açık uzaktan pozisyonlar.'],
      ['Etkinliğinize göre öneriler', 'Giriş yaptığınızda başvurduğunuz veya kaydettiğiniz ilanlara uyan ilanlar önerilir.'],
    ],
    tips: [
      ['Bildirim kurun', 'Her gün bakmak yerine aramanızı Bu arama için bildirim al ile kaydedin; eşleşen her yeni ilan sizi bir kez haberdar eder.'],
    ],
    faqs: [
      ['Başvurmak ücretli mi?', 'Hayır. Arama, ilan kaydetme, bildirimler ve başvuru iş arayanlar için ücretsizdir.'],
      ['Burada kimler ilan verebilir?', 'Yalnızca kimliğini ekibimizin doğruladığı işverenler; her ilan yayımlanmadan önce incelenir.'],
      ['Nasıl ilan veririm?', 'Giriş yapın, kimlik doğrulamasını tamamlayın, panelinizde İlanlarım altında bir ilan oluşturup incelemeye gönderin.'],
      ['Başvurmak için neden kimlik doğrulamam gerekiyor?', 'İşverenin gerçek bir kişiyle muhatap olduğunu bilmesi için; işverenlerin doğrulanmasıyla aynı neden.'],
      ['Bunun CV gönderin sayfasından farkı nedir?', 'CV gönderin, doğrudan Rayan Tamaddon Jahan Gostar ile çalışmak içindir; bu bölüm bizden veya başka şirketlerden belirli ilanlar içindir.'],
    ],
    related: {
      'job-detail': 'Her ilanın sayfası ve başvuru formu.',
      companies: 'İşe alım yapan şirketler.',
      'my-applications': 'İş arayanlar için: başvurular, kaydedilen ilanlar ve bildirimler.',
      'my-jobs': 'İşverenler için: ilan verme ve yönetme.',
    },
  },

  'job-detail': {
    title: 'Bir iş ilanı',
    summary: 'Bir pozisyonun ayrıntıları, ne kadar uyduğunuz ve başvuru formu.',
    intro:
      'Her ilan pozisyon tanımını, gereksinimleri, maaş ve yan hakları, gereken becerileri ve şirket bilgisini gösterir. Becerilerinizi profilinize eklediyseniz gereken becerilerden kaçına sahip olduğunuzu da gösterir. Başvurunuz doğrudan işverene gider ve her aşamada sizi bilgilendiririz.',
    steps: [
      ['İlanı okuyun', 'Gereksinimleri, maaşı ve çalışma türünü inceleyin; işveren genellikle yanıt veriyorsa yanıt oranı da gösterilir.'],
      ['Uyumunuzu görün', '“Bu pozisyona ne kadar uygunsunuz?” bölümü sahip olduğunuz ve öğrenmeye değer becerileri gösterir.'],
      ['Giriş yapın ve doğrulayın', 'Başvuru formu, giriş yaptığınızda ve kimliğiniz doğrulandığında açılır.'],
      ['CV’nizi gönderin', 'Başvuruyu gönderin ve durumunu Başvurularım altında izleyin.'],
    ],
    tips: [
      ['Becerilerinizi profilinize ekleyin', 'Profilinizde beceri olmadan bir ilanla uyumunuz hesaplanamaz.'],
    ],
    faqs: [
      ['İşverenin CV’mi gördüğünü nasıl anlarım?', 'İşveren başvurunuzu açtığında durumu İşveren gördü olur ve aşama her değiştiğinde sizi bilgilendiririz.'],
      ['Başvurumu geri çekebilir miyim?', 'Evet, Başvurularım’dan. İlan açık olduğu sürece yeniden başvurabilirsiniz.'],
      ['Aynı ilana iki kez başvurabilir miyim?', 'Hayır; daha önce başvurduysanız tarih ilanda gösterilir.'],
      ['Maaşı göremiyorum.', 'Bazı işverenler belirtmez; ilanda o zaman Görüşülür yazar.'],
    ],
    related: {
      jobs: 'Tüm ilanlara dönün.',
      companies: 'İlanın arkasındaki şirketin sayfası.',
      'my-applications': 'Gönderdiğiniz başvuruları izleyin.',
      verification: 'Başvurmadan önce gereken kimlik doğrulaması.',
    },
  },

  companies: {
    title: 'Şirketler',
    summary: 'Doğrulanmış işverenler, her şirketin sayfası ve açık pozisyonları.',
    intro:
      'Doğrulanmış her işverenin bir şirket sayfası olabilir: tanıtım, kurum büyüklüğü, görseller ve tüm açık pozisyonları. Burada şirketleri arar ve her şirketin sayfasından ilanlarına geçersiniz.',
    steps: [
      ['Şirketi bulun', 'Adıyla arayın veya kurum büyüklüğüne göre göz atın.'],
      ['Sayfayı okuyun', 'Şirketin tanıtımını ve açık pozisyonlarını görün.'],
      ['İşveren misiniz?', 'Doğrulandıktan sonra şirket sayfanızı panelinizden oluşturun; verdiğiniz her ilan ona bağlanır.'],
    ],
    faqs: [
      ['Nasıl şirket sayfası oluştururum?', 'Panelinizde Şirket sayfası bölümüne gidin. Önce kimliğiniz doğrulanmış olmalıdır.'],
      ['Bir şirket sayfası neden gizlendi?', 'Bir sayfa sitenin kurallarına aykırıysa personelimiz onu gizler; sayfa sahibi nedenini destekten sorabilir.'],
    ],
    related: {
      jobs: 'Tüm ilanlar.',
      'my-jobs': 'İşverenler için: ilanlar ve şirket sayfası.',
    },
  },
};

export default jobs;
