/**
 * The privacy policy, for the website and the Android app, in every language
 * the site speaks. Written from what the code actually does; when a feature
 * starts collecting something new (push, SMS, an outside service), this text
 * changes with it and `updated` moves.
 *
 * A body entry is a paragraph, or a list when it is an array.
 */
import type { Locale } from '@/i18n/locales';

export interface PrivacySection {
  heading: string;
  body: (string | string[])[];
}

export interface PrivacyPolicy {
  title: string;
  updated: string;
  intro: string;
  sections: PrivacySection[];
}

const en: PrivacyPolicy = {
  title: 'Privacy policy',
  updated: 'Last updated: 30 October 2026',
  intro:
    'This policy explains what Rayan Tamaddon Jahan Gostar (CiviTech Global) collects when you use this website and our Android app, why, who can see it, and what you can do about it. The website and the app are the same service and follow the same rules.',
  sections: [
    {
      heading: 'What we collect',
      body: [
        [
          'Your account: name, email address, username and, if you add one, a phone number. Your password is stored only as a one-way hash; nobody here can read it.',
          'What you publish or send: your profile, résumé, job applications, job postings, freelance projects, proposals and services, book listings, shops and products, and your messages.',
          'Identity verification, only if you ask for it: your legal name, national ID number, date of birth, address, company details and the documents you upload.',
          'Insurance and consultation requests: the details you enter and the phone number we contact you on.',
          'Files you upload. Every file is checked for malware before it is stored.',
          'Location, only in the local market and only when you tap "Near me": your approximate position is sent with that one search to find shops near you. It is not saved to your account, and nothing is read in the background. Your phone or browser asks your permission first.',
          'Technical records: your IP address, device and browser type and the addresses you request, kept in our server logs for security; and error reports from the website and the app (what failed and on which page, not what you typed).',
        ],
      ],
    },
    {
      heading: 'How we use it',
      body: [
        'To run the services you use: to show your postings, deliver your applications and messages, process your requests, and review postings before they go live. To keep the service secure: to stop abuse, spam and attempts to break into accounts.',
        'We do not sell your information, we show no advertising, and the website and the app contain no third-party tracking or analytics.',
      ],
    },
    {
      heading: 'Who can see it',
      body: [
        [
          'Other people see what you publish: your public profile, postings, listings and shops.',
          'An employer sees the application and résumé you send them; the person you message sees your message.',
          'Your email address and phone number are never shown on your public profile.',
          'Our staff see what they need to review postings, verify identities and answer requests.',
          'Authorities, only when Iranian law requires it.',
        ],
      ],
    },
    {
      heading: 'Cookies and storage on your device',
      body: [
        'The website keeps you signed in with a secure cookie and remembers your language and display choices in your browser. The app keeps its sign-in in Android\'s encrypted storage. Neither uses tracking cookies.',
      ],
    },
    {
      heading: 'Where it is kept, and for how long',
      body: [
        'Your information is stored on our own servers in Iran and always travels over an encrypted (HTTPS) connection. We keep it for as long as your account is open. Backups are kept for 14 days and then deleted.',
      ],
    },
    {
      heading: 'Your choices',
      body: [
        [
          'You can see and edit your profile, and remove your postings and listings, at any time.',
          'You can delete your account yourself, on the website (Profile) or in the app (Settings): your account details, identity documents, CVs and photos are erased at once, your listings are closed, and so are the requests saved in your account. A request you sent through a public form and did not save to your account cannot be safely matched to you, so ask us through the contact page to erase it, or for a copy of your information; we do either within 30 days. We keep only what the law requires us to.',
          'You can withdraw the app\'s location permission at any time in your phone\'s settings.',
        ],
      ],
    },
    {
      heading: 'Children',
      body: [
        'The services are meant for adults. If you are under 18, use them only with the permission of a parent or guardian.',
      ],
    },
    {
      heading: 'Changes to this policy',
      body: [
        'When we change this policy we update this page and the date above. If a change affects how your information is used, we will tell you on the website and in the app first.',
      ],
    },
    {
      heading: 'Contact',
      body: ['For any question about your information, write to us through the contact page.'],
    },
  ],
};

