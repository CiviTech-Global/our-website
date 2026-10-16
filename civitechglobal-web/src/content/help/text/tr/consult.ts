import type { HelpArticleText } from '../../types';

const consult: Record<string, HelpArticleText> = {
  consult: {
    title: 'Danışmanlık talebi',
    summary: 'Teknik veya kariyer danışmanlığı isteyin; ne zaman müsait olduğunuzu söyleyin, biz arayalım.',
    intro:
      'Kariyer yolunuz, teknik bir sorun veya kod incelemesi, yazılıma başlamak ya da mülakatlara ve CV’ye hazırlık: ne hakkında konuşmak istediğinizi ve ne zaman müsait olduğunuzu söyleyin. Sizi arar ve zamanı netleştiririz. Görüşme çevrim içi, telefonla veya yüz yüze olabilir ve sizi hiçbir şeye bağlamaz.',
    steps: [
      ['Bir konu seçin', 'Kariyer yolu, teknik bir sorun, başlangıç, mülakat ve CV ya da başka bir konu.'],
      ['Nasıl ve neden', 'Çevrim içi, telefonla veya yüz yüze; ve görüşmeden ne beklediğiniz.'],
      ['Bir uzman seçin ya da bize bırakın', 'Uzmanlar kulübünden aklınızda biri varsa onu seçin; yoksa en uygun olan.'],
      ['Müsait olduğunuz zamanları verin', 'Birkaç zaman dilimi seçin (gün ve sabah, öğleden sonra veya akşam). Yaklaşık zaman yeterlidir.'],
      ['Takip kodunu saklayın', 'Verdiğiniz numarayı ararız; durumu kodla izleyin, gerekirse talebi iptal edin.'],
    ],
    points: [
      ['Açık bir durum', 'Alındı, Zaman ayarlanıyor, Zaman kesinleşti, Gerçekleşti; hepsi takip koduyla.'],
      ['Kolay iptal', 'Planlarınız değişirse talebi takip sayfasından iptal edin.'],
    ],
    tips: [
      ['Amacı net yazın', 'Beklentiniz ne kadar netse görüşme o kadar faydalı olur; örneğin “arka uca geçmek için nereden başlamalıyım bilmek istiyorum”.'],
    ],
    faqs: [
      ['Danışmanlık beni bir şeye bağlar mı?', 'Hayır. Danışmanlık, proje başlatmak veya birlikte çalışmak için hiçbir yükümlülük doğurmaz.'],
      ['Ne zaman arayacaksınız?', 'Verdiğiniz zaman dilimlerinden birinde, görüşme zamanını kesinleştirmek için. Kesinleşen zaman takip sayfasında da görünür.'],
      ['E-posta adresi gerekli mi?', 'Hayır; telefon numarası yeterlidir. E-posta isteğe bağlıdır.'],
      ['Talebi iptal edebilir miyim?', 'Evet, takip koduyla Talep takibi sayfasından.'],
    ],
    related: {
      experts: 'Adıyla isteyebileceğiniz uzmanlar.',
      'start-project': 'Danışmanlıktan sonra proje başlatmaya hazırsanız.',
      'my-requests': 'Üyeler için: danışmanlık kodu talep listenizde.',
    },
  },

  experts: {
    title: 'Uzmanlar kulübü',
    summary: 'Teknik ve kariyer danışmanlığı veren mühendis ve uzmanlar; alanları, dilleri ve deneyim yıllarıyla.',
    heading: 'Uzmanlar kulübü nasıl işler',
    intro:
      'Uzmanlar kulübü, teknik ve kariyer danışmanlığı veren mühendis ve uzmanlardan oluşur; bizim de başvurduğumuz ve sizin de adıyla isteyebileceğiniz kişiler. Her profilde o uzmanın danışmanlık kabul edip etmediği yazar.',
    points: [
      ['Teknik danışmanlık', 'Teknoloji seçimi ya da mimari tasarım gibi kararlar için veya zaten sahip olduğunuz ama olması gerektiği gibi çalışmayan bir sisteme bakmak için.'],
      ['Kariyer danışmanlığı', 'Yeni başlayan ya da yön değiştiren mühendisler için, o yolu bizzat yürümüş kişilerden.'],
      ['Adıyla seçin', 'Her uzmanın sayfasında uzmanlık alanları, dilleri ve deneyim yılları yer alır. Danışmanlık kabul ediyorsa doğrudan o sayfadan talep edebilirsiniz.'],
      ['Danışmanlığın ayarlanması', '“Danışmanlık talebi” sayfasından talep gönderin ve size uygun birkaç zaman belirtin, biz arayalım. Danışmanlık sizi hiçbir şeye bağlamaz.'],
    ],
    faqTitle: 'Danışmanlık hakkında sık sorulan sorular',
    faqs: [
      ['Nasıl danışmanlık randevusu alırım?', '“Danışmanlık talebi” sayfasından veya bir uzmanın sayfasındaki danışmanlık düğmesiyle. Size uygun birkaç zaman belirtirsiniz, biz ararız.'],
      ['Uzmanı kendim seçebilir miyim?', 'Evet. “Danışmanlık kabul eder” etiketli uzmanları adıyla isteyebilirsiniz.'],
      ['Danışmanlık beni bir projeye bağlar mı?', 'Hayır. Danışmanlık sizi hiçbir şeye bağlamaz.'],
      ['Uzmanlar kulübüne nasıl katılırım?', '“İletişim” sayfasından deneyiminizi ve uzmanlık alanlarınızı yazın. Kulüp profilleri ekibimiz tarafından eklenir ve güncel tutulur.'],
    ],
    related: {
      consult: 'Danışmanlık talep formu.',
      team: 'Rayan Tamaddon Jahan Gostar mühendislik ekibi.',
      freelancers: 'Danışmanlık yerine işi yapacak birini istiyorsanız.',
    },
  },
};

export default consult;
