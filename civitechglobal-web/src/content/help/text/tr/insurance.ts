import type { HelpArticleText } from '../../types';

const insurance: Record<string, HelpArticleText> = {
  insurance: {
    title: 'Sigorta',
    summary: 'İlgilendiğimiz tüm sigorta türleri: ihtiyacınız olanı bulun ve çevrim içi başvurun.',
    heading: 'Poliçe seçiminden uzmanın aramasına',
    intro:
      'Çevrim içi sigorta başvurusu ek hizmetlerimizden biridir; çünkü çalışma arkadaşlarımızın ve müşterilerimizin maddi güvenliği, can güvenliği ve huzuru bizim için önemlidir. Bu sayfa başvurusunu aldığımız tüm sigortaları listeler: otomobil ve motosiklet için zorunlu trafik ve kaskodan tamamlayıcı sağlık, hayat, ferdi kaza, sorumluluk, nakliyat, mühendislik tüm riskler ve cep telefonu sigortasına kadar. Her birinin kendi formu vardır; başvurduktan sonra bir uzman, ihtiyacınıza ve bütçenize en uygun seçeneği sunmak için sizi arar.',
    steps: [
      ['Sigortayı bulun', 'Listeye göz atın veya adıyla arayın. Kurumsal poliçelerde Kurumsal etiketi bulunur.'],
      ['Sayfasını okuyun', 'Her sigorta sayfasında teminatlar, kapsam dışı olanlar, gerekli belgeler ve primi etkileyen unsurlar yer alır.'],
      ['Formu doldurun', 'Poliçe bilgilerini ve iletişim bilgilerinizi girin; cep telefonu numaranızı altı haneli bir kodla doğrulayın.'],
      ['Takip kodunu saklayın', 'Başvurudan sonra takip kodunu saklayın; talebin durumunu ve kararlaştırılan arama zamanını bu kodla görün.'],
    ],
    points: [
      ['Çevrim içi başvuru', 'Çevrim içi başvuru etiketli poliçelerde gereken her şeyi formda verirsiniz.'],
      ['Uzman fiyatlandırır', 'Uzman fiyatlandırır etiketli poliçeler telefonda fiyatlandırılır; temel bilgileri verirsiniz, uzman sizi arar.'],
      ['Sitede fiyat yok', 'Prim bilgilerinize bağlıdır; uzman incelemeden sonra seçenekleri ve fiyatı bildirir.'],
    ],
    faqs: [
      ['Sigortayı burada satın alıp ödeyebilir miyim?', 'Hayır. Burada talebi gönderirsiniz; uzmanımız sizi arar, seçenekleri değerlendirir ve poliçenin düzenlenmesini ayarlar.'],
      ['Sitede neden fiyat göremiyorum?', 'Prim; araç, geçmişiniz ve seçtiğiniz teminatlar gibi unsurlara bağlıdır. Bu unsurlar her poliçenin sayfasında yazar ve kesin fiyatı uzman verir.'],
      ['Numaramı neden doğrulamam gerekiyor?', 'Numara, uzmanın size ulaşma yoludur; doğrulamak yazım hatalarını önler.'],
      ['Sigorta başvurusu için hesap gerekir mi?', 'Hayır. Ama giriş yapmışsanız takip kodu Taleplerim altında saklanır.'],
      ['İstediğim sigorta listede yok.', 'İletişim sayfasından sorun; size en yakın seçeneği öneririz.'],
    ],
    related: {
      'insurance-product': 'Her poliçenin kendi sayfası ve formu.',
      track: 'Sigorta talebini koduyla izleyin.',
      'my-requests': 'Üyeler için: tüm talepler tek listede.',
      blog: 'Sigorta fiyatları ve satın alma ipuçları rehberleri.',
    },
  },

  'insurance-product': {
    title: 'Bir sigorta poliçesinin sayfası ve formu',
    summary: 'Bir poliçenin ayrıntıları ve kendi formu: teminatlar, istisnalar, belgeler, fiyat etkenleri ve başvuru.',
    intro:
      'Her poliçenin kendi sayfası vardır. Bir bakışta bölümü özeti verir; ardından teminatlar ve isteğe bağlı teminatlar, kapsam dışı olanlar, gerekli belgeler, primi etkileyen unsurlar ve hasar durumunda yapılacaklar gelir. Başvuru formu aynı sayfadadır ve alanları o poliçeye özeldir.',
    steps: [
      ['Poliçe bilgileri', 'Bu poliçeye özel alanları doldurun; doğru fiyat için gereklidir.'],
      ['İletişim bilgileri', 'Adınızı ve size nasıl ulaşılacağını girin; poliçeyi ayarlamak ve göndermek için sizi ararız.'],
      ['Numaranızı doğrulayın', 'Cep telefonunuzu altı haneli kodla doğrulayın; doğrulama olmadan talep gönderilemez.'],
      ['Gönderin ve kodu saklayın', 'Talebi gönderin ve takip kodunu saklayın.'],
    ],
    tips: [
      ['Başvurmadan önce istisnaları okuyun', 'Kapsam dışı listesi teminatlar kadar önemlidir ve hasar anında hayal kırıklığını önler.'],
      ['Belgeleri hazır tutun', 'Uzman aramadan önce gerekli belgeleri hazırlayın; poliçe daha hızlı düzenlenir.'],
    ],
    faqs: [
      ['Başvurduktan sonra ne olur?', 'Bir uzman seçenekleri görüşmek için en kısa sürede sizi arar; kararlaştırılan arama zamanı takip sayfasında görünür.'],
      ['“Uzman fiyatlandırır” ne demek?', 'Bu poliçeyi bir uzman fiyatlandırır; sizi iyi bilgilenmiş olarak arayabilmesi için temel bilgileri verirsiniz.'],
      ['Doğrulama kodu bana ulaşmadı.', 'Biraz bekleyip Yeniden gönder’e basın ya da numarayı kontrol edip Numarayı değiştir ile düzeltin.'],
      ['Bilgilerim nerede gösterilir?', 'Takip sayfası yalnızca talebin durumunu gösterir, kişisel bilgilerinizi değil.'],
    ],
    related: {
      insurance: 'Tüm sigortaların listesine dönün.',
      track: 'Talebi koduyla izleyin.',
      'my-requests': 'Üyeler için: kodlarınız tek listede.',
    },
  },
};

export default insurance;
