import type { HelpArticleText } from '../../types';

const books: Record<string, HelpArticleText> = {
  books: {
    title: 'Büchermarkt',
    summary: 'Neue und gebrauchte Bücher von Lesern und Buchhandlungen: alle Exemplare eines Buches auf einer Seite.',
    intro:
      'Im Büchermarkt hat jedes Buch eine Seite, und alle angebotenen Exemplare stehen dort zusammen, das günstigste zuerst. Jedes Exemplar gehört einem Verkäufer; Sie sehen seinen Zustand (von Neu bis Akzeptabel), Fotos, Preis, Versandkosten und Lieferart. Ein Kauf beginnt mit einer Kaufanfrage; über die Website wird nichts bezahlt, Käufer und Verkäufer vereinbaren Bezahlung und Lieferung direkt.',
    steps: [
      ['Buch finden', 'Suchen Sie oder stöbern Sie in den Regalen; filtern Sie nach Zustand, Preis, kostenlosem Versand oder unter Listenpreis.'],
      ['Ein Exemplar wählen', 'Vergleichen Sie auf der Buchseite die Exemplare nach Zustand, Fotos, Preis und Lieferart.'],
      ['Kaufanfrage senden', 'Wählen Sie die Lieferart und schlagen Sie bei Wunsch einen Preis vor; Sie müssen angemeldet und verifiziert sein.'],
      ['Lieferung abstimmen', 'Nimmt der Verkäufer an, vereinbaren Sie Bezahlung und Lieferung im Gespräch zu dieser Anfrage.'],
    ],
    points: [
      ['Bewerteter Zustand', 'Jedes Exemplar hat eine von fünf Stufen – Neu, Wie neu, Sehr gut, Gut oder Akzeptabel – mit Fotos.'],
      ['Bücher verkaufen', 'Bieten Sie Ihr Exemplar mit Fotos, Zustand und Preis aus Ihrem Dashboard an; es wird vor der Veröffentlichung geprüft.'],
      ['Gegenseitige Bewertungen', 'Nach einem Verkauf bewerten sich Käufer und Verkäufer gegenseitig.'],
    ],
    tips: [
      ['Einen Preis vorschlagen', 'Ist der Preis eines Exemplars verhandelbar, können Sie Ihren eigenen vorschlagen; lassen Sie das Feld leer, um den Preis des Verkäufers anzunehmen.'],
    ],
    faqs: [
      ['Bezahle ich an die Website?', 'Nein. Über die Website wird nichts bezahlt; nach Annahme Ihrer Anfrage vereinbaren Sie Bezahlung und Lieferung direkt mit dem Verkäufer.'],
      ['Warum muss ich mich zum Kaufen verifizieren?', 'Damit der Verkäufer weiß, dass er es mit einer echten Person zu tun hat; dieselbe Regel gilt für Verkäufer.'],
      ['Wie verkaufe ich ein Buch?', 'Bieten Sie Ihr Exemplar unter Meine Bücher im Verkauf in Ihrem Dashboard mit Fotos, Zustand und Preis an und senden Sie es zur Prüfung.'],
      ['Der Verkäufer hat meine Anfrage abgelehnt.', 'Sie können ein anderes Exemplar desselben Buches bei einem anderen Verkäufer anfragen.'],
    ],
    related: {
      'my-books': 'Bücher verkaufen und Käufe verfolgen im Dashboard.',
      messages: 'Gespräch mit Käufer oder Verkäufer.',
      verification: 'Für Kauf und Verkauf nötig.',
    },
  },
};

export default books;