const fa: PrivacyPolicy = {
  title: 'سیاست حریم خصوصی',
  updated: 'آخرین به‌روزرسانی: ۸ آبان ۱۴۰۵',
  intro:
    'این صفحه توضیح می‌دهد که رایان تمدن جهان گستر (CiviTech Global) هنگام استفادهٔ شما از این وب‌سایت و برنامهٔ اندروید ما چه اطلاعاتی گردآوری می‌کند، برای چه، چه کسانی آن را می‌بینند و شما چه اختیاری دارید. وب‌سایت و برنامه یک خدمت‌اند و از یک قاعده پیروی می‌کنند.',
  sections: [
    {
      heading: 'چه اطلاعاتی گردآوری می‌کنیم',
      body: [
        [
          'حساب کاربری: نام، نشانی ایمیل، نام کاربری و اگر بیفزایید، شمارهٔ تلفن. گذرواژهٔ شما فقط به‌صورت درهم‌سازی‌شدهٔ یک‌طرفه نگه داشته می‌شود و هیچ‌کس در این‌جا نمی‌تواند آن را بخواند.',
          'آنچه منتشر می‌کنید یا می‌فرستید: نمایه، رزومه، درخواست‌های شغلی، آگهی‌های استخدام، پروژه‌ها و پیشنهادها و خدمات فریلنسری، آگهی‌های کتاب، فروشگاه‌ها و کالاها و پیام‌هایتان.',
          'احراز هویت، فقط اگر خودتان درخواست کنید: نام قانونی، کد ملی، تاریخ تولد، نشانی، مشخصات شرکت و مدارکی که بارگذاری می‌کنید.',
          'درخواست‌های بیمه و مشاوره: اطلاعاتی که وارد می‌کنید و شماره‌ای که با آن با شما تماس می‌گیریم.',
          'پرونده‌هایی که بارگذاری می‌کنید. هر پرونده پیش از ذخیره از نظر بدافزار بررسی می‌شود.',
          'موقعیت مکانی، فقط در بازار محلی و فقط وقتی دکمهٔ «نزدیک من» را بزنید: موقعیت تقریبی شما همراه همان یک جست‌وجو فرستاده می‌شود تا فروشگاه‌های نزدیک پیدا شوند. این موقعیت در حساب شما ذخیره نمی‌شود و هیچ چیزی در پس‌زمینه خوانده نمی‌شود. گوشی یا مرورگر شما پیش از آن اجازه می‌گیرد.',
          'سوابق فنی: نشانی IP، نوع دستگاه و مرورگر و نشانی صفحه‌های درخواستی، که برای امنیت در گزارش‌های کارساز نگه داشته می‌شود؛ و گزارش خطاهای وب‌سایت و برنامه (چه چیزی و در کدام صفحه از کار افتاد، نه آنچه نوشته‌اید).',
        ],
      ],
    },
    {
      heading: 'از این اطلاعات چه استفاده‌ای می‌کنیم',
      body: [
        'برای اجرای خدماتی که از آن‌ها استفاده می‌کنید: نمایش آگهی‌ها، رساندن درخواست‌ها و پیام‌ها، رسیدگی به درخواست‌ها و بررسی آگهی‌ها پیش از انتشار. و برای امنیت خدمت: جلوگیری از سوءاستفاده، هرزنامه و تلاش برای نفوذ به حساب‌ها.',
        'ما اطلاعات شما را نمی‌فروشیم، تبلیغ نمایش نمی‌دهیم و در وب‌سایت و برنامه هیچ ابزار ردیابی یا آمارگیری شخص ثالث وجود ندارد.',
      ],
    },
    {
      heading: 'چه کسانی اطلاعات را می‌بینند',
      body: [
        [
          'دیگران آنچه را منتشر می‌کنید می‌بینند: نمایهٔ عمومی، آگهی‌ها، کتاب‌ها و فروشگاه‌هایتان.',
          'کارفرما درخواست و رزومه‌ای را که برایش می‌فرستید می‌بیند و گیرندهٔ پیام، پیام شما را.',
          'نشانی ایمیل و شمارهٔ تلفن شما هرگز در نمایهٔ عمومی نشان داده نمی‌شود.',
          'کارکنان ما به اندازه‌ای که برای بررسی آگهی‌ها، احراز هویت و پاسخ به درخواست‌ها لازم است.',
          'مراجع قانونی، فقط زمانی که قانون جمهوری اسلامی ایران الزام کند.',
        ],
      ],
    },
    {
      heading: 'کوکی‌ها و ذخیره‌سازی روی دستگاه شما',
      body: [
        'وب‌سایت با یک کوکی امن شما را وارد نگه می‌دارد و زبان و تنظیمات نمایش را در مرورگرتان به خاطر می‌سپارد. برنامه ورود شما را در حافظهٔ رمزنگاری‌شدهٔ اندروید نگه می‌دارد. هیچ‌کدام از کوکی ردیابی استفاده نمی‌کنند.',
      ],
    },
    {
      heading: 'محل و مدت نگهداری',
      body: [
        'اطلاعات شما روی کارسازهای خود ما در ایران نگهداری می‌شود و همیشه از راه اتصال رمزنگاری‌شده (HTTPS) جابه‌جا می‌شود. تا وقتی حساب شما باز است آن را نگه می‌داریم. نسخه‌های پشتیبان ۱۴ روز نگه داشته و سپس پاک می‌شوند.',
      ],
    },
    {
      heading: 'اختیارات شما',
      body: [
        [
          'هر زمان می‌توانید نمایهٔ خود را ببینید و ویرایش کنید و آگهی‌هایتان را بردارید.',
          'حسابتان را خودتان می‌توانید حذف کنید، در وب‌سایت (نمایه) یا در برنامه (تنظیمات): اطلاعات حساب، مدارک هویتی، رزومه‌ها و تصاویرتان همان لحظه پاک، آگهی‌هایتان بسته و درخواست‌های ذخیره‌شده در حسابتان نیز پاک می‌شود. درخواستی که از فرم عمومی فرستاده و در حسابتان ذخیره نکرده‌اید با اطمینان قابل تطبیق با شما نیست؛ برای پاک کردن آن یا دریافت رونوشتی از اطلاعاتتان از راه صفحهٔ تماس بخواهید تا ظرف ۳۰ روز انجام دهیم. تنها آنچه قانون نگهداری‌اش را الزام کرده باشد نگه می‌داریم.',
          'هر زمان می‌توانید اجازهٔ موقعیت مکانی برنامه را از تنظیمات گوشی پس بگیرید.',
        ],
      ],
    },
    {
      heading: 'کودکان',
      body: [
        'این خدمات برای بزرگسالان است. اگر کمتر از ۱۸ سال دارید، فقط با اجازهٔ پدر، مادر یا سرپرست خود از آن استفاده کنید.',
      ],
    },
    {
      heading: 'تغییر این سیاست',
      body: [
        'هر تغییری در این سیاست را در همین صفحه و تاریخ بالای آن ثبت می‌کنیم. اگر تغییری بر نحوهٔ استفاده از اطلاعات شما اثر بگذارد، پیش از آن در وب‌سایت و برنامه اطلاع می‌دهیم.',
      ],
    },
    {
      heading: 'تماس',
      body: ['برای هر پرسشی دربارهٔ اطلاعاتتان، از راه صفحهٔ تماس برای ما بنویسید.'],
    },
  ],
};

