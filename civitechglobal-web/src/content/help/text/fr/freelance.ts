import type { HelpArticleText } from '../../types';

const freelance: Record<string, HelpArticleText> = {
  projects: {
    title: 'Projets freelance',
    summary: 'Projets au forfait et à l’heure de clients vérifiés : trouvez un projet, envoyez une proposition et menez le travail.',
    intro:
      'Les clients publient ici des projets et les freelances leur envoient des propositions. Chaque projet est vérifié avant publication et peut être au forfait ou à l’heure. Tout le monde peut consulter les projets, mais pour publier un projet ou envoyer une proposition, il faut être connecté et avoir vérifié son identité. Le paiement ne passe pas par le site ; client et freelance l’organisent directement entre eux.',
    steps: [
      ['Trouvez un projet', 'Cherchez dans les titres, descriptions ou compétences ; triez et filtrez par catégorie, type de tarification, niveau d’expérience ou moins de propositions.'],
      ['Lisez le projet', 'Voyez le budget, la durée, les compétences et le parcours du client (vérifié, taux d’embauche et note).'],
      ['Envoyez une proposition', 'Indiquez votre prix ou taux horaire, le délai et un plan par jalons, et répondez aux questions du client.'],
      ['Menez le travail', 'Si vous êtes retenu, la collaboration s’ouvre dans Mes collaborations ; l’échange et les jalons se poursuivent dans votre tableau de bord.'],
    ],
    points: [
      ['Forfait ou à l’heure', 'Sur les projets à l’heure, vous saisissez vos heures et le client les approuve.'],
      ['Paiement par jalons', 'Découpez le travail en jalons avec un montant et un délai chacun ; leur total doit égaler votre proposition.'],
      ['NDA', 'Certains projets exigent la signature d’un accord de confidentialité avant de lire la description et les pièces jointes.'],
      ['Visibilité du projet', 'Un projet peut être visible par tous, par les membres seulement ou par les seuls freelances invités.'],
    ],
    tips: [
      ['Créez une alerte projet', 'Créez une alerte pour votre recherche afin de ne pas manquer les nouveaux projets correspondants.'],
    ],
    faqs: [
      ['Le site détient-il l’argent ou gère-t-il le paiement ?', 'Non. Le paiement ne passe pas par le site ; client et freelance conviennent directement du montant et du moyen. Le plan par jalons aide à garder cet accord clair.'],
      ['Pourquoi la vérification est-elle requise ?', 'Pour publier un projet, envoyer une proposition ou signer un NDA. Chaque partie sait qu’elle a affaire à une vraie personne.'],
      ['Quand mon projet sera-t-il publié ?', 'Après l’envoi en vérification, en général en quelques heures.'],
      ['Combien de propositions puis-je envoyer ?', 'Une par projet ; vous pouvez la retirer avant la décision du client.'],
    ],
    related: {
      'project-detail': 'La page de chaque projet et le formulaire de proposition.',
      'client-projects': 'Pour les clients : publier et gérer des projets.',
      'my-proposals': 'Pour les freelances : propositions, invitations et collaborations.',
      freelancers: 'Les freelances que vous pouvez inviter à votre projet.',
    },
  },

  'project-detail': {
    title: 'Une page de projet',
    summary: 'Le détail d’un projet, le parcours du client et le formulaire de proposition.',
    intro:
      'Chaque page de projet présente la description, le budget ou la fourchette de taux horaire, la durée, le niveau d’expérience souhaité, les compétences et le parcours du client. Si le projet exige un NDA, la description complète et les pièces jointes s’ouvrent après sa signature. Si le client vous a invité, la mention Invité s’affiche.',
    steps: [
      ['Lisez, puis décidez', 'Regardez le budget, la durée et les questions du client avant d’écrire une proposition.'],
      ['Signez le NDA si nécessaire', 'Saisissez votre nom en guise de signature pour ouvrir la description et les fichiers.'],
      ['Rédigez votre proposition', 'Votre prix ou taux horaire, un plan par jalons, le délai et les réponses aux questions.'],
      ['Attendez la réponse', 'Voyez l’état de la proposition dans Mes propositions ; les messages du client arrivent dans Messages.'],
    ],
    tips: [
      ['Une proposition pour ce projet', 'Traitez le problème de ce projet et répondez précisément aux questions du client ; les propositions génériques sont moins retenues.'],
    ],
    faqs: [
      ['À quoi m’engage la signature du NDA ?', 'À garder confidentiels la description du projet, les pièces jointes et tout ce que le client vous en dit.'],
      ['Puis-je décliner une invitation ?', 'Oui, avec Décliner l’invitation. Le client en est informé.'],
      ['Que se passe-t-il si le projet est fermé ?', 'Un projet fermé n’accepte plus de propositions ; les précédentes restent dans votre liste.'],
    ],
    related: {
      projects: 'Retour à tous les projets.',
      'my-proposals': 'Les propositions que vous avez envoyées.',
      verification: 'Requise avant d’envoyer une proposition.',
      messages: 'Échanger avec le client.',
    },
  },

  'freelance-services': {
    title: 'Services freelance',
    summary: 'Du travail prêt à l’emploi à prix fixe : choisissez une formule et commandez.',
    intro:
      'Les services freelance fonctionnent à l’inverse des projets : un freelance propose ce qu’il fait à un prix et un délai fixés, et vous commandez. Chaque service peut avoir jusqu’à trois formules : Basique, Standard et Premium. Chaque service est vérifié avant publication.',
    steps: [
      ['Trouvez un service', 'Cherchez et triez par catégorie, prix ou note.'],
      ['Choisissez une formule', 'Comparez ce que comprend chaque formule et le délai de livraison.'],
      ['Commandez', 'Une fois connecté et vérifié, envoyez la commande en décrivant votre besoin.'],
      ['Attendez le vendeur', 'Le vendeur accepte ou refuse la commande ; suivez son état dans Commandes de votre tableau de bord.'],
    ],
    faqs: [
      ['Comment se fait le paiement ?', 'Pas via le site ; une fois la commande acceptée, acheteur et vendeur l’organisent directement.'],
      ['Quelle différence entre un service et un projet ?', 'Avec un projet, vous décrivez le travail et recevez des propositions ; avec un service, le freelance propose un travail prêt à prix fixe.'],
      ['Comment proposer mon propre service ?', 'Créez-le dans Mes services de votre tableau de bord et envoyez-le pour vérification.'],
    ],
    related: {
      'my-services': 'Pour les vendeurs : créer des services et gérer les commandes.',
      freelancers: 'Les profils des vendeurs.',
      projects: 'Si votre besoin n’existe pas tout prêt et doit être décrit, publiez un projet.',
    },
  },

  freelancers: {
    title: 'Freelances et profils',
    summary: 'Trouvez des freelances par compétence, langue et disponibilité, lisez leurs profils et invitez-les.',
    intro:
      'L’annuaire des freelances présente les profils publics des membres qui ont un nom d’utilisateur et indiquent des compétences ou proposent un service actif et approuvé : compétences, langues, pays, disponibilité, notes et exemples de travaux. Les coordonnées n’y sont jamais affichées.',
    steps: [
      ['Recherchez', 'Filtrez par compétence, catégorie, langue, pays, disponibilité ou vérification, et triez par note.'],
      ['Lisez un profil', 'Badge de vérification, notes, exemples de travaux et services proposés.'],
      ['Invitez', 'Les clients peuvent inviter un freelance par son nom d’utilisateur à envoyer une proposition pour leur projet.'],
    ],
    faqs: [
      ['Comment apparaître dans cet annuaire ?', 'Choisissez un nom d’utilisateur et ajoutez vos compétences dans votre tableau de bord, ou proposez un service approuvé. Des exemples de travaux augmentent les chances d’invitation.'],
      ['Que signifie le badge de vérification ?', 'Que notre équipe a vérifié l’identité de ce membre.'],
      ['D’où viennent les notes ?', 'Des personnes qui ont noté ce membre à la fin d’une collaboration.'],
    ],
    related: {
      profile: 'Créer et modifier votre propre profil public.',
      'freelance-services': 'Les services proposés par les freelances.',
      projects: 'Les projets auxquels vous pouvez répondre.',
    },
  },
};

export default freelance;
