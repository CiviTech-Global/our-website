import type { HelpArticleText } from '../../types';

const books: Record<string, HelpArticleText> = {
  books: {
    title: 'Kitap pazarı',
    summary: 'Okurlardan ve kitapçılardan yeni ve ikinci el kitaplar: bir kitabın tüm nüshaları tek sayfada.',
    intro:
      'Kitap pazarında her kitabın tek bir sayfası vardır ve satışa sunulan tüm nüshaları en ucuzdan başlayarak bu sayfada bir arada görünür. Her nüsha bir satıcıya aittir; durumunu (Yeni’den Kabul edilebilir’e), fotoğraflarını, fiyatını, kargo ücretini ve teslim yöntemini görürsünüz. Satın alma bir satın alma talebiyle başlar; site üzerinden ödeme yapılmaz, alıcı ve satıcı ödemeyi ve teslimatı doğrudan ayarlar.',
    steps: [
      ['Kitabı bulun', 'Arayın veya raflara göz atın; duruma, fiyata, ücretsiz kargoya veya kapak fiyatının altında olmaya göre süzün.'],
      ['Bir nüsha seçin', 'Kitabın sayfasında nüshaları durum, fotoğraf, fiyat ve teslim yöntemine göre karşılaştırın.'],
      ['Satın alma talebi gönderin', 'Teslim yöntemini seçin ve isterseniz fiyat önerin; giriş yapmış ve doğrulanmış olmanız gerekir.'],
      ['Teslimatı ayarlayın', 'Satıcı kabul ettiğinde ödemeyi ve teslimatı o talebin görüşmesinde ayarlayın.'],
    ],
    points: [
      ['Derecelendirilmiş durum', 'Her nüshanın fotoğraflı beş dereceden biri vardır: Yeni, Yeni gibi, Çok iyi, İyi veya Kabul edilebilir.'],
      ['Kitap satmak', 'Nüshanızı panelinizden fotoğraf, durum ve fiyatla listeleyin; yayımlanmadan önce incelenir.'],
      ['İki yönlü değerlendirme', 'Satıştan sonra alıcı ve satıcı birbirini değerlendirir.'],
    ],
    tips: [
      ['Fiyat önermek', 'Bir nüshanın fiyatı pazarlığa açıksa kendi fiyatınızı önerebilirsiniz; satıcının fiyatını kabul etmek için boş bırakın.'],
    ],
    faqs: [
      ['Siteye mi ödeme yapıyorum?', 'Hayır. Site üzerinden ödeme yapılmaz; talebiniz kabul edildikten sonra ödemeyi ve teslimatı doğrudan satıcıyla ayarlarsınız.'],
      ['Satın almak için neden kimlik doğrulamam gerekiyor?', 'Satıcının gerçek bir kişiyle muhatap olduğunu bilmesi için; aynı kural satıcılar için de geçerlidir.'],
      ['Nasıl kitap satarım?', 'Panelinizde Satıştaki kitaplarım altında nüshanızı fotoğraf, durum ve fiyatla listeleyip incelemeye gönderin.'],
      ['Satıcı talebimi reddetti.', 'Aynı kitabın başka bir nüshasını farklı bir satıcıdan isteyebilirsiniz.'],
    ],
    related: {
      'my-books': 'Panelinizden kitap satma ve alımları izleme.',
      messages: 'Alıcı veya satıcıyla konuşma.',
      verification: 'Alım ve satım için gerekir.',
    },
  },
};

export default books;
