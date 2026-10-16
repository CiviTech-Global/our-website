import type { HelpArticleText } from '../../types';

const consult: Record<string, HelpArticleText> = {
  consult: {
    title: 'Demander un conseil',
    summary: 'Demandez un conseil technique ou de carrière ; dites-nous quand vous êtes disponible et nous vous appelons.',
    intro:
      'Votre parcours, un problème technique ou une relecture de code, vos débuts dans le logiciel, ou la préparation d’entretiens et de votre CV : dites-nous de quoi vous voulez parler et quand vous êtes disponible. Nous vous appelons et fixons l’horaire. L’échange peut se faire en ligne, par téléphone ou en personne, et ne vous engage à rien.',
    steps: [
      ['Choisissez un sujet', 'Parcours, problème technique, débuts, entretiens et CV, ou autre chose.'],
      ['Comment et pourquoi', 'En ligne, par téléphone ou en personne, et ce que vous attendez de l’échange.'],
      ['Choisissez un expert ou laissez-nous faire', 'Si vous pensez à quelqu’un du club d’experts, choisissez-le ; sinon, « la personne la plus adaptée ».'],
      ['Indiquez vos disponibilités', 'Choisissez quelques créneaux (un jour et matin, après-midi ou soir). Une heure approximative suffit.'],
      ['Gardez le code de suivi', 'Nous appelons le numéro indiqué ; suivez l’état avec le code et annulez la demande au besoin.'],
    ],
    points: [
      ['Un statut clair', 'Reçue, Horaire en cours de fixation, Horaire confirmé, Tenue — le tout avec le code de suivi.'],
      ['Annulation facile', 'Si vos plans changent, annulez la demande depuis la page de suivi.'],
    ],
    tips: [
      ['Précisez l’objectif', 'Plus votre attente est précise, plus l’échange est utile — par exemple « je veux savoir par où commencer pour passer au back-end ».'],
    ],
    faqs: [
      ['Une consultation m’engage-t-elle à quelque chose ?', 'Non. Elle ne crée aucune obligation de lancer un projet ou de travailler ensemble.'],
      ['Quand appellerez-vous ?', 'Dans l’un des créneaux indiqués, pour confirmer l’horaire. L’horaire confirmé apparaît aussi sur la page de suivi.'],
      ['Faut-il une adresse e-mail ?', 'Non ; un numéro de téléphone suffit. L’e-mail est facultatif.'],
      ['Puis-je annuler la demande ?', 'Oui, avec le code de suivi sur la page Suivre une demande.'],
    ],
    related: {
      experts: 'Les experts que vous pouvez demander par leur nom.',
      'start-project': 'Si, après le conseil, vous êtes prêt à lancer un projet.',
      'my-requests': 'Pour les membres : le code du conseil dans votre liste de demandes.',
    },
  },

  experts: {
    title: 'Club d’experts',
    summary: 'Des ingénieurs et spécialistes qui donnent des conseils techniques et de carrière, avec leurs domaines, langues et années d’expérience.',
    heading: 'Comment fonctionne le club d’experts',
    intro:
      'Le club d’experts réunit des ingénieurs et spécialistes qui donnent des conseils techniques et de carrière — les personnes vers qui nous nous tournons nous-mêmes, et que vous pouvez demander par leur nom. Chaque profil indique si l’expert accepte les consultations.',
    points: [
      ['Conseil technique', 'Pour des décisions comme le choix d’une technologie ou la conception d’une architecture, ou pour examiner un système existant qui ne fonctionne pas comme il le devrait.'],
      ['Conseil de carrière', 'Pour les ingénieurs qui débutent ou changent de voie, auprès de personnes qui ont elles-mêmes parcouru ce chemin.'],
      ['Choisir par le nom', 'La page de chaque expert indique ses spécialités, ses langues et ses années d’expérience. S’il accepte les consultations, vous faites la demande directement depuis cette page.'],
      ['Organiser une consultation', 'Déposez une demande depuis la page « Demander un conseil » en indiquant quelques créneaux qui vous conviennent, et nous vous appelons. Une consultation ne vous engage à rien.'],
    ],
    faqTitle: 'Questions fréquentes sur les consultations',
    faqs: [
      ['Comment réserver une consultation ?', 'Depuis la page « Demander un conseil », ou avec le bouton de consultation sur la page d’un expert. Vous indiquez quelques créneaux, et nous vous appelons.'],
      ['Puis-je choisir l’expert ?', 'Oui. Les experts portant la mention « Accepte les consultations » peuvent être demandés par leur nom.'],
      ['Une consultation m’engage-t-elle sur un projet ?', 'Non. Une consultation ne vous engage à rien.'],
      ['Comment rejoindre le club d’experts ?', 'Écrivez-nous depuis la page « Contact » en décrivant votre expérience et vos spécialités. Les profils du club sont ajoutés et tenus à jour par notre équipe.'],
    ],
    related: {
      consult: 'Le formulaire de demande de conseil.',
      team: 'L’équipe d’ingénierie de Rayan Tamaddon Jahan Gostar.',
      freelancers: 'Si vous cherchez quelqu’un pour faire le travail plutôt qu’un conseil.',
    },
  },
};

export default consult;
