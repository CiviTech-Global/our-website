import type { HelpArticleText } from '../../types';

const marketplace: Record<string, HelpArticleText> = {
  marketplace: {
    title: 'Yerel pazar',
    summary: 'Yakınınızdaki dükkânları, ürünleri ve hizmetleri haritada bulun ve dükkânla doğrudan iletişime geçin.',
    intro:
      'Yerel pazar çevrenizdeki dükkânları ve işletmeleri bir haritada gösterir: ürünleri, hizmetleri, görselleri ve iletişim yolları. Şimdilik bir vitrindir, çevrim içi mağaza değil; satın alma, rezervasyon ve ayarlama doğrudan dükkânla yapılır.',
    steps: [
      ['Noktanızı belirleyin', 'Konumunuza erişim izni verin ya da aramanın o noktada yapılması için haritaya tıklayın.'],
      ['Arayın', 'Dükkân adı, meslek ya da aradığınız ürün veya hizmeti arayın; arama yarıçapını belirleyin ve sıralamak için En yakın’ı seçin.'],
      ['Bir dükkânı veya ürünü açın', 'Tanıtımı, görselleri, ürün ve hizmetleri ve haritadaki konumu görün.'],
      ['İletişime geçin', 'Satın almak veya rezervasyon için o dükkânın iletişim bilgilerini kullanın.'],
    ],
    tips: [
      ['Konum kullanılamıyor mu?', 'Tarayıcılar konumu yalnızca güvenli bağlantıda paylaşır ve izin vermemiş olabilirsiniz; bu durumda haritada bir nokta seçin.'],
    ],
    faqs: [
      ['Burada satın alıp ödeyebilir miyim?', 'Henüz değil. Sepet ve çevrim içi ödeme açık değil; dükkânla iletişime geçin.'],
      ['Dükkânlar kontrol ediliyor mu?', 'Evet. Her dükkân sahibi kimliğini doğrulamıştır ve her dükkân görünmeden önce incelenir.'],
      ['Dükkânım burada yok.', 'Dükkânını ekle sayfasından dört adımda ekleyin.'],
    ],
    related: {
      'marketplace-join': 'Kendi dükkânınızı ekleme.',
      'my-shops': 'Satıcılar için: dükkânınızı ve ürünlerinizi yönetme.',
    },
  },

  'marketplace-join': {
    title: 'Dükkânını ekle',
    summary: 'Dükkânınızı dört adımda ekleyin; yakındaki müşteriler onu haritada bulsun.',
    intro:
      'Yakınındaki müşterilere ürün veya hizmet sunan her işletme dükkânını ekleyebilir. Dükkân bir ticari kimlik olduğu ve alıcılar arkasında kimin olduğunu bilmeli olduğu için kimlik doğrulaması gerekir ve dükkân görünmeden önce incelenir. Onaylandıktan sonra ürün ve hizmetlerinizi kendiniz yayımlar ve düzenlersiniz.',
    steps: [
      ['Hesap oluşturun', 'Kaydolun veya giriş yapın.'],
      ['Kimliğinizi doğrulayın', 'Kimliğinizi panelinizde doğrulayın.'],
      ['Dükkânı oluşturun', 'Adı, tanıtımı, mesleği, logoyu, görseli, iletişim bilgilerini ve konumu girin, incelemeye gönderin.'],
      ['Ürün ve hizmet ekleyin', 'Dükkân onaylandıktan sonra ürün ve hizmetlerinizi yayımlayın, düzenleyin ve kaldırın.'],
    ],
    tips: [
      ['Konumunuzu haritaya ekleyin', 'Konum olmadan dükkânınız “yakınımda” aramalarında görünmez.'],
    ],
    faqs: [
      ['İnceleme ne kadar sürer?', 'İnceleme kuyruğuna bağlıdır. İnceleyen değişiklik isterse panelinizde bildirilir ve düzelttikten sonra yeniden gönderirsiniz.'],
      ['Ürünler de inceleniyor mu?', 'Dükkân onaylandıktan sonra ürünler hemen yayımlanır, ancak personel herhangi bir ürünü düzeltme için geri gönderebilir.'],
    ],
    related: {
      marketplace: 'Pazarın alıcı gözünden görünümü.',
      'my-shops': 'Eklendikten sonra dükkânınızı yönetme.',
      verification: 'İkinci adım: kimlik doğrulaması.',
    },
  },
};

export default marketplace;
