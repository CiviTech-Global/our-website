import type { HelpArticleText } from '../../types';

const jobs: Record<string, HelpArticleText> = {
  jobs: {
    title: 'Offres d’emploi',
    summary: 'Les offres d’employeurs vérifiés partout en Iran et à distance, avec recherche, filtres et alertes.',
    intro:
      'Cette rubrique liste des offres d’emploi, de Rayan Tamaddon Jahan Gostar et d’autres entreprises. Seuls les employeurs dont notre équipe a vérifié l’identité peuvent publier, et chaque annonce est vérifiée avant publication. Tout est gratuit pour les candidats : recherche, annonces enregistrées, alertes et candidature.',
    steps: [
      ['Recherchez et filtrez', 'Cherchez par intitulé, compétence ou entreprise, et filtrez par catégorie, province, pays, télétravail ou salaire minimum.'],
      ['Ouvrez une annonce', 'Chaque annonce indique les exigences, la rémunération et les avantages, les compétences et l’entreprise.'],
      ['Enregistrez ou créez une alerte', 'Enregistrez les annonces intéressantes ; « Recevoir des alertes pour cette recherche » vous signale les nouvelles.'],
      ['Postulez', 'Connectez-vous et terminez la vérification d’identité pour envoyer votre CV ; la candidature va directement à l’employeur.'],
    ],
    points: [
      ['Des employeurs vérifiés', 'L’identité de chaque employeur est contrôlée, et chaque annonce est lue avant sa mise en ligne.'],
      ['Pages par province et catégorie', 'Les offres d’une province, d’un pays ou d’une catégorie ont chacune leur adresse, à enregistrer.'],
      ['Télétravail international', 'Des postes à distance ouverts aux candidats de tous les pays, ou d’un pays donné.'],
      ['Suggestions selon votre activité', 'Connecté, vous voyez des annonces proches de vos candidatures et de vos annonces enregistrées.'],
    ],
    tips: [
      ['Créez une alerte', 'Au lieu de vérifier chaque jour, enregistrez votre recherche avec « Recevoir des alertes pour cette recherche » ; chaque nouvelle annonce correspondante vous est signalée une fois.'],
    ],
    faqs: [
      ['Postuler est-il payant ?', 'Non. Recherche, annonces enregistrées, alertes et candidature sont gratuites pour les candidats.'],
      ['Qui peut publier ici ?', 'Seuls les employeurs dont notre équipe a vérifié l’identité, et chaque annonce est vérifiée avant publication.'],
      ['Comment publier une offre ?', 'Connectez-vous, terminez la vérification d’identité, créez une annonce dans Mes annonces de votre tableau de bord et envoyez-la pour vérification.'],
      ['Pourquoi vérifier mon identité pour postuler ?', 'Pour que l’employeur sache qu’il a affaire à une vraie personne — la même raison pour laquelle les employeurs sont vérifiés.'],
      ['Quelle différence avec « Envoyer votre CV » ?', '« Envoyer votre CV » sert à travailler chez Rayan Tamaddon Jahan Gostar ; cette rubrique concerne des offres précises, de chez nous ou d’autres entreprises.'],
    ],
    related: {
      'job-detail': 'La page de chaque annonce et le formulaire de candidature.',
      companies: 'Les entreprises qui recrutent.',
      'my-applications': 'Pour les candidats : candidatures, annonces enregistrées et alertes.',
      'my-jobs': 'Pour les employeurs : publier et gérer des offres.',
    },
  },

  'job-detail': {
    title: 'Une offre d’emploi',
    summary: 'Le détail d’un poste, votre degré de correspondance et le formulaire de candidature.',
    intro:
      'Chaque annonce présente le poste, les exigences, la rémunération et les avantages, les compétences demandées et l’entreprise. Si vous avez ajouté vos compétences à votre profil, elle indique aussi combien vous en possédez. Votre candidature va directement à l’employeur, et nous vous informons à chaque étape.',
    steps: [
      ['Lisez l’annonce', 'Vérifiez les exigences, la rémunération et le type de poste ; si l’employeur répond habituellement, son taux de réponse est affiché.'],
      ['Voyez votre correspondance', 'La section « Dans quelle mesure correspondez-vous ? » montre les compétences que vous avez et celles qui valent la peine d’être apprises.'],
      ['Connectez-vous et faites-vous vérifier', 'Le formulaire de candidature s’ouvre une fois connecté et vérifié.'],
      ['Envoyez votre CV', 'Envoyez la candidature et suivez son état dans Mes candidatures.'],
    ],
    tips: [
      ['Ajoutez vos compétences à votre profil', 'Sans compétences dans le profil, votre correspondance avec une annonce ne peut pas être calculée.'],
    ],
    faqs: [
      ['Comment savoir si l’employeur a vu mon CV ?', 'Quand l’employeur ouvre votre candidature, son état devient « Vue par l’employeur », et nous vous informons à chaque changement d’étape.'],
      ['Puis-je retirer ma candidature ?', 'Oui, dans Mes candidatures. Tant que l’annonce est ouverte, vous pouvez postuler de nouveau.'],
      ['Puis-je postuler deux fois à la même annonce ?', 'Non ; si vous avez déjà postulé, la date s’affiche sur l’annonce.'],
      ['Je ne vois pas le salaire.', 'Certains employeurs ne l’indiquent pas ; l’annonce affiche alors « À négocier ».'],
    ],
    related: {
      jobs: 'Retour à toutes les annonces.',
      companies: 'La page de l’entreprise derrière l’annonce.',
      'my-applications': 'Suivre vos candidatures envoyées.',
      verification: 'La vérification d’identité requise avant de postuler.',
    },
  },

  companies: {
    title: 'Entreprises',
    summary: 'Les employeurs vérifiés, la page de chaque entreprise et ses postes ouverts.',
    intro:
      'Chaque employeur vérifié peut avoir une page entreprise : présentation, taille de l’organisation, images et tous ses postes ouverts. Ici, vous recherchez des entreprises et passez de la page de chacune à ses annonces.',
    steps: [
      ['Trouvez l’entreprise', 'Recherchez par nom ou parcourez par taille d’organisation.'],
      ['Lisez la page', 'Voyez la présentation de l’entreprise et ses postes ouverts.'],
      ['Vous êtes employeur ?', 'Une fois vérifié, créez votre page entreprise depuis votre tableau de bord ; chaque offre publiée y renvoie.'],
    ],
    faqs: [
      ['Comment créer une page entreprise ?', 'Allez dans Page entreprise de votre tableau de bord. Votre identité doit d’abord être vérifiée.'],
      ['Pourquoi une page entreprise a-t-elle été masquée ?', 'Si une page enfreint les règles du site, notre équipe la masque ; son propriétaire peut demander la raison au support.'],
    ],
    related: {
      jobs: 'Toutes les offres.',
      'my-jobs': 'Pour les employeurs : annonces et page entreprise.',
    },
  },
};

export default jobs;