const de: PrivacyPolicy = {
  title: 'Datenschutzerklärung',
  updated: 'Zuletzt aktualisiert: 30. Oktober 2026',
  intro:
    'Diese Erklärung beschreibt, welche Daten Rayan Tamaddon Jahan Gostar (CiviTech Global) erhebt, wenn Sie diese Website und unsere Android-App nutzen, wozu, wer sie sehen kann und welche Möglichkeiten Sie haben. Website und App sind derselbe Dienst und folgen denselben Regeln.',
  sections: [
    {
      heading: 'Welche Daten wir erheben',
      body: [
        [
          'Ihr Konto: Name, E-Mail-Adresse, Benutzername und, falls angegeben, eine Telefonnummer. Ihr Passwort wird nur als Einweg-Hash gespeichert; niemand bei uns kann es lesen.',
          'Was Sie veröffentlichen oder senden: Ihr Profil, Lebenslauf, Bewerbungen, Stellenanzeigen, Freelance-Projekte, Angebote und Dienstleistungen, Buchangebote, Shops und Produkte sowie Ihre Nachrichten.',
          'Identitätsprüfung, nur auf Ihren Wunsch: Ihr amtlicher Name, Ihre nationale Kennnummer, Ihr Geburtsdatum, Ihre Anschrift, Firmenangaben und die Dokumente, die Sie hochladen.',
          'Versicherungs- und Beratungsanfragen: die Angaben, die Sie machen, und die Telefonnummer, unter der wir Sie erreichen.',
          'Dateien, die Sie hochladen. Jede Datei wird vor dem Speichern auf Schadsoftware geprüft.',
          'Standort, nur im lokalen Markt und nur wenn Sie auf „In meiner Nähe" tippen: Ihre ungefähre Position wird mit dieser einen Suche gesendet, um Geschäfte in Ihrer Nähe zu finden. Sie wird nicht in Ihrem Konto gespeichert, und nichts wird im Hintergrund gelesen. Ihr Telefon oder Browser fragt Sie vorher um Erlaubnis.',
          'Technische Daten: IP-Adresse, Geräte- und Browsertyp und die aufgerufenen Adressen, die aus Sicherheitsgründen in unseren Serverprotokollen gespeichert werden; dazu Fehlerberichte der Website und der App (was auf welcher Seite fehlschlug, nicht was Sie eingegeben haben).',
        ],
      ],
    },
    {
      heading: 'Wozu wir sie verwenden',
      body: [
        'Um die Dienste bereitzustellen, die Sie nutzen: Ihre Anzeigen zeigen, Bewerbungen und Nachrichten zustellen, Anfragen bearbeiten und Anzeigen vor der Veröffentlichung prüfen. Und um den Dienst zu schützen: gegen Missbrauch, Spam und Angriffe auf Konten.',
        'Wir verkaufen Ihre Daten nicht, zeigen keine Werbung, und Website und App enthalten kein Tracking und keine Analysewerkzeuge Dritter.',
      ],
    },
    {
      heading: 'Wer sie sehen kann',
      body: [
        [
          'Andere sehen, was Sie veröffentlichen: Ihr öffentliches Profil, Ihre Anzeigen, Angebote und Shops.',
          'Ein Arbeitgeber sieht die Bewerbung und den Lebenslauf, die Sie ihm senden; Empfänger sehen Ihre Nachricht.',
          'Ihre E-Mail-Adresse und Telefonnummer erscheinen nie in Ihrem öffentlichen Profil.',
          'Unsere Mitarbeitenden sehen, was sie zur Prüfung von Anzeigen, zur Identitätsprüfung und zur Beantwortung von Anfragen brauchen.',
          'Behörden, nur wenn iranisches Recht es verlangt.',
        ],
      ],
    },
    {
      heading: 'Cookies und Speicherung auf Ihrem Gerät',
      body: [
        'Die Website hält Sie mit einem sicheren Cookie angemeldet und merkt sich Sprache und Anzeigeeinstellungen in Ihrem Browser. Die App bewahrt Ihre Anmeldung im verschlüsselten Speicher von Android auf. Keines von beiden verwendet Tracking-Cookies.',
      ],
    },
    {
      heading: 'Wo und wie lange die Daten gespeichert werden',
      body: [
        'Ihre Daten liegen auf unseren eigenen Servern im Iran und werden stets verschlüsselt (HTTPS) übertragen. Wir bewahren sie auf, solange Ihr Konto besteht. Sicherungskopien werden 14 Tage aufbewahrt und dann gelöscht.',
      ],
    },
    {
      heading: 'Ihre Möglichkeiten',
      body: [
        [
          'Sie können Ihr Profil jederzeit einsehen und bearbeiten und Ihre Anzeigen entfernen.',
          'Sie können Ihr Konto selbst löschen, auf der Website (Profil) oder in der App (Einstellungen): Ihre Kontodaten, Ausweisdokumente, Lebensläufe und Fotos werden sofort gelöscht, Ihre Anzeigen geschlossen und die in Ihrem Konto gespeicherten Anfragen ebenfalls gelöscht. Eine über ein öffentliches Formular gesendete, nicht im Konto gespeicherte Anfrage lässt sich Ihnen nicht sicher zuordnen. Bitten Sie uns über die Kontaktseite um ihre Löschung oder um eine Kopie Ihrer Daten; wir erledigen beides innerhalb von 30 Tagen. Wir bewahren nur auf, was das Gesetz verlangt.',
          'Sie können der App die Standortberechtigung jederzeit in den Einstellungen Ihres Telefons entziehen.',
        ],
      ],
    },
    {
      heading: 'Kinder',
      body: [
        'Die Dienste richten sich an Erwachsene. Wenn Sie unter 18 sind, nutzen Sie sie nur mit Erlaubnis eines Elternteils oder Vormunds.',
      ],
    },
    {
      heading: 'Änderungen dieser Erklärung',
      body: [
        'Wenn wir diese Erklärung ändern, aktualisieren wir diese Seite und das Datum oben. Betrifft eine Änderung die Verwendung Ihrer Daten, informieren wir Sie vorher auf der Website und in der App.',
      ],
    },
    {
      heading: 'Kontakt',
      body: ['Bei Fragen zu Ihren Daten schreiben Sie uns über die Kontaktseite.'],
    },
  ],
};

