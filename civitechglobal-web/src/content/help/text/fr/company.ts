import type { HelpArticleText } from '../../types';

const company: Record<string, HelpArticleText> = {
  home: {
    title: 'Accueil',
    summary: 'Le point de départ du site : qui est Rayan Tamaddon Jahan Gostar, ce que nous construisons et où aller ensuite.',
    heading: 'Commencez ici',
    intro:
      'Rayan Tamaddon Jahan Gostar est une société d’ingénierie logicielle qui conçoit des logiciels sur mesure, des applications web et mobiles, des plateformes d’entreprise et des solutions d’analyse de données. En plus de présenter l’entreprise, ce site réunit plusieurs services : demandes de projet logiciel, demandes d’assurance en ligne, conseil avec des experts, offres d’emploi, projets freelance et un marché du livre. Chacun a son guide, et tous sont rassemblés dans le centre d’aide.',
    steps: [
      ['Dites ce que vous cherchez', 'Pour commander un logiciel, allez dans Services ou directement dans Lancer un projet ; pour une assurance, dans Assurance ; pour du travail ou un projet, dans la Place de marché.'],
      ['Ouvrez le guide de chaque page', 'Sur chaque page, le bouton Guide de la barre supérieure (ou la touche ?) ouvre l’explication de la page à côté d’elle.'],
      ['Déposez une demande et gardez le code', 'Chaque demande a un code de suivi ; avec lui, Suivre une demande montre où elle en est.'],
      ['Avec un compte, tout est dans votre tableau de bord', 'Connecté, vos codes de suivi, vos messages et votre activité sur la place de marché sont réunis dans votre tableau de bord.'],
    ],
    points: [
      ['Développement logiciel', 'De l’idée au déploiement et à la maintenance, avec une estimation des coûts et une proposition technique gratuites et sans engagement.'],
      ['Services complémentaires', 'Demandes en ligne pour de nombreux types d’assurance, avec un formulaire par produit, et conseil technique et de carrière auprès d’experts.'],
      ['Place de marché', 'Offres d’emploi et projets freelance, chacun vérifié avant publication, et un marché du livre entre membres.'],
      ['Six langues', 'Le site existe en persan, anglais, turc, allemand, français et espagnol ; changez de langue depuis la barre supérieure.'],
    ],
    faqs: [
      ['Que fait exactement Rayan Tamaddon Jahan Gostar ?', 'La conception et le développement de logiciels sur mesure, d’applications web et mobiles, de plateformes d’entreprise et de technologie civique, et l’analyse et la visualisation de données. Une grande partie de notre travail est open source.'],
      ['Quel est le lien entre CiviTech Global et Rayan Tamaddon Jahan Gostar ?', 'CiviTech Global est la marque internationale de Rayan Tamaddon Jahan Gostar : une seule entreprise, une seule équipe.'],
      ['Dois-je m’inscrire pour utiliser le site ?', 'Pas pour demander un projet, une assurance ou un conseil, envoyer un CV ou nous contacter. Un compte est nécessaire pour publier une annonce, répondre à un projet ou vendre un livre.'],
      ['Comment savoir où en est ma demande ?', 'Avec le code de suivi reçu lors de l’envoi, sur Suivre une demande. Si vous étiez connecté, le code est aussi enregistré dans Mes demandes.'],
      ['Le site a-t-il un label de confiance ?', 'Oui. Le label de confiance du commerce électronique ENAMAD figure en bas de chaque page.'],
    ],
    related: {
      services: 'La liste complète des services de développement et le déroulement d’un projet.',
      'start-project': 'Le chemin le plus court vers une proposition technique et une estimation gratuites.',
      about: 'La mission, la vision et les valeurs derrière notre travail.',
      'help-centre': 'Tous les guides au même endroit, avec recherche.',
    },
  },

  services: {
    title: 'Services de conception et de développement de logiciels',
    summary: 'Ce que nous construisons, les étapes de chaque projet et nos services complémentaires en un coup d’œil.',
    intro:
      'Cette page présente nos quatre services principaux : le développement intelligent de logiciels sur mesure, le développement d’applications web et mobiles, les plateformes d’entreprise et de technologie civique, et l’analyse et la visualisation de données. Chaque projet, quelle que soit sa taille, passe par quatre étapes : idéation et conseil, analyse et conception, développement et tests, déploiement et support. Les services d’assurance figurent sur la même page comme service complémentaire.',
    steps: [
      ['Trouvez le bon service', 'Lisez les cartes ; si votre besoin en couvre plusieurs, aucun problème — vous décrivez tout dans la demande de projet.'],
      ['Voyez les étapes', 'La section « Le déroulement d’un projet » montre ce qui se passe de votre demande à la livraison et au support.'],
      ['Déposez une demande de projet', 'Le bouton Lancer un projet ouvre le formulaire ; la proposition technique et l’estimation sont gratuites.'],
    ],
    points: [
      ['Une proposition écrite avant tout engagement', 'Vous voyez le périmètre, les livrables, les hypothèses, les exclusions, le calendrier et la fourchette de prix avant le début du travail.'],
      ['Un développement par étapes', 'Le logiciel est construit en itérations courtes et visibles, pour que vous suiviez l’avancement et donniez votre avis à chaque étape.'],
      ['Open source, sans dépendance', 'Construit sur des standards ouverts et des technologies open source, pour que votre logiciel reste librement extensible.'],
      ['À vos côtés après la livraison', 'Maintenance, mises à jour et support technique après la mise en ligne.'],
    ],
    faqs: [
      ['Acceptez-vous les petits projets ?', 'Oui. La taille n’est pas notre critère ; si quelque chose sort de nos compétences, nous le disons honnêtement dès le départ.'],
      ['Comment connaître le coût ?', 'Après votre demande, vous recevez une proposition écrite avec une fourchette de prix. L’étude et la rédaction de la proposition ne coûtent rien.'],
      ['Combien de temps cela prend-il ?', 'Cela dépend du périmètre. Le calendrier détaillé fait partie de la proposition écrite, et vous le voyez avant le début du travail.'],
      ['Pouvez-vous reprendre ou maintenir un logiciel existant ?', 'Oui. « Reprise ou modernisation d’un logiciel existant » et « Maintenance et support » sont des types de projet du formulaire.'],
      ['Puis-je parler à quelqu’un avant de faire une demande ?', 'Oui. Demandez un échange technique sur la page Conseil ; une consultation ne vous engage à rien.'],
    ],
    related: {
      'start-project': 'Le formulaire : l’étape suivante après le choix d’un service.',
      portfolio: 'Des exemples de nos réalisations et des technologies utilisées.',
      consult: 'Si vous ne savez pas encore ce qu’il vous faut, parlons-en d’abord.',
      insurance: 'Notre service complémentaire : les demandes d’assurance en ligne.',
    },
  },

  'start-project': {
    title: 'Demande de projet logiciel',
    summary: 'Décrivez votre besoin et recevez une proposition technique, un calendrier et une fourchette de prix, gratuitement et sans engagement.',
    intro:
      'Ce formulaire transforme votre demande en proposition formelle. Plus vous décrivez clairement le besoin, les objectifs, les contraintes et le budget, plus la proposition est précise. Après l’envoi, vous recevez un code de suivi ; nos spécialistes étudient la demande, posent des questions sur ce qui reste flou, puis envoient une proposition écrite que vous lisez avec le même code et acceptez ou refusez.',
    steps: [
      ['Présentez-vous', 'Nom, e-mail et téléphone sont obligatoires. E-mail et téléphone forment ensemble votre identité ; indiquez les mêmes dans vos demandes suivantes.'],
      ['Décrivez le projet', 'Choisissez le titre, le type de projet, le mode de collaboration et les plateformes, et décrivez avec vos mots ce qui ne fonctionne pas aujourd’hui et ce que vous attendez.'],
      ['Indiquez délais et budget', 'Donnez une fourchette de budget, pas un montant exact. Sans budget défini, choisissez cette option.'],
      ['Joignez des documents', 'Jusqu’à 8 fichiers (10 Mo chacun, 25 Mo au total). Si vous avez besoin d’un accord de confidentialité avant l’étude, cochez l’option NDA.'],
      ['Gardez le code de suivi', 'Copiez le code après l’envoi. Vous lisez la proposition avec lui sur Suivre une demande.'],
    ],
    points: [
      ['Une proposition formelle et gratuite', 'Périmètre, livrables, hypothèses, ce qui n’est pas inclus, calendrier et fourchette de prix.'],
      ['Sans engagement avant acceptation', 'Tant que vous n’acceptez pas la proposition, vous n’êtes engagé à rien ; si vous la refusez, l’affaire s’arrête là.'],
      ['Confidentialité', 'Ce que vous envoyez reste chez nous, et un NDA est signé avant l’étude si vous en avez besoin.'],
    ],
    tips: [
      ['Ne laissez pas « Hors périmètre » vide', 'Savoir dès le départ ce que vous ne voulez pas rend la proposition plus précise et le prix plus réaliste.'],
      ['Pourquoi une fourchette de budget ?', 'À ce stade, une estimation logicielle est précise à environ −25 % / +75 % ; une fourchette est plus réaliste qu’un chiffre pour les deux parties.'],
      ['Connectez-vous pour ne pas perdre le code', 'Si vous êtes connecté avant l’envoi, le code de suivi est enregistré automatiquement dans Mes demandes.'],
    ],
    faqs: [
      ['L’étude et la proposition sont-elles gratuites ?', 'Oui. Les deux sont gratuites.'],
      ['Quand la proposition sera-t-elle prête ?', 'Cela dépend de la complexité. Consultez l’état à tout moment avec votre code ; si nous avons des questions, nous les posons avant de rédiger la proposition.'],
      ['Que se passe-t-il si je refuse la proposition ?', 'Rien ; vous refusez et c’est tout. Ce que vous avez envoyé reste chez nous et n’est transmis à personne.'],
      ['J’ai perdu mon code de suivi.', 'Si vous étiez connecté, il est dans Mes demandes. Sinon, écrivez depuis Contact avec le même e-mail et le même téléphone.'],
      ['Je ne sais pas quel type de projet choisir.', 'Choisissez le plus proche, ou Autre, et expliquez dans la description ; nous corrigeons lors de l’étude.'],
    ],
    related: {
      services: 'Si vous ne savez pas encore quel service convient.',
      track: 'Là où vous lisez la proposition avec votre code et l’acceptez ou la refusez.',
      'my-requests': 'Pour les membres : tous vos codes de suivi dans une liste.',
      consult: 'Un échange technique avant la demande, sans engagement.',
    },
  },

  about: {
    title: 'À propos',
    summary: 'Qui est Rayan Tamaddon Jahan Gostar : mission, vision, valeurs et ce que nous faisons.',
    intro:
      'Cette page présente l’entreprise : notre mission est d’aider la civilisation à tirer chaque jour davantage parti de la technologie, en construisant des logiciels sur mesure et open source pour les particuliers, les entreprises et les organisations. Notre vision est une civilisation pleinement intelligente, et en chemin nous voulons être un foyer pour l’ingénierie open source et pour la prochaine génération d’ingénieurs.',
    points: [
      ['Mission et vision', 'Pourquoi nous faisons cela et où nous voulons aller.'],
      ['Valeurs', 'Innovation, transparence, communauté et excellence, et ce qu’elles signifient au quotidien.'],
      ['Mieux nous connaître', 'Des liens vers l’équipe, les projets, les clients, les partenaires et le blog.'],
    ],
    faqs: [
      ['Qu’est-ce que CiviTech Global ?', 'La marque internationale de Rayan Tamaddon Jahan Gostar.'],
      ['Pourquoi l’open source ?', 'Le code est transparent et vérifiable, ne dépend d’aucun fournisseur, une large communauté éprouve sa sécurité et il coûte moins cher à posséder.'],
      ['Comment travailler avec vous ?', 'Pour un projet, Lancer un projet ; pour un emploi, Envoyer votre CV ; pour un stage, Bénévolat et stage.'],
    ],
    related: {
      team: 'Les personnes qui font le travail, et leur façon de travailler.',
      portfolio: 'Ce que nous avons construit jusqu’ici.',
      customers: 'Les organisations dont nous avons construit les logiciels.',
      join: 'Si vous voulez faire partie de cette équipe.',
    },
  },

  team: {
    title: 'Notre équipe',
    summary: 'Les ingénieurs, designers et collaborateurs qui construisent cette plateforme et les projets de nos clients.',
    heading: 'Comment notre équipe travaille',
    intro:
      'Derrière chaque projet, il y a un groupe d’ingénieurs logiciels qui relisent le travail les uns des autres, consignent les décisions par écrit et répondent du travail du premier message jusqu’à la livraison. Rayan Tamaddon Jahan Gostar repose sur l’open source, sur la collaboration avec une communauté mondiale d’ingénieurs et sur une porte ouverte aux débutants. Voici ce que cela veut dire au quotidien.',
    points: [
      ['Un code relu et testé', 'Chaque modification est relue par un autre ingénieur et couverte par des tests avant sa mise en production. L’objectif : un code qui fonctionne pendant des années, pas seulement le jour de la livraison.'],
      ['Des décisions sur papier', 'Le périmètre, les hypothèses, ce qui n’est pas inclus, le calendrier et la fourchette de prix figurent dans une proposition écrite. Ce qui n’est pas écrit n’est pas convenu.'],
      ['Accessible dès le premier jour', 'Ce que nous construisons fonctionne au clavier et avec un lecteur d’écran, et s’ouvre sur un téléphone bon marché. C’est une décision, pas une fonction accessoire.'],
      ['Open source, porte ouverte', 'Une partie de notre travail se fait dans des projets open source avec une communauté mondiale, et le programme de bénévolat et de stage permet aux débutants de travailler sur de vrais projets.'],
    ],
    faqTitle: 'Questions fréquentes sur l’équipe',
    faqs: [
      ['Comment rejoindre l’équipe ?', 'Envoyez votre CV depuis la page « Envoyer votre CV ». Nous le lisons et vous contactons dès qu’un poste correspondant à votre expérience s’ouvre.'],
      ['Je débute. Y a-t-il une place pour moi ?', 'Oui. Le programme « Bénévolat et stage » existe précisément pour cela : de vrais projets, aux côtés d’ingénieurs expérimentés.'],
      ['Quel est le lien entre CiviTech Global et Rayan Tamaddon Jahan Gostar ?', 'CiviTech Global est la marque internationale de Rayan Tamaddon Jahan Gostar : une seule entreprise, une seule équipe.'],
      ['Comment lancer un projet avec cette équipe ?', 'Déposez votre demande depuis la page « Lancer un projet ». Vous recevez un code de suivi, et une proposition écrite est préparée pour vous, gratuitement et sans engagement.'],
    ],
    related: {
      join: 'Envoyer votre CV pour un emploi.',
      volunteer: 'La voie des débutants : bénévolat et stage sur de vrais projets.',
      experts: 'Des experts qui donnent des conseils techniques et de carrière.',
      'start-project': 'Lancer un projet avec cette équipe.',
    },
  },

  portfolio: {
    title: 'Nos projets',
    summary: 'Projets en cours et livrés : les plateformes, applications et systèmes que nous avons construits.',
    intro:
      'Cette page montre des exemples de notre travail. Pour chaque projet, vous voyez une courte description, son statut (en cours ou livré), les technologies utilisées et, le cas échéant, des captures d’écran et un lien. Si un projet a été réalisé pour un client nommé, celui-ci est indiqué.',
    steps: [
      ['Parcourez la liste', 'Filtrez les projets par statut (en cours ou livré) ou par technologie.'],
      ['Ouvrez les captures', 'La galerie de chaque projet montre son apparence et son fonctionnement.'],
      ['Vous voulez quelque chose de semblable ?', 'Mentionnez ce projet dans votre demande pour que nous comprenions exactement ce que vous voulez.'],
    ],
    faqs: [
      ['Tous vos projets sont-ils ici ?', 'Pas tous. Certains projets sont confidentiels et ne sont publiés qu’avec l’accord du client.'],
      ['Puis-je voir le code ?', 'Pour les projets open source, oui ; si un lien vers le dépôt est publié, il figure sur le projet.'],
      ['Je veux quelque chose comme l’un d’eux.', 'Décrivez votre besoin sur Lancer un projet en mentionnant ce projet.'],
    ],
    related: {
      services: 'Les services dont ces projets sont issus.',
      customers: 'Les organisations pour lesquelles nous avons construit ces logiciels.',
      'start-project': 'Lancer votre propre projet.',
    },
  },

  customers: {
    title: 'Club clients',
    summary: 'Les organisations dont nous avons construit les logiciels, et ce qu’elles disent de notre collaboration.',
    heading: 'Ce que signifie être notre client',
    intro:
      'Le club clients présente les organisations et entreprises dont nous avons construit les logiciels. Plus important que la liste : l’expérience que vit chaque client, du premier message au logiciel livré — ce que nous promettons à tous, sur les petits comme sur les grands projets.',
    points: [
      ['Une proposition écrite, gratuite', 'L’étude de votre demande et la rédaction de la proposition ne coûtent rien. Elle précise le périmètre, les livrables, les hypothèses, ce qui n’est pas inclus, un calendrier et une fourchette de prix.'],
      ['Un code de suivi, toujours disponible', 'En déposant une demande, vous recevez un code de suivi. À toute heure, trois heures du matin comprises, il montre où en est votre travail et vous permet d’accepter ou de refuser la proposition.'],
      ['Le prix avant le travail', 'Vous voyez une fourchette de prix avant que quoi que ce soit ne commence. Si une partie du travail ne vaut pas son prix, nous le disons tôt.'],
      ['Des réponses franches', 'Si quelque chose sort de notre domaine de compétence, nous le disons clairement. La taille n’est pas notre critère : nous acceptons aussi les petits projets.'],
    ],
    faqTitle: 'Questions fréquentes des clients',
    faqs: [
      ['Le devis est-il payant ?', 'Non. L’étude de votre demande et la rédaction de la proposition sont gratuites.'],
      ['Et si je refuse la proposition ?', 'Rien ne se passe. Vous refusez, et c’est tout. Ce que vous avez envoyé reste chez nous et n’est transmis à personne.'],
      ['J’ai perdu mon code de suivi.', 'Contactez-nous depuis le numéro de téléphone ou l’adresse e-mail utilisés lors de votre demande, et nous vous le redonnerons.'],
      ['Les collaborations terminées restent-elles sur cette liste ?', 'Oui. Les anciens clients restent, dans une section à part : « nous avons construit cela pour eux » reste vrai.'],
    ],
    related: {
      portfolio: 'Les projets construits pour ces clients.',
      'start-project': 'Devenez client : déposez une demande de projet.',
      partners: 'Les organisations aux côtés desquelles nous travaillons.',
    },
  },

  partners: {
    title: 'Nos partenaires',
    summary: 'Les partenaires technologiques, académiques, communautaires et stratégiques avec qui nous construisons des logiciels.',
    heading: 'Travailler avec nous',
    intro:
      'Nos partenaires sont les organisations aux côtés desquelles nous construisons des logiciels, des entreprises technologiques aux universités et aux communautés open source. Chaque partenariat prend sa propre forme, mais le socle est le même : la transparence sur le travail, les décisions et leurs limites, et une qualité sur laquelle on peut compter.',
    points: [
      ['Partenaires technologiques', 'Des entreprises dont nous utilisons la technologie, l’infrastructure ou les outils dans notre travail, ou qui nous choisissent pour construire une partie de leur produit.'],
      ['Partenaires académiques', 'Des universités et centres de formation avec lesquels nous formons la prochaine génération d’ingénieurs, en ouvrant aux étudiants la porte de vrais projets.'],
      ['Partenaires communautaires', 'Des communautés et projets open source auxquels nous contribuons, qui permettent de construire avec les autres plutôt que de manière isolée.'],
      ['Partenaires stratégiques et revendeurs', 'Des organisations qui représentent ou revendent nos solutions sur leur marché, ou qui font un plus long chemin avec nous.'],
    ],
    faqTitle: 'Questions fréquentes sur les partenariats',
    faqs: [
      ['Comment proposer un partenariat ?', 'Envoyez un message depuis la page « Contact » en décrivant le partenariat envisagé. Vous recevez un code de suivi et lisez notre réponse avec lui sur la même page.'],
      ['Que recherchez-vous chez un partenaire ?', 'Les valeurs qui guident notre propre travail : la transparence, une qualité jamais sacrifiée à la vitesse et la construction avec les autres.'],
      ['Quand un partenaire apparaît-il sur cette page ?', 'Une fois le partenariat en place. Les partenariats terminés restent, dans une section à part.'],
    ],
    related: {
      customers: 'Les organisations pour lesquelles nous avons construit des logiciels.',
      contact: 'Envoyez votre proposition de partenariat d’ici.',
      volunteer: 'Pour les universités : la voie des stages pour les étudiants.',
    },
  },

  contact: {
    title: 'Contact',
    summary: 'Envoyez un message, recevez un code de suivi et lisez la réponse sur cette page — sans e-mail.',
    heading: 'Comment votre message est suivi',
    intro:
      'Pour nous écrire, pas besoin de compte ni d’attendre un e-mail. Vous envoyez un message, recevez un code de suivi et lisez la réponse avec ce code sur cette même page.',
    points: [
      ['Un code de suivi au lieu d’un e-mail', 'Votre adresse e-mail sert seulement à identifier votre message ; aucune réponse n’y est envoyée. Vous lisez notre réponse sur cette page, avec votre code de suivi.'],
      ['Le code n’est affiché qu’une fois', 'Notez ou copiez le code dès l’envoi de votre message : c’est le seul moyen d’y revenir.'],
      ['Un statut clair', 'Chaque message est « En attente de réponse », « Répondu » ou « Clos ». Saisissez votre code pour voir le statut et la réponse ensemble.'],
      ['La bonne page pour chaque besoin', 'Pour un projet logiciel, utilisez « Lancer un projet », et pour parler à un expert, « Demander un conseil ». Les demandes d’assurance se suivent avec leur propre code sur « Suivre une demande ».'],
    ],
    tips: [
      ['Copiez le code maintenant', 'Le code de suivi du message n’est affiché qu’une fois et aucun e-mail n’est envoyé ; sans lui, vous ne pouvez pas lire la réponse.'],
    ],
    faqTitle: 'Questions fréquentes sur le contact',
    faqs: [
      ['M’enverrez-vous la réponse par e-mail ?', 'Non. La réponse se trouve sur cette page et se lit avec votre code de suivi — d’où l’importance de le conserver.'],
      ['Combien de temps avant une réponse ?', 'Nous examinons les messages rapidement. Tant que nous n’avons pas répondu, le message est « En attente de réponse ».'],
      ['J’ai perdu mon code de suivi.', 'Envoyez un nouveau message qui mentionne le précédent ; vous lirez la réponse avec le code du nouveau message.'],
      ['Quelle page utiliser pour lancer un projet ?', '« Lancer un projet ». Votre demande y aboutit à une proposition écrite avec le périmètre, un calendrier et une fourchette de prix.'],
    ],
    related: {
      'start-project': 'Pour un projet logiciel, son propre formulaire obtient une meilleure réponse.',
      consult: 'Pour parler à un expert, demandez un conseil.',
      track: 'Suivre les demandes de projet, d’assurance, de CV et de conseil.',
    },
  },

  join: {
    title: 'Envoyer votre CV',
    summary: 'Envoyez-nous votre CV ; nous vous contactons dès qu’un poste correspondant à votre expérience s’ouvre.',
    heading: 'Du CV à l’entretien',
    intro:
      'Ce formulaire s’adresse à ceux qui veulent travailler chez Rayan Tamaddon Jahan Gostar : ingénieurs logiciels, designers ou chefs de produit, débutants ou expérimentés. Nous lisons votre CV et vous contactons lorsqu’un poste correspondant s’ouvre. Vous voyez l’état de votre CV à tout moment avec un code de suivi.',
    steps: [
      ['Saisissez vos informations', 'Nom, e-mail et téléphone sont obligatoires ; e-mail et téléphone vous identifient ensemble lors des suivis.'],
      ['Joignez votre CV', 'PDF, Word (docx) ou LaTeX (tex), jusqu’à 10 Mo. Une courte note est facultative.'],
      ['Gardez le code de suivi', 'Après l’envoi, vous recevez un code ; utilisez-le sur Suivre une demande pour voir l’état de votre CV.'],
    ],
    tips: [
      ['Limite d’envoi', 'Chaque personne peut envoyer un CV au plus deux fois par jour (à une heure d’intervalle) et sur deux jours seulement : envoyez donc votre version finale.'],
    ],
    faqs: [
      ['Je débute ; dois-je envoyer un CV ?', 'Oui. Si vous n’avez pas encore d’expérience, le programme Bénévolat et stage est aussi fait pour vous.'],
      ['Répondez-vous à chaque CV ?', 'Nous le lisons, et vous voyez son état avec votre code de suivi. Nous vous contactons lorsqu’un poste correspondant s’ouvre.'],
      ['Puis-je mettre à jour mon CV ?', 'Envoyez la nouvelle version, dans la limite de deux fois par jour sur deux jours.'],
      ['Puis-je postuler à une offre précise ?', 'Oui ; pour les annonces des Offres d’emploi, postulez directement depuis la page de l’annonce.'],
    ],
    related: {
      volunteer: 'Si vous cherchez un stage ou du bénévolat.',
      jobs: 'Les postes ouverts, chez nous et dans d’autres entreprises.',
      team: 'Découvrez l’équipe que vous rejoindriez.',
      track: 'L’état de votre CV avec le code de suivi.',
    },
  },

  volunteer: {
    title: 'Bénévolat et stage',
    summary: 'Travaillez sur de vrais projets comme bénévole ou stagiaire, et progressez aux côtés d’ingénieurs expérimentés.',
    intro:
      'Ce programme s’adresse aux étudiants et jeunes diplômés, aux personnes en reconversion vers le logiciel et aux développeurs qui veulent contribuer à des projets open source et civiques. Il a deux formes : le bénévolat, où vous donnez votre temps libre aux projets sans engagement horaire strict, et le stage, une période définie avec un plan d’apprentissage, un mentor et une évaluation finale.',
    steps: [
      ['Choisissez le type de collaboration', 'Bénévole ou stagiaire ; chacun a sa propre description dans le formulaire.'],
      ['Dites quoi et quand', 'Votre domaine (front-end, back-end, mobile, données, design, etc.), heures par semaine, date de début et mode de travail (sur site, hybride ou à distance).'],
      ['Décrivez études et compétences', 'Université, filière, compétences et un lien GitHub ou portfolio ; plus c’est complet, plus il est facile de trouver le bon projet.'],
      ['Envoyez et gardez le code', 'Suivez votre candidature avec le code de suivi.'],
    ],
    points: [
      ['De vrais projets', 'Travailler sur des logiciels réellement utilisés, pas sur des exercices inventés.'],
      ['Relecture et mentorat', 'Relecture de code et accompagnement par des ingénieurs expérimentés.'],
      ['Une attestation', 'Une attestation et une lettre de recommandation pour ceux qui vont jusqu’au bout.'],
    ],
    faqs: [
      ['Le bénévolat est-il rémunéré ?', 'Le bénévolat n’est pas rémunéré et reste flexible. Si vous cherchez un emploi, utilisez Envoyer votre CV.'],
      ['Puis-je postuler sans expérience ?', 'Oui ; c’est la raison d’être du programme. Indiquez les compétences que vous avez, même peu nombreuses.'],
      ['Le travail à distance est-il possible ?', 'Oui. Choisissez sur site, hybride ou à distance dans le formulaire.'],
      ['Quelle différence entre stage et bénévolat ?', 'Le stage est une période définie avec plan d’apprentissage, mentor et évaluation finale ; le bénévolat est flexible, sans engagement horaire strict.'],
    ],
    related: {
      join: 'Si vous cherchez un emploi.',
      team: 'Les ingénieurs avec qui vous travailleriez.',
      experts: 'Pour un conseil de carrière auprès d’experts.',
    },
  },

  blog: {
    title: 'Blog',
    summary: 'Des guides pratiques sur l’assurance et le logiciel : prix, conseils d’achat et comparatifs.',
    intro:
      'Le blog publie des articles qui aident à prendre une vraie décision : le prix de la responsabilité civile auto et de l’assurance tous risques, des conseils pour s’assurer, ou comment définir un projet logiciel. La plupart des articles sont en persan, certains ont une version anglaise ; un article qui n’existe pas dans votre langue n’apparaît pas dans la liste de cette langue.',
    steps: [
      ['Trouvez un article', 'Parcourez la liste ; chaque article a un résumé, une date de publication et un temps de lecture estimé.'],
      ['Lisez, puis passez à l’action', 'Chaque article se termine par un lien vers la demande d’assurance en ligne, pour commencer si vous êtes prêt.'],
    ],
    faqs: [
      ['À quelle fréquence publiez-vous ?', 'Quand nous avons quelque chose de nouveau à dire ; nous préférons la qualité à la quantité.'],
      ['Les prix des articles sont-ils définitifs ?', 'Non. Ils datent de la publication et peuvent changer ; vous obtenez le prix définitif lors de votre demande.'],
      ['Pourquoi un article n’existe-t-il pas dans une autre langue ?', 'Chaque article n’est publié que dans les langues où il a été écrit ; nous ne publions pas de traductions automatiques.'],
    ],
    related: {
      insurance: 'Après un article sur l’assurance, demandez cette assurance.',
      services: 'Les services logiciels auxquels se rapportent les articles techniques.',
      'help-centre': 'Les guides d’utilisation de chaque rubrique du site.',
    },
  },

  track: {
    title: 'Suivre une demande',
    summary: 'Avec votre code de suivi, voyez l’état d’une demande de projet, d’assurance, de CV ou de conseil.',
    intro:
      'Chaque demande faite sur ce site a un code de suivi de dix caractères. Cette page montre l’état de la demande à partir de ce code, quel que soit son type : une demande de projet logiciel (et notre proposition, que vous acceptez ou refusez ici même), une demande d’assurance (et l’heure de rappel convenue), un CV ou une demande de conseil (que vous pouvez annuler au besoin). Les messages du formulaire de contact se suivent à part, sur la page Contact.',
    steps: [
      ['Saisissez le code', 'Tapez le code tel que vous l’avez reçu ; les lettres passent automatiquement en majuscules.'],
      ['Voyez l’état', 'Le type de demande, la date d’envoi, la dernière mise à jour et l’état actuel s’affichent.'],
      ['Si une proposition est arrivée, décidez', 'Pour une demande de projet, ouvrez la proposition écrite et acceptez-la ou refusez-la.'],
    ],
    points: [
      ['Une page pour tout', 'Projets, assurances, CV et conseils se suivent avec le même formulaire.'],
      ['Un lien partageable', 'Le code reste dans l’adresse de la page : vous pouvez enregistrer le lien ou l’envoyer à la personne assurée.'],
    ],
    tips: [
      ['Tout au même endroit', 'Si vous avez un compte, ajoutez vos codes dans Mes demandes pour ne pas les retaper à chaque fois.'],
    ],
    faqs: [
      ['Où est mon code de suivi ?', 'Il s’affiche juste après l’envoi de la demande. Si vous étiez connecté, il est aussi enregistré dans Mes demandes.'],
      ['Aucune demande trouvée avec ce code.', 'Vérifiez le code ; ne confondez pas le zéro avec la lettre O, ni le un avec la lettre I. Si le problème persiste, écrivez depuis Contact.'],
      ['Puis-je suivre ici un message du formulaire de contact ?', 'Non ; les messages de contact se suivent sur la page Contact, avec leur propre code.'],
      ['Que voient les autres avec mon code ?', 'Quiconque a le code voit l’état ; gardez-le comme un mot de passe et ne le partagez qu’avec qui en a besoin.'],
    ],
    related: {
      'start-project': 'Déposer une demande de projet logiciel.',
      insurance: 'Déposer une demande d’assurance.',
      join: 'Envoyer votre CV.',
      'my-requests': 'Pour les membres : tous les codes dans une liste.',
    },
  },

  'help-centre': {
    title: 'Centre d’aide',
    summary: 'Tous les guides du site au même endroit, regroupés et consultables par recherche.',
    intro:
      'Pour chaque rubrique du site, le centre d’aide explique ce qu’elle fait, comment l’utiliser, avec quelles autres rubriques elle fonctionne et les réponses aux questions fréquentes. Les mêmes guides sont disponibles sur chaque page via le bouton Guide ou la touche ?. Les guides de l’espace membre sont lisibles par tous, pour savoir ce qu’offre un compte avant d’en créer un.',
    steps: [
      ['Recherchez', 'Tapez par exemple « code de suivi », « vérification » ou « proposition ».'],
      ['Ou parcourez une collection', 'Les guides sont regroupés par rubrique du site.'],
      ['Du guide à la rubrique', 'Chaque guide a un bouton Aller à cette rubrique et des liens vers les rubriques liées.'],
    ],
    faqs: [
      ['Je n’ai pas trouvé la réponse à ma question.', 'Posez-la depuis la page Contact ; les questions fréquentes sont ajoutées aux guides.'],
      ['Le guide n’est pas dans ma langue.', 'Les guides des pages publiques existent dans les six langues du site ; ceux de l’espace membre et de l’administration sont pour l’instant en persan et en anglais.'],
    ],
    related: {
      home: 'Retour à l’accueil.',
      contact: 'Si la réponse à votre question n’était pas dans les guides.',
      dashboard: 'Le guide de l’espace membre.',
    },
  },
};

export default company;
