import type { HelpArticleText } from '../../types';

const insurance: Record<string, HelpArticleText> = {
  insurance: {
    title: 'Assurance',
    summary: 'Tous les types d’assurance que nous traitons : trouvez celle qu’il vous faut et faites votre demande en ligne.',
    heading: 'Du choix du contrat à l’appel du spécialiste',
    intro:
      'Les demandes d’assurance en ligne sont l’un de nos services complémentaires, car la sécurité financière, la protection et la tranquillité d’esprit de nos collaborateurs et clients nous tiennent à cœur. Cette page liste toutes les assurances pour lesquelles nous recevons des demandes : de la responsabilité civile et du tous risques pour voitures et motos à la complémentaire santé, la vie, les accidents, la responsabilité, le transport de marchandises, le tous risques chantier et l’assurance téléphone. Chacune a son formulaire, et après votre demande un spécialiste vous appelle pour proposer la meilleure option selon votre besoin et votre budget.',
    steps: [
      ['Trouvez l’assurance', 'Parcourez la liste ou recherchez par nom. Les contrats pour entreprises portent la mention Entreprises.'],
      ['Lisez sa page', 'Chaque page indique les garanties, les exclusions, les documents nécessaires et ce qui influe sur la prime.'],
      ['Remplissez le formulaire', 'Saisissez les informations du contrat et vos coordonnées, et confirmez votre numéro de mobile avec un code à six chiffres.'],
      ['Gardez le code de suivi', 'Après la demande, gardez le code ; il montre l’état et l’heure de rappel convenue.'],
    ],
    points: [
      ['Souscription en ligne', 'Pour les contrats marqués Souscription en ligne, vous donnez tout le nécessaire dans le formulaire.'],
      ['Tarifé par un spécialiste', 'Les contrats marqués Tarifé par un spécialiste sont tarifés par téléphone ; vous donnez l’essentiel et le spécialiste vous appelle.'],
      ['Pas de prix sur le site', 'La prime dépend de vos informations ; le spécialiste vous donne les options et le prix après étude.'],
    ],
    faqs: [
      ['Puis-je acheter et payer l’assurance ici ?', 'Non. Ici, vous déposez la demande ; notre spécialiste vous appelle, étudie les options et organise l’émission du contrat.'],
      ['Pourquoi n’y a-t-il pas de prix sur le site ?', 'La prime dépend notamment du véhicule, de votre historique et des garanties choisies. Ces facteurs figurent sur la page de chaque contrat, et le spécialiste donne le prix exact.'],
      ['Pourquoi confirmer mon numéro ?', 'C’est par ce numéro que le spécialiste vous joint ; le confirmer évite les erreurs de saisie.'],
      ['Faut-il un compte pour une demande d’assurance ?', 'Non. Mais si vous êtes connecté, le code de suivi est enregistré dans Mes demandes.'],
      ['L’assurance que je cherche n’est pas dans la liste.', 'Demandez depuis la page Contact ; nous vous proposerons l’option la plus proche.'],
    ],
    related: {
      'insurance-product': 'La page et le formulaire de chaque contrat.',
      track: 'Suivre une demande d’assurance avec son code.',
      'my-requests': 'Pour les membres : toutes les demandes dans une liste.',
      blog: 'Guides des prix et conseils d’achat d’assurance.',
    },
  },

  'insurance-product': {
    title: 'La page et le formulaire d’un contrat',
    summary: 'Un contrat en détail avec son formulaire : garanties, exclusions, documents, facteurs de prix et demande.',
    intro:
      'Chaque contrat a sa propre page. « En bref » en donne le résumé ; viennent ensuite les garanties et les garanties optionnelles, les exclusions, les documents nécessaires, ce qui influe sur la prime et que faire en cas de sinistre. Le formulaire de demande est sur la même page, et ses champs sont propres à ce contrat.',
    steps: [
      ['Informations du contrat', 'Remplissez les champs propres à ce contrat ; ils sont nécessaires pour un prix exact.'],
      ['Coordonnées', 'Indiquez votre nom et comment vous joindre ; nous appelons pour organiser et envoyer le contrat.'],
      ['Confirmez votre numéro', 'Confirmez votre mobile avec le code à six chiffres ; sans cela, la demande ne peut pas être envoyée.'],
      ['Envoyez et gardez le code', 'Envoyez la demande et gardez le code de suivi.'],
    ],
    tips: [
      ['Lisez les exclusions avant la demande', 'La liste « Non couvert » compte autant que les garanties et évite les déceptions en cas de sinistre.'],
      ['Préparez les documents', 'Ayez les documents nécessaires sous la main avant l’appel du spécialiste : le contrat sera émis plus vite.'],
    ],
    faqs: [
      ['Que se passe-t-il après la demande ?', 'Un spécialiste vous appelle au plus tôt pour étudier les options ; l’heure convenue apparaît sur la page de suivi.'],
      ['Que signifie « Tarifé par un spécialiste » ?', 'Ce contrat est tarifé par un spécialiste ; vous donnez l’essentiel pour qu’il vous appelle en connaissance de cause.'],
      ['Je n’ai pas reçu le code de confirmation.', 'Patientez un instant et appuyez sur Renvoyer, ou vérifiez le numéro et corrigez-le avec Changer de numéro.'],
      ['Où mes informations apparaissent-elles ?', 'La page de suivi n’affiche que l’état de la demande, pas vos données personnelles.'],
    ],
    related: {
      insurance: 'Retour à la liste des assurances.',
      track: 'Suivre la demande avec son code.',
      'my-requests': 'Pour les membres : vos codes dans une liste.',
    },
  },
};

export default insurance;
