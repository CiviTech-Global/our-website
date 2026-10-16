import type { HelpLibraryText } from '../../types';
import company from './company';
import insurance from './insurance';
import consult from './consult';
import jobs from './jobs';
import freelance from './freelance';
import books from './books';
import marketplace from './marketplace';
import account from './account';

const fr: HelpLibraryText = {
  collections: {
    company: { title: 'L’entreprise et ses services logiciels', description: 'Découvrez Rayan Tamaddon Jahan Gostar : développement logiciel, demandes de projet, contact et collaboration.' },
    insurance: { title: 'Assurance', description: 'Demandes d’assurance en ligne, un formulaire par produit et suivi par code.' },
    consult: { title: 'Conseil et experts', description: 'Demander un conseil technique ou de carrière, et découvrir le club des experts.' },
    jobs: { title: 'Emplois', description: 'Trouver un emploi et postuler, consulter les pages entreprises et publier une offre.' },
    freelance: { title: 'Projets freelance', description: 'Publier un projet, envoyer des propositions, services prêts à l’emploi et annuaire des freelances.' },
    books: { title: 'Marché du livre', description: 'Acheter et vendre des livres neufs et d’occasion entre membres.' },
    marketplace: { title: 'Marché local', description: 'Commerces et produits locaux sur la carte, et inscription de votre boutique.' },
    account: { title: 'Votre compte', description: 'Inscription, connexion, réinitialisation du mot de passe et confirmation de l’e-mail.' },
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

export default fr;
