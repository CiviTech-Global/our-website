import type { HelpLibraryText } from '../../types';
import company from './company';
import insurance from './insurance';
import consult from './consult';
import jobs from './jobs';
import freelance from './freelance';
import books from './books';
import marketplace from './marketplace';
import account from './account';

const de: HelpLibraryText = {
  collections: {
    company: { title: 'Unternehmen und Softwareleistungen', description: 'Lernen Sie Rayan Tamaddon Jahan Gostar kennen: Softwareentwicklung, Projektanfragen, Kontakt und Zusammenarbeit.' },
    insurance: { title: 'Versicherungen', description: 'Online-Versicherungsanträge, ein Formular je Produkt und Verfolgung per Vorgangsnummer.' },
    consult: { title: 'Beratung und Fachleute', description: 'Technische oder berufliche Beratung anfragen und den Expertenkreis kennenlernen.' },
    jobs: { title: 'Jobs', description: 'Stellen finden und sich bewerben, Unternehmensseiten ansehen und Stellen ausschreiben.' },
    freelance: { title: 'Freelance-Projekte', description: 'Projekte ausschreiben, Angebote senden, fertige Leistungen und das Freelancer-Verzeichnis.' },
    books: { title: 'Büchermarkt', description: 'Neue und gebrauchte Bücher zwischen Mitgliedern kaufen und verkaufen.' },
    marketplace: { title: 'Lokaler Markt', description: 'Lokale Geschäfte und Produkte auf der Karte – und Ihr Geschäft eintragen.' },
    account: { title: 'Ihr Konto', description: 'Registrierung, Anmeldung, Passwort zurücksetzen und E-Mail bestätigen.' },
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

export default de;
