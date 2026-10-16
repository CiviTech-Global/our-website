import type { HelpArticleText } from '../../types';

const account: Record<string, HelpArticleText> = {
  login: {
    title: 'Giriş',
    summary: 'E-posta ve parolanızla giriş yapın; iki adımlı giriş açıksa doğrulama uygulamanızın kodu da istenir.',
    intro:
      'Giriş yaptığınızda panelinize erişirsiniz: profil, kimlik doğrulama, takip kodları, mesajlar ve pazar yeri etkinliğiniz. İki adımlı girişi açtıysanız parolanızdan sonra doğrulama uygulamanızdaki altı haneli kod (veya kurtarma kodlarınızdan biri) istenir.',
    steps: [
      ['E-posta ve parola', 'Kaydolduğunuz e-posta adresini kullanın.'],
      ['Açıksa iki adımlı kod', 'Doğrulama uygulamanızdaki altı haneli kodu veya bir kurtarma kodunu girin.'],
      ['Kaldığınız yerden devam edin', 'Girişe bir ilan gibi bir sayfadan geldiyseniz sonra oraya dönersiniz.'],
    ],
    faqs: [
      ['Parolamı unuttum.', '“Parolanızı mı unuttunuz?” bağlantısını kullanın. E-posta gönderilemiyorsa sayfa sizi iletişim formuna yönlendirir.'],
      ['Doğrulama uygulamama erişemiyorum.', 'İki adımlı girişi açarken kaydettiğiniz kurtarma kodlarından birini girin. Her kod bir kez çalışır.'],
      ['Tüm cihazlardan nasıl çıkış yaparım?', 'Profilinizin güvenlik bölümünde Her yerden çıkış yap’ı seçin.'],
    ],
    related: {
      register: 'Henüz hesabınız yok mu?',
      'password-reset': 'Parolanızı sıfırlama.',
      dashboard: 'Giriş yaptıktan sonra sizi bekleyenler.',
    },
  },

  register: {
    title: 'Kayıt ol',
    summary: 'İlan ve proje yayınlamak, teklif göndermek, kitap satmak ve takip kodlarınızı tek yerde tutmak için hesap oluşturun.',
    intro:
      'Proje, sigorta veya danışmanlık talebi, CV gönderme ya da bize ulaşmak için hesap gerekmez. Hesap, kimliğinizin önemli olduğu işler içindir: iş ilanı veya proje yayınlamak, teklif göndermek, işe başvurmak, kitap alıp satmak ve dükkân eklemek. Takip kodlarınız da Taleplerim altında bir arada kalır.',
    steps: [
      ['Temel bilgiler', 'Adınızı, soyadınızı, e-postanızı ve bir parola girin.'],
      ['Panelinize geçin', 'Kaydolduktan sonra hemen giriş yapmış olursunuz.'],
      ['Doğrulamayı tamamlayın', 'Pazar yeri etkinlikleri için kimliğinizi panelinizden doğrulayın.'],
    ],
    faqs: [
      ['Kayıt ücretli mi?', 'Hayır.'],
      ['Kaydolduktan sonra neden kimliğimi de doğrulamam gerekiyor?', 'Kayıt bir hesap oluşturur; doğrulama hesabın arkasında gerçek bir kişi olduğunu onaylar. Alım satım, işe alım ve projeler için gerekir.'],
      ['Parola kuralları nelerdir?', 'Parola alanının altında gösterilir; uzun ve benzersiz bir parola seçin.'],
    ],
    related: {
      login: 'Zaten hesabınız varsa.',
      'verify-email': 'E-postanızı onaylama.',
      verification: 'Kayıttan sonra kimlik doğrulaması.',
    },
  },

  'password-reset': {
    title: 'Parola sıfırlama',
    summary: 'Parolanızı unuttuysanız bir sıfırlama bağlantısı isteyin ve yeni bir parola belirleyin.',
    intro:
      'Parola sıfırlama sayfasında hesabınızın e-postasını girersiniz ve size bir sıfırlama bağlantısı gönderilir; bağlantıyı açarak yeni bir parola belirlersiniz. Site o anda e-posta gönderemiyorsa sayfa bunu açıkça söyler ve yardım için sizi iletişim formuna yönlendirir.',
    steps: [
      ['E-postanızı girin', 'Kaydolduğunuz adres.'],
      ['Bağlantıyı açın', 'Sıfırlama bağlantısı sizi yeni parola seçme sayfasına götürür.'],
      ['Yeni parola belirleyin', 'İki kez girin ve onunla giriş yapın.'],
    ],
    faqs: [
      ['Bağlantı gelmedi.', 'İstenmeyen e-posta klasörüne bakın. Sayfa şimdilik e-posta gönderilemediğini söylediyse İletişim’den mesaj gönderin.'],
      ['Bağlantı çalışmıyor.', 'Süresi dolmuş olabilir; yeniden sıfırlama isteyin.'],
    ],
    related: {
      login: 'Girişe dönün.',
      profile: 'Giriş yapmışken parolanızı değiştirme.',
    },
  },

  'verify-email': {
    title: 'E-postanızı onaylayın',
    summary: 'Hesabınızın e-posta adresini onaylamak için onay bağlantısını açın.',
    intro:
      'Bu sayfa e-posta adresinizi onaylamak için gönderilen bağlantıdan açılır. Açıldığında bağlantı kontrol edilir ve sonuç gösterilir. E-posta onayı kimlik doğrulamasından farklıdır: ilki adresin size ait olduğunu, ikincisi kim olduğunuzu kanıtlar.',
    faqs: [
      ['Bağlantının süresi dolmuş.', 'Giriş yapıp panelinizden yeni bir bağlantı isteyin ya da İletişim’den yardım alın.'],
      ['E-posta onayı kimlik doğrulamasıyla aynı şey mi?', 'Hayır. Kimliğinizi ayrıca panelinizden doğrularsınız.'],
    ],
    related: {
      register: 'Hesap oluşturma.',
      login: 'Giriş yapma.',
      verification: 'Pazar yeri etkinlikleri için kimlik doğrulaması.',
    },
  },
};

export default account;
