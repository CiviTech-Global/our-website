import type { HelpArticleText } from '../../types';

const account: Record<string, HelpArticleText> = {
  login: {
    title: 'Connexion',
    summary: 'Connectez-vous avec votre e-mail et votre mot de passe ; si la connexion en deux étapes est active, le code de votre application d’authentification est aussi demandé.',
    intro:
      'La connexion vous donne accès à votre tableau de bord : profil, vérification d’identité, codes de suivi, messages et activité sur la place de marché. Si vous avez activé la connexion en deux étapes, le code à six chiffres de votre application d’authentification (ou un code de récupération) est demandé après le mot de passe.',
    steps: [
      ['E-mail et mot de passe', 'Utilisez l’adresse e-mail de votre inscription.'],
      ['Code en deux étapes, s’il est actif', 'Saisissez le code à six chiffres de votre application ou un code de récupération.'],
      ['Reprenez où vous en étiez', 'Si vous êtes arrivé à la connexion depuis une page comme une annonce, vous y revenez ensuite.'],
    ],
    faqs: [
      ['J’ai oublié mon mot de passe.', 'Utilisez « Mot de passe oublié ? ». Si aucun e-mail ne peut être envoyé, la page vous oriente vers le formulaire de contact.'],
      ['Je n’ai plus accès à mon application d’authentification.', 'Saisissez l’un des codes de récupération enregistrés lors de l’activation. Chaque code ne sert qu’une fois.'],
      ['Comment me déconnecter de tous les appareils ?', 'Dans la section sécurité de votre profil, choisissez « Se déconnecter partout ».'],
    ],
    related: {
      register: 'Pas encore de compte ?',
      'password-reset': 'Réinitialiser votre mot de passe.',
      dashboard: 'Ce qui vous attend une fois connecté.',
    },
  },

  register: {
    title: 'Inscription',
    summary: 'Créez un compte pour publier annonces et projets, envoyer des propositions, vendre des livres et regrouper vos codes de suivi.',
    intro:
      'Aucun compte n’est nécessaire pour demander un projet, une assurance ou un conseil, envoyer un CV ou nous contacter. Un compte sert à ce qui engage votre identité : publier une offre ou un projet, envoyer des propositions, postuler, acheter et vendre des livres et inscrire une boutique. Vos codes de suivi restent aussi réunis dans Mes demandes.',
    steps: [
      ['L’essentiel', 'Saisissez prénom, nom, e-mail et un mot de passe.'],
      ['Vers votre tableau de bord', 'Après l’inscription, vous êtes connecté immédiatement.'],
      ['Terminez la vérification', 'Pour la place de marché, confirmez votre identité depuis votre tableau de bord.'],
    ],
    faqs: [
      ['L’inscription est-elle payante ?', 'Non.'],
      ['Pourquoi vérifier aussi mon identité après l’inscription ?', 'L’inscription crée un compte ; la vérification confirme qu’une vraie personne est derrière. Elle est nécessaire pour acheter et vendre, recruter et les projets.'],
      ['Quelles sont les règles du mot de passe ?', 'Elles sont indiquées sous le champ ; choisissez un mot de passe long et unique.'],
    ],
    related: {
      login: 'Si vous avez déjà un compte.',
      'verify-email': 'Confirmer votre e-mail.',
      verification: 'La vérification d’identité après l’inscription.',
    },
  },

  'password-reset': {
    title: 'Réinitialiser le mot de passe',
    summary: 'Mot de passe oublié ? Demandez un lien de réinitialisation et choisissez-en un nouveau.',
    intro:
      'Sur la page de réinitialisation, vous saisissez l’e-mail de votre compte pour recevoir un lien ; en l’ouvrant, vous choisissez un nouveau mot de passe. Si le site ne peut pas envoyer d’e-mail à ce moment-là, la page le dit clairement et vous oriente vers le formulaire de contact.',
    steps: [
      ['Saisissez votre e-mail', 'Celui de votre inscription.'],
      ['Ouvrez le lien', 'Le lien mène à la page de choix d’un nouveau mot de passe.'],
      ['Choisissez un nouveau mot de passe', 'Saisissez-le deux fois et connectez-vous avec.'],
    ],
    faqs: [
      ['Le lien n’est pas arrivé.', 'Vérifiez vos courriers indésirables. Si la page a indiqué que l’envoi d’e-mail est impossible pour l’instant, écrivez depuis Contact.'],
      ['Le lien ne fonctionne pas.', 'Il a peut-être expiré ; demandez une nouvelle réinitialisation.'],
    ],
    related: {
      login: 'Retour à la connexion.',
      profile: 'Changer de mot de passe une fois connecté.',
    },
  },

  'verify-email': {
    title: 'Confirmer votre e-mail',
    summary: 'Ouvrez le lien de confirmation pour confirmer l’adresse e-mail de votre compte.',
    intro:
      'Cette page s’ouvre depuis le lien envoyé pour confirmer votre adresse e-mail. À l’ouverture, le lien est vérifié et le résultat s’affiche. Confirmer l’e-mail diffère de la vérification d’identité : la première prouve que l’adresse vous appartient, la seconde qui vous êtes.',
    faqs: [
      ['Le lien a expiré.', 'Connectez-vous et demandez un nouveau lien depuis votre tableau de bord, ou faites-vous aider via Contact.'],
      ['Confirmer l’e-mail équivaut-il à vérifier son identité ?', 'Non. Vous vérifiez votre identité séparément, depuis votre tableau de bord.'],
    ],
    related: {
      register: 'Créer un compte.',
      login: 'Se connecter.',
      verification: 'La vérification d’identité pour la place de marché.',
    },
  },
};

export default account;