const fr: PrivacyPolicy = {
  title: 'Politique de confidentialité',
  updated: 'Dernière mise à jour : 30 octobre 2026',
  intro:
    'Cette politique explique ce que Rayan Tamaddon Jahan Gostar (CiviTech Global) collecte lorsque vous utilisez ce site et notre application Android, pourquoi, qui peut le voir et ce que vous pouvez y faire. Le site et l\'application forment un seul service et suivent les mêmes règles.',
  sections: [
    {
      heading: 'Ce que nous collectons',
      body: [
        [
          'Votre compte : nom, adresse e-mail, nom d\'utilisateur et, si vous l\'ajoutez, un numéro de téléphone. Votre mot de passe n\'est conservé que sous forme de hachage à sens unique ; personne chez nous ne peut le lire.',
          'Ce que vous publiez ou envoyez : votre profil, votre CV, vos candidatures, vos offres d\'emploi, vos projets, propositions et services freelance, vos annonces de livres, vos boutiques et produits, et vos messages.',
          'Vérification d\'identité, uniquement à votre demande : votre nom légal, votre numéro d\'identité nationale, votre date de naissance, votre adresse, les informations de votre entreprise et les documents que vous déposez.',
          'Demandes d\'assurance et de conseil : les informations que vous saisissez et le numéro auquel nous vous joignons.',
          'Les fichiers que vous déposez. Chaque fichier est analysé contre les logiciels malveillants avant d\'être enregistré.',
          'Localisation, uniquement dans le marché local et seulement lorsque vous touchez « Près de moi » : votre position approximative est envoyée avec cette seule recherche pour trouver les boutiques proches. Elle n\'est pas enregistrée dans votre compte et rien n\'est lu en arrière-plan. Votre téléphone ou votre navigateur vous demande d\'abord l\'autorisation.',
          'Données techniques : adresse IP, type d\'appareil et de navigateur et adresses demandées, conservés dans nos journaux de serveur pour la sécurité ; ainsi que les rapports d\'erreur du site et de l\'application (ce qui a échoué et sur quelle page, pas ce que vous avez saisi).',
        ],
      ],
    },
    {
      heading: 'Comment nous les utilisons',
      body: [
        'Pour faire fonctionner les services que vous utilisez : afficher vos annonces, transmettre vos candidatures et messages, traiter vos demandes et vérifier les annonces avant leur publication. Et pour sécuriser le service : contre les abus, le spam et les tentatives d\'intrusion dans les comptes.',
        'Nous ne vendons pas vos informations, nous n\'affichons aucune publicité, et le site comme l\'application ne contiennent aucun outil de suivi ou de mesure d\'audience tiers.',
      ],
    },
    {
      heading: 'Qui peut les voir',
      body: [
        [
          'Les autres voient ce que vous publiez : votre profil public, vos annonces et vos boutiques.',
          'Un employeur voit la candidature et le CV que vous lui envoyez ; le destinataire voit votre message.',
          'Votre adresse e-mail et votre numéro de téléphone ne sont jamais affichés sur votre profil public.',
          'Notre équipe voit ce dont elle a besoin pour vérifier les annonces et les identités et répondre aux demandes.',
          'Les autorités, uniquement lorsque la loi iranienne l\'exige.',
        ],
      ],
    },
    {
      heading: 'Cookies et stockage sur votre appareil',
      body: [
        'Le site vous garde connecté grâce à un cookie sécurisé et retient votre langue et vos préférences d\'affichage dans votre navigateur. L\'application conserve votre connexion dans le stockage chiffré d\'Android. Aucun des deux n\'utilise de cookies de suivi.',
      ],
    },
    {
      heading: 'Où et combien de temps',
      body: [
        'Vos informations sont stockées sur nos propres serveurs en Iran et circulent toujours par une connexion chiffrée (HTTPS). Nous les conservons tant que votre compte est ouvert. Les sauvegardes sont conservées 14 jours puis supprimées.',
      ],
    },
    {
      heading: 'Vos choix',
      body: [
        [
          'Vous pouvez consulter et modifier votre profil, et retirer vos annonces, à tout moment.',
          'Vous pouvez supprimer votre compte vous-même, sur le site (Profil) ou dans l\'application (Réglages) : les données de votre compte, pièces d\'identité, CV et photos sont effacés immédiatement, vos annonces fermées et les demandes enregistrées dans votre compte effacées. Une demande envoyée par un formulaire public et non enregistrée dans votre compte ne peut pas vous être attribuée avec certitude : demandez-nous par la page de contact de l\'effacer, ou d\'obtenir une copie de vos informations ; nous le faisons sous 30 jours. Nous ne conservons que ce que la loi exige.',
          'Vous pouvez retirer à tout moment l\'autorisation de localisation de l\'application dans les réglages de votre téléphone.',
        ],
      ],
    },
    {
      heading: 'Enfants',
      body: [
        'Les services sont destinés aux adultes. Si vous avez moins de 18 ans, utilisez-les uniquement avec l\'accord d\'un parent ou tuteur.',
      ],
    },
    {
      heading: 'Modifications de cette politique',
      body: [
        'Lorsque nous modifions cette politique, nous mettons à jour cette page et la date ci-dessus. Si une modification change l\'usage de vos informations, nous vous en informons d\'abord sur le site et dans l\'application.',
      ],
    },
    {
      heading: 'Contact',
      body: ['Pour toute question sur vos informations, écrivez-nous via la page de contact.'],
    },
  ],
};

