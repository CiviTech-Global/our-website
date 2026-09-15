import type { PartialTranslations } from './merge';

/**
 * Türkçe.
 *
 * Partial on purpose: the public surface — navigation, the landing page,
 * about, services, contact, the team page, errors and the shared UI — is
 * translated, and the deeper authenticated flows (the marketplace queues,
 * proposal builder, insurance intake) fall back to English until somebody who
 * speaks the language reviews them.
 *
 * That is a deliberate trade. The alternative is "translate all 1,035 strings
 * or ship none", and the answer to that is always none — meanwhile a Turkish
 * visitor gets an entirely English site. Here they get a Turkish one, with
 * English where the work has not reached yet.
 *
 * NOT reviewed by a native speaker. Before this is used commercially, the
 * marketing copy in particular (home, about, services) wants a pass from
 * somebody who writes Turkish professionally — a translation that is merely
 * correct still reads like a translation.
 */
const tr: PartialTranslations = {
  common: {
    brand: 'Rayan Tamaddon Jahan Gostar | CiviTech Global',
    legalName: 'Rayan Tamaddon Jahan Gostar',
    loading: 'Yükleniyor...',
    error: 'Bir şeyler ters gitti',
    retry: 'Yeniden dene',
    save: 'Kaydet',
    cancel: 'Vazgeç',
    edit: 'Düzenle',
    delete: 'Sil',
    view: 'Görüntüle',
    close: 'Kapat',
    search: 'Ara',
    filter: 'Filtrele',
    all: 'Tümü',
    submit: 'Gönder',
    back: 'Geri',
    next: 'İleri',
    previous: 'Önceki',
    page: 'Sayfa',
    of: '/',
    noResults: 'Sonuç bulunamadı',
    comingSoon: 'Yakında',
    yes: 'Evet',
    no: 'Hayır',
    file: {
      preview: 'Dosyayı görüntüle',
      download: 'İndir',
      notPreviewable: 'Bu dosya türü tarayıcıda gösterilemiyor. Açmak için indirin.',
    },
    date: {
      choose: 'Tarih seçin',
      today: 'Bugün',
      clear: 'Tarihi temizle',
      jalali: 'İran takvimi',
      gregorian: 'Miladi takvim',
    },
  },

  nav: {
    insurance: 'Sigorta',
    track: 'Talep takibi',
    marketplaceMenu: 'Pazar yeri',
    jobs: 'İş ilanları',
    freelance: 'Serbest projeler',
    team: 'Ekibimiz',
    home: 'Ana sayfa',
    servicesMenu: 'Hizmetler',
    companyMenu: 'Kurumsal',
    about: 'Hakkımızda',
    services: 'Hizmetler',
    startProject: 'Proje başlatın',
    joinUs: 'CV gönderin',
    contact: 'İletişim',
    login: 'Giriş',
    register: 'Kayıt ol',
    dashboard: 'Panel',
    admin: 'Yönetim',
    logout: 'Çıkış',
    profile: 'Profil',
    viewSite: 'Siteyi görüntüle',
  },

  theme: { light: 'Açık tema', dark: 'Koyu tema' },

  home: {
    heroEyebrow: 'Yazılım mühendisliği şirketi',
    heroTitle: 'Kamu teknolojisinin geleceğini inşa ediyoruz',
    heroCtaPrimary: 'Ne yapıyoruz',
    heroCtaSecondary: 'Bize ulaşın',
    whatWeDoTitle: 'Ne yapıyoruz',
    whatWeDoSubtitle: 'Mimariden dağıtıma ve desteğe kadar yazılım mühendisliği',
    feature0Title: 'Özel yazılım geliştirme',
    feature0Desc: 'Danışmanlıktan devreye almaya kadar, iş akışlarınıza ve hedeflerinize göre kurulan uygulamalar.',
    feature1Title: 'Web ve mobil uygulamalar',
    feature1Desc: 'Hızlı, ölçeklenebilir ve kullanımı kolay web ile mobil deneyimler.',
    feature2Title: 'Kamu teknolojisi platformları',
    feature2Desc: 'Kurumlar, kuruluşlar ve hizmet verdikleri insanlar arasındaki mesafeyi kapatan platformlar.',
    feature3Title: 'Veri ve analitik',
    feature3Desc: 'Ham veriyi, kararları kolaylaştıran panolara ve içgörüye dönüştürmek.',
    howWeWorkTitle: 'Nasıl çalışıyoruz',
    howWeWorkSubtitle: 'Açık kaynak, topluluk odaklı ve yeni başlayanlara açık',
    work0Title: 'Açık kaynak',
    work0Desc: 'Ürettiklerimizin çoğunu açık biçimde yayımlıyoruz; başkaları üzerine inşa edebilsin diye.',
    work1Title: 'Topluluk odaklı',
    work1Desc: 'Ekiplerimiz tanımlı rollerle, dünya çapında bir katkıcı topluluğuyla birlikte çalışır.',
    work2Title: 'Mühendis yetiştirmek',
    work2Desc: 'Sektöre giden yolu yeni mezunlara ve kariyer değiştirenlere açık tutuyoruz.',
    alsoTitle: 'Mühendisliğin yanı sıra',
    alsoInsuranceTitle: 'Sigorta hizmetleri',
    alsoInsuranceCta: 'Sigortalara göz atın',
    ctaTitle: 'Aklınızda bir proje mi var?',
    ctaSubtitle: 'Birlikte çalışmak, teknik danışmanlık ya da ekibe katılmak için bize yazın.',
  },

  about: {
    title: 'Hakkımızda',
    subtitle: 'İnsanlar için hayatı, kurumlar için işi kolaylaştıran yazılımlar geliştiriyoruz.',
    missionTitle: 'Misyonumuz',
    visionTitle: 'Vizyonumuz',
    valuesTitle: 'Değerlerimiz',
    value1Title: 'Yenilikçilik',
    value1Desc: 'Bir sorunu kökünden anlar, sonra ona yeni bir çözüm kurarız.',
    value2Title: 'Şeffaflık',
    value2Desc: 'İşimizi, kararlarımızı ve sınırlarımızı olduğu gibi anlatırız.',
    value3Title: 'Topluluk',
    value3Desc: 'Tek başımıza değil, açık biçimde ve başkalarıyla birlikte geliştiririz.',
    value4Title: 'Ustalık',
    value4Desc: 'Hızlı çıkarmaktansa iyi mühendislik yapmayı tercih ederiz.',
    legalNote: 'CiviTech Global, Rayan Tamaddon Jahan Gostar şirketinin uluslararası markasıdır.',
  },

  services: {
    title: 'Neler geliştiriyoruz',
    subtitle: 'Merkezde yazılım mühendisliği, yanında birkaç hizmet',
    groupSoftwareTitle: 'Yazılım geliştirme',
    groupSoftwareSubtitle: 'Fikirden lansmana özel yazılım çözümleri',
    groupInsuranceTitle: 'Sigorta hizmetleri',
    software1Title: 'Özel yazılım geliştirme',
    software1Desc: 'Danışmanlıktan devreye almaya kadar, iş akışlarınıza göre kurulan uygulamalar.',
    software2Title: 'Web ve mobil uygulamalar',
    software2Desc: 'Hızlı, ölçeklenebilir ve kullanımı kolay web ile mobil deneyimler.',
    software3Title: 'Kamu teknolojisi platformları',
    software3Desc: 'Kurumlar, kuruluşlar ve hizmet verdikleri insanlar arasında köprü kuran platformlar.',
    software4Title: 'Veri ve analitik',
    software4Desc: 'Ham veriyi, kararları kolaylaştıran panolara ve içgörüye dönüştürmek.',
    service1Title: 'Bireysel sigorta danışmanlığı',
    service1Desc: 'İhtiyacınıza en uygun planı seçmeniz için uzman rehberliği.',
    service2Title: 'Çevrim içi sigorta talepleri',
    service2Desc: 'Doğrulanmış telefon numarası ve takip koduyla bu siteden başvurun.',
    service3Title: 'Çevrim içi talep takibi',
    service3Desc: 'Talebinizin durumunu kullanıcı panelinizden görün.',
    service4Title: 'Özel destek',
    service4Desc: 'Destek ekibimiz sorularınızı yanıtlamaya hazır.',
  },

  contact: {
    title: 'Bize ulaşın',
    subtitle: 'Bir sorunuz mu var? Yardımcı olmaktan memnuniyet duyarız.',
    formName: 'Ad soyad',
    formEmail: 'E-posta',
    formMessage: 'Mesajınız',
    formSubmit: 'Mesajı gönder',
    formNote:
      'Size bir takip kodu verilecek. Yanıtı, kodu bu sayfaya girdiğinizde görürsünüz.',
    formSuccess: 'Mesajınız alındı.',
    formSubject: 'Konu',
    formEmailHint: 'Mesajınızı tanımlamak içindir; yanıt e-posta ile gönderilmez.',
    issuedTitle: 'Mesajınız alındı',
    issuedBody: 'Bu takip kodunu saklayın. Yanıtı okumak için bu sayfaya girin.',
    issuedWarning: 'Bu kod yalnızca bir kez gösterilir. Bir yere not edin.',
    copyCode: 'Takip kodunu kopyala',
    codeCopied: 'Takip kodu kopyalandı.',
    sendAnother: 'Başka bir mesaj gönder',
    trackTitle: 'Mesaj takibi',
    trackBody: 'Durumu ve varsa yanıtı görmek için takip kodunuzu girin.',
    trackPlaceholder: '10 karakterlik kod',
    trackNotFound: 'Bu koda ait bir mesaj bulunamadı.',
    noSubject: 'Konu yok',
    noReplyYet: 'Henüz yanıt yok. Kısa süre içinde bakacağız.',
    staffReply: 'Destek',
    statuses: { OPEN: 'Yanıt bekliyor', ANSWERED: 'Yanıtlandı', CLOSED: 'Kapatıldı' },
    infoTitle: 'İletişim',
    infoBody:
      'Bir e-posta adresi yayımlamıyoruz. Mesajınızı formdan gönderin ve yanıtı takip kodunuzla okuyun.',
    trackingCode: 'Takip kodu',
  },

  team: {
    title: 'Ekibimiz',
    subtitle: 'Bunu inşa eden insanlar.',
    empty: 'Henüz ekip üyesi eklenmedi.',
    emailLabel: 'E-posta',
    websiteLabel: 'Web sitesi',
  },

  errors: {
    notFoundTitle: 'Sayfa bulunamadı',
    notFoundBody: 'Aradığınız sayfa mevcut değil.',
    goHome: 'Ana sayfaya dön',
    networkError: 'Sunucuya ulaşılamadı',
    unauthorized: 'Yetkisiz erişim',
    endpointUnavailable: 'Bu bölüm sunucuda henüz hazır değil.',
  },

  footer: {
    tagline: 'Teknoloji ve güven üzerine kurulu dijital sigorta çözümleri.',
    links: 'Hızlı bağlantılar',
    legal: 'Yasal',
    privacy: 'Gizlilik politikası',
    terms: 'Kullanım koşulları',
    rights: 'Tüm hakları saklıdır.',
    credit: 'Rayan Tamaddon Jahan Gostar bünyesinden Mohammad Khalilzadeh tarafından tasarlanmış ve geliştirilmiştir',
  },
};

export default tr;
