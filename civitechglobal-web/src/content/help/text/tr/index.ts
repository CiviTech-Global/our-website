import type { HelpLibraryText } from '../../types';
import company from './company';
import insurance from './insurance';
import consult from './consult';
import jobs from './jobs';
import freelance from './freelance';
import books from './books';
import marketplace from './marketplace';
import account from './account';

const tr: HelpLibraryText = {
  collections: {
    company: { title: 'Şirket ve yazılım hizmetleri', description: 'Rayan Tamaddon Jahan Gostar’ı tanıyın: yazılım geliştirme hizmetleri, proje talebi, iletişim ve bizimle çalışma.' },
    insurance: { title: 'Sigorta', description: 'Çevrim içi sigorta başvurusu, her ürün için ayrı form ve takip koduyla izleme.' },
    consult: { title: 'Danışmanlık ve uzmanlar', description: 'Teknik veya kariyer danışmanlığı isteyin ve uzmanlar kulübünü tanıyın.' },
    jobs: { title: 'İş ilanları', description: 'İş arayın ve başvurun, şirket sayfalarına göz atın, ilan verin.' },
    freelance: { title: 'Serbest projeler', description: 'Proje yayınlayın, teklif gönderin; hazır hizmetler ve serbest çalışanlar dizini.' },
    books: { title: 'Kitap pazarı', description: 'Üyeler arasında yeni ve ikinci el kitap alım satımı.' },
    marketplace: { title: 'Yerel pazar', description: 'Haritada yerel mağazalar ve ürünler; mağazanızı listeleyin.' },
    account: { title: 'Hesabınız', description: 'Kayıt, giriş, şifre sıfırlama ve e-posta onayı.' },
  },
  articles: {
    ...company,
    ...insurance,
    ...consult,
    ...jobs,
    ...freelance,
    ...books,
    ...marketplace,
    ...account,
  },
};

export default tr;