const es: PrivacyPolicy = {
  title: 'Política de privacidad',
  updated: 'Última actualización: 30 de octubre de 2026',
  intro:
    'Esta política explica qué recoge Rayan Tamaddon Jahan Gostar (CiviTech Global) cuando usa este sitio web y nuestra aplicación para Android, para qué, quién puede verlo y qué puede hacer usted al respecto. El sitio y la aplicación son el mismo servicio y siguen las mismas reglas.',
  sections: [
    {
      heading: 'Qué recogemos',
      body: [
        [
          'Su cuenta: nombre, correo electrónico, nombre de usuario y, si lo añade, un número de teléfono. Su contraseña solo se guarda como un hash de un solo sentido; nadie aquí puede leerla.',
          'Lo que publica o envía: su perfil, currículum, candidaturas, ofertas de empleo, proyectos, propuestas y servicios freelance, anuncios de libros, tiendas y productos, y sus mensajes.',
          'Verificación de identidad, solo si la solicita: su nombre legal, número de identidad nacional, fecha de nacimiento, dirección, datos de su empresa y los documentos que suba.',
          'Solicitudes de seguros y consultas: los datos que introduce y el teléfono en el que le contactamos.',
          'Los archivos que sube. Cada archivo se analiza en busca de software malicioso antes de guardarse.',
          'Ubicación, solo en el mercado local y solo cuando toca «Cerca de mí»: su posición aproximada se envía con esa única búsqueda para encontrar tiendas cercanas. No se guarda en su cuenta y no se lee nada en segundo plano. Su teléfono o navegador le pide permiso antes.',
          'Datos técnicos: dirección IP, tipo de dispositivo y navegador y las direcciones que solicita, guardados en los registros del servidor por seguridad; y los informes de errores del sitio y de la aplicación (qué falló y en qué página, no lo que usted escribió).',
        ],
      ],
    },
    {
      heading: 'Para qué lo usamos',
      body: [
        'Para prestar los servicios que usa: mostrar sus anuncios, entregar sus candidaturas y mensajes, tramitar sus solicitudes y revisar los anuncios antes de publicarlos. Y para mantener el servicio seguro: frente al abuso, el spam y los intentos de acceder a cuentas ajenas.',
        'No vendemos su información, no mostramos publicidad, y ni el sitio ni la aplicación contienen herramientas de seguimiento o analítica de terceros.',
      ],
    },
    {
      heading: 'Quién puede verlo',
      body: [
        [
          'Los demás ven lo que usted publica: su perfil público, anuncios y tiendas.',
          'Un empleador ve la candidatura y el currículum que le envía; quien recibe su mensaje lo ve.',
          'Su correo electrónico y su teléfono nunca se muestran en su perfil público.',
          'Nuestro equipo ve lo que necesita para revisar anuncios, verificar identidades y atender solicitudes.',
          'Las autoridades, solo cuando la ley iraní lo exija.',
        ],
      ],
    },
    {
      heading: 'Cookies y almacenamiento en su dispositivo',
      body: [
        'El sitio mantiene su sesión con una cookie segura y recuerda su idioma y sus preferencias de visualización en su navegador. La aplicación guarda su sesión en el almacenamiento cifrado de Android. Ninguno de los dos usa cookies de seguimiento.',
      ],
    },
    {
      heading: 'Dónde y durante cuánto tiempo',
      body: [
        'Su información se guarda en nuestros propios servidores en Irán y siempre viaja por una conexión cifrada (HTTPS). La conservamos mientras su cuenta esté abierta. Las copias de seguridad se guardan 14 días y después se eliminan.',
      ],
    },
    {
      heading: 'Sus opciones',
      body: [
        [
          'Puede ver y editar su perfil, y retirar sus anuncios, en cualquier momento.',
          'Puede eliminar su cuenta usted mismo, en el sitio web (Perfil) o en la aplicación (Ajustes): los datos de su cuenta, documentos de identidad, currículos y fotos se borran al instante, sus anuncios se cierran y las solicitudes guardadas en su cuenta también se borran. Una solicitud enviada por un formulario público y no guardada en su cuenta no se puede asociar a usted con seguridad: pídanos desde la página de contacto que la borremos, o una copia de su información; lo hacemos en un plazo de 30 días. Solo conservamos lo que la ley exige.',
          'Puede retirar el permiso de ubicación de la aplicación en cualquier momento desde los ajustes de su teléfono.',
        ],
      ],
    },
    {
      heading: 'Menores',
      body: [
        'Los servicios están pensados para adultos. Si tiene menos de 18 años, úselos solo con permiso de su madre, padre o tutor.',
      ],
    },
    {
      heading: 'Cambios en esta política',
      body: [
        'Cuando cambiemos esta política, actualizaremos esta página y la fecha de arriba. Si un cambio afecta al uso de su información, se lo comunicaremos antes en el sitio y en la aplicación.',
      ],
    },
    {
      heading: 'Contacto',
      body: ['Para cualquier pregunta sobre su información, escríbanos desde la página de contacto.'],
    },
  ],
};

