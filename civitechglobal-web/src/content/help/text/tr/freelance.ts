import type { HelpArticleText } from '../../types';

const freelance: Record<string, HelpArticleText> = {
  projects: {
    title: 'Serbest projeler',
    summary: 'Doğrulanmış işverenlerden sabit fiyatlı ve saatlik projeler: bir proje bulun, teklif gönderin ve işi yürütün.',
    intro:
      'İşverenler burada proje yayınlar, serbest çalışanlar teklif gönderir. Her proje yayımlanmadan önce incelenir ve sabit fiyatlı ya da saatlik olabilir. Projelere herkes göz atabilir; ancak proje yayınlamak veya teklif göndermek için giriş yapmanız ve kimlik doğrulamasını tamamlamanız gerekir. Ödeme site üzerinden yapılmaz; işveren ve serbest çalışan bunu doğrudan kendi aralarında ayarlar.',
    steps: [
      ['Bir proje bulun', 'Başlık, açıklama veya becerilerde arayın; kategoriye, fiyat türüne, deneyim düzeyine veya en az teklife göre sıralayın ve süzün.'],
      ['Projeyi okuyun', 'Bütçeyi, süreyi, becerileri ve işverenin geçmişini (doğrulanmış olup olmadığı, işe alım oranı ve puanı) görün.'],
      ['Teklif gönderin', 'Fiyatınızı veya saatlik ücretinizi, teslim süresini ve aşamalı ödeme planını yazın; işverenin sorularını yanıtlayın.'],
      ['İşi yürütün', 'İşe alınırsanız iş birliği İş birliklerim altında açılır; görüşme ve aşamalar panelinizde devam eder.'],
    ],
    points: [
      ['Sabit fiyat veya saatlik', 'Saatlik projelerde çalışma saatlerinizi kaydedersiniz, işveren onaylar.'],
      ['Aşamalı ödemeler', 'İşi her biri tutarı ve süresi olan aşamalara bölün; aşamaların toplamı teklifinize eşit olmalıdır.'],
      ['NDA', 'Bazı projelerde açıklamayı ve ekleri okumadan önce gizlilik sözleşmesi imzalamanız gerekir.'],
      ['Proje görünürlüğü', 'Bir proje herkese, yalnızca üyelere veya yalnızca davet edilen serbest çalışanlara görünür olabilir.'],
    ],
    tips: [
      ['Proje bildirimi kurun', 'Aramanız için bir bildirim oluşturun; eşleşen yeni projeleri kaçırmayın.'],
    ],
    faqs: [
      ['Site parayı tutuyor veya ödemeye aracılık ediyor mu?', 'Hayır. Ödeme site üzerinden yapılmaz; işveren ve serbest çalışan tutarı ve yöntemi doğrudan kararlaştırır. Aşamalı plan bu anlaşmayı net tutmaya yardım eder.'],
      ['Neden doğrulama gerekiyor?', 'Proje yayınlamak, teklif göndermek veya NDA imzalamak için. İki taraf da gerçek bir kişiyle muhatap olduğunu bilir.'],
      ['Projem ne zaman yayımlanır?', 'İncelemeye gönderdikten sonra genellikle birkaç saat içinde.'],
      ['Kaç teklif gönderebilirim?', 'Her proje için bir teklif; işveren karar vermeden önce geri çekebilirsiniz.'],
    ],
    related: {
      'project-detail': 'Her projenin sayfası ve teklif formu.',
      'client-projects': 'İşverenler için: proje yayınlama ve yönetme.',
      'my-proposals': 'Serbest çalışanlar için: teklifler, davetler ve iş birlikleri.',
      freelancers: 'Projenize davet edebileceğiniz serbest çalışanlar.',
    },
  },

  'project-detail': {
    title: 'Bir proje sayfası',
    summary: 'Bir projenin ayrıntıları, işverenin geçmişi ve teklif formu.',
    intro:
      'Her proje sayfası açıklamayı, bütçeyi veya saatlik ücret aralığını, süreyi, istenen deneyim düzeyini, becerileri ve işverenin geçmişini gösterir. Proje NDA gerektiriyorsa tam açıklama ve ekler imzaladığınızda açılır. İşveren sizi davet ettiyse Davet edildi etiketi görünür.',
    steps: [
      ['Okuyun, sonra karar verin', 'Teklif yazmadan önce bütçeye, süreye ve işverenin sorularına bakın.'],
      ['Gerekirse NDA’yı imzalayın', 'Açıklamayı ve dosyaları açmak için adınızı imza olarak girin.'],
      ['Teklifinizi yazın', 'Fiyatınız veya saatlik ücretiniz, aşama planı, teslim süresi ve soruların yanıtları.'],
      ['Yanıtı bekleyin', 'Teklifin durumunu Tekliflerim altında görün; işverenin mesajları Mesajlar’a gelir.'],
    ],
    tips: [
      ['Bu projeye özel teklif yazın', 'Bu projenin sorununa değinin ve işverenin sorularını tam yanıtlayın; genel teklifler daha az seçilir.'],
    ],
    faqs: [
      ['NDA imzalamak beni neye bağlar?', 'Proje açıklamasını, ekleri ve işverenin proje hakkında size söylediği her şeyi gizli tutmaya.'],
      ['Bir daveti reddedebilir miyim?', 'Evet, Daveti reddet ile. İşverene bildirilir.'],
      ['Proje kapanırsa ne olur?', 'Kapanan proje yeni teklif kabul etmez; önceki teklifler listenizde kalır.'],
    ],
    related: {
      projects: 'Tüm projelere dönün.',
      'my-proposals': 'Gönderdiğiniz teklifler.',
      verification: 'Teklif göndermeden önce gerekir.',
      messages: 'İşverenle konuşma.',
    },
  },

  'freelance-services': {
    title: 'Serbest hizmetler',
    summary: 'Belirli fiyatlı hazır işler: bir paket seçin ve sipariş verin.',
    intro:
      'Serbest hizmetler projelerin tersine işler: serbest çalışan yaptığı işi belirli bir fiyat ve teslim süresiyle sunar, siz sipariş verirsiniz. Her hizmetin üç pakete kadar seçeneği olabilir: Temel, Standart ve Premium. Her hizmet yayımlanmadan önce incelenir.',
    steps: [
      ['Bir hizmet bulun', 'Kategoriye, fiyata veya puana göre arayın ve sıralayın.'],
      ['Bir paket seçin', 'Her paketin neleri kapsadığını ve teslimin ne kadar sürdüğünü karşılaştırın.'],
      ['Sipariş verin', 'Giriş yapıp doğrulandıktan sonra siparişi ihtiyacınızı anlatarak gönderin.'],
      ['Satıcıyı bekleyin', 'Satıcı siparişi kabul eder veya reddeder; durumu panelinizde Siparişler altında izleyin.'],
    ],
    faqs: [
      ['Ödeme nasıl yapılır?', 'Site üzerinden değil; sipariş kabul edildikten sonra alıcı ve satıcı doğrudan ayarlar.'],
      ['Hizmetin projeden farkı nedir?', 'Projede işi siz tanımlar ve teklif alırsınız; hizmette serbest çalışan hazır işi belirli bir fiyatla sunar.'],
      ['Kendi hizmetimi nasıl sunarım?', 'Panelinizde Hizmetlerim altında bir hizmet oluşturup incelemeye gönderin.'],
    ],
    related: {
      'my-services': 'Satıcılar için: hizmet oluşturma ve siparişleri yönetme.',
      freelancers: 'Satıcıların profilleri.',
      projects: 'İhtiyacınız hazır değilse ve anlatılması gerekiyorsa proje yayınlayın.',
    },
  },

  freelancers: {
    title: 'Serbest çalışanlar ve profiller',
    summary: 'Serbest çalışanları beceri, dil ve müsaitliğe göre bulun, profillerini okuyun ve davet edin.',
    intro:
      'Serbest çalışanlar dizini, kullanıcı adı olan ve profilinde beceri listeleyen ya da etkin ve onaylanmış bir hizmet sunan üyelerin herkese açık profillerini gösterir: becerileri, dilleri, ülkesi, müsaitliği, puanları ve iş örnekleri. İletişim bilgileri dizinde asla gösterilmez.',
    steps: [
      ['Arayın', 'Beceri, kategori, dil, ülke, müsaitlik veya doğrulamaya göre süzün; puana göre sıralayın.'],
      ['Bir profili okuyun', 'Doğrulama rozeti, puanlar, iş örnekleri ve sunduğu hizmetler.'],
      ['Davet edin', 'İşverenler bir serbest çalışanı kullanıcı adıyla projelerine teklif göndermeye davet edebilir.'],
    ],
    faqs: [
      ['Bu dizinde nasıl görünürüm?', 'Panelinizde bir kullanıcı adı seçip becerilerinizi ekleyin ya da onaylanan bir hizmet sunun. İş örnekleri davet alma olasılığını artırır.'],
      ['Profildeki doğrulama rozeti ne anlama gelir?', 'Bu üyenin kimliğinin ekibimizce doğrulandığı anlamına gelir.'],
      ['Puanlar nereden gelir?', 'Bu üyeyle iş birliği bittiğinde onu değerlendiren kişilerden.'],
    ],
    related: {
      profile: 'Kendi herkese açık profilinizi oluşturma ve düzenleme.',
      'freelance-services': 'Serbest çalışanların sunduğu hizmetler.',
      projects: 'Teklif gönderebileceğiniz projeler.',
    },
  },
};

export default freelance;