const tr: PrivacyPolicy = {
  title: 'Gizlilik politikası',
  updated: 'Son güncelleme: 30 Ekim 2026',
  intro:
    'Bu politika, Rayan Tamaddon Jahan Gostar\'ın (CiviTech Global) bu web sitesini ve Android uygulamamızı kullandığınızda hangi bilgileri topladığını, neden topladığını, kimlerin görebildiğini ve sizin neler yapabileceğinizi açıklar. Web sitesi ve uygulama aynı hizmettir ve aynı kurallara uyar.',
  sections: [
    {
      heading: 'Neleri topluyoruz',
      body: [
        [
          'Hesabınız: ad, e-posta adresi, kullanıcı adı ve eklerseniz telefon numarası. Parolanız yalnızca tek yönlü bir özet (hash) olarak saklanır; burada kimse onu okuyamaz.',
          'Yayımladıklarınız veya gönderdikleriniz: profiliniz, özgeçmişiniz, iş başvurularınız, iş ilanlarınız, serbest çalışma projeleriniz, teklifleriniz ve hizmetleriniz, kitap ilanlarınız, mağazalarınız ve ürünleriniz ile mesajlarınız.',
          'Kimlik doğrulama, yalnızca siz isterseniz: yasal adınız, ulusal kimlik numaranız, doğum tarihiniz, adresiniz, şirket bilgileriniz ve yüklediğiniz belgeler.',
          'Sigorta ve danışmanlık talepleri: girdiğiniz bilgiler ve size ulaştığımız telefon numarası.',
          'Yüklediğiniz dosyalar. Her dosya kaydedilmeden önce kötü amaçlı yazılıma karşı taranır.',
          'Konum, yalnızca yerel pazarda ve yalnızca "Yakınımda"ya dokunduğunuzda: yaklaşık konumunuz, yakındaki mağazaları bulmak için yalnızca o aramayla birlikte gönderilir. Hesabınıza kaydedilmez ve arka planda hiçbir şey okunmaz. Telefonunuz veya tarayıcınız önce izninizi ister.',
          'Teknik kayıtlar: IP adresiniz, cihaz ve tarayıcı türünüz ve istediğiniz adresler, güvenlik için sunucu kayıtlarımızda tutulur; ayrıca web sitesi ve uygulamadan gelen hata raporları (neyin hangi sayfada başarısız olduğu, yazdıklarınız değil).',
        ],
      ],
    },
    {
      heading: 'Bunları nasıl kullanıyoruz',
      body: [
        'Kullandığınız hizmetleri yürütmek için: ilanlarınızı göstermek, başvurularınızı ve mesajlarınızı iletmek, taleplerinizi işlemek ve ilanları yayından önce incelemek. Ve hizmeti güvende tutmak için: kötüye kullanıma, istenmeyen iletilere ve hesaplara sızma girişimlerine karşı.',
        'Bilgilerinizi satmıyoruz, reklam göstermiyoruz; web sitesinde ve uygulamada üçüncü taraf izleme veya analiz aracı yoktur.',
      ],
    },
    {
      heading: 'Kimler görebilir',
      body: [
        [
          'Başkaları yayımladıklarınızı görür: herkese açık profiliniz, ilanlarınız ve mağazalarınız.',
          'Bir işveren ona gönderdiğiniz başvuruyu ve özgeçmişi görür; mesaj gönderdiğiniz kişi mesajınızı görür.',
          'E-posta adresiniz ve telefon numaranız herkese açık profilinizde asla gösterilmez.',
          'Ekibimiz, ilanları incelemek, kimlikleri doğrulamak ve taleplere yanıt vermek için gerekeni görür.',
          'Resmî makamlar, yalnızca İran hukuku gerektirdiğinde.',
        ],
      ],
    },
    {
      heading: 'Çerezler ve cihazınızda saklananlar',
      body: [
        'Web sitesi güvenli bir çerezle oturumunuzu açık tutar ve dil ile görünüm tercihlerinizi tarayıcınızda hatırlar. Uygulama oturumunuzu Android\'in şifreli deposunda tutar. İkisi de izleme çerezi kullanmaz.',
      ],
    },
    {
      heading: 'Nerede ve ne kadar süre',
      body: [
        'Bilgileriniz İran\'daki kendi sunucularımızda saklanır ve her zaman şifreli bağlantı (HTTPS) üzerinden taşınır. Hesabınız açık olduğu sürece saklarız. Yedekler 14 gün tutulur, sonra silinir.',
      ],
    },
    {
      heading: 'Seçenekleriniz',
      body: [
        [
          'Profilinizi istediğiniz zaman görüntüleyip düzenleyebilir, ilanlarınızı kaldırabilirsiniz.',
          'Hesabınızı web sitesinde (Profil) ya da uygulamada (Ayarlar) kendiniz silebilirsiniz: hesap bilgileriniz, kimlik belgeleriniz, özgeçmişleriniz ve fotoğraflarınız hemen silinir, ilanlarınız kapatılır ve hesabınızda kayıtlı talepler de silinir. Herkese açık bir formdan gönderip hesabınıza kaydetmediğiniz bir talep güvenle size eşleştirilemez; silinmesini ya da bilgilerinizin bir kopyasını iletişim sayfasından isteyin, 30 gün içinde yaparız. Yalnızca yasanın zorunlu kıldığını saklarız.',
          'Uygulamanın konum iznini istediğiniz zaman telefonunuzun ayarlarından geri alabilirsiniz.',
        ],
      ],
    },
    {
      heading: 'Çocuklar',
      body: [
        'Hizmetler yetişkinler içindir. 18 yaşından küçükseniz, yalnızca ebeveyninizin veya vasinizin izniyle kullanın.',
      ],
    },
    {
      heading: 'Bu politikadaki değişiklikler',
      body: [
        'Bu politikayı değiştirdiğimizde bu sayfayı ve yukarıdaki tarihi güncelleriz. Bir değişiklik bilgilerinizin kullanımını etkiliyorsa, önce web sitesinde ve uygulamada size bildiririz.',
      ],
    },
    {
      heading: 'İletişim',
      body: ['Bilgilerinizle ilgili her soru için iletişim sayfasından bize yazın.'],
    },
  ],
};

export const privacyPolicies: Record<Locale, PrivacyPolicy> = { fa, en, de, fr, es, tr };
