import type { HelpArticleText } from '../../types';

const marketplace: Record<string, HelpArticleText> = {
  marketplace: {
    title: 'Lokaler Markt',
    summary: 'Geschäfte, Produkte und Dienstleistungen in Ihrer Nähe auf der Karte finden und das Geschäft direkt kontaktieren.',
    intro:
      'Der lokale Markt zeigt Geschäfte und Betriebe in Ihrer Umgebung auf einer Karte: ihre Produkte, Dienstleistungen, Bilder und Kontaktwege. Vorerst ist er ein Schaufenster, kein Onlineshop; Kauf, Buchung und Absprache laufen direkt mit dem Geschäft.',
    steps: [
      ['Ihren Punkt festlegen', 'Erlauben Sie den Zugriff auf Ihren Standort oder klicken Sie auf die Karte, damit die Suche um diesen Punkt läuft.'],
      ['Suchen', 'Suchen Sie nach Geschäftsnamen, Branche oder dem gewünschten Produkt oder der Dienstleistung; legen Sie den Suchradius fest und sortieren Sie nach „Am nächsten“.'],
      ['Geschäft oder Produkt öffnen', 'Sehen Sie Vorstellung, Bilder, Produkte und Dienstleistungen sowie den Standort auf der Karte.'],
      ['Kontakt aufnehmen', 'Zum Kaufen oder Buchen nutzen Sie die Kontaktdaten dieses Geschäfts.'],
    ],
    tips: [
      ['Standort nicht verfügbar?', 'Browser geben den Standort nur über eine sichere Verbindung weiter, und vielleicht haben Sie es nicht erlaubt; wählen Sie dann einen Punkt auf der Karte.'],
    ],
    faqs: [
      ['Kann ich hier kaufen und bezahlen?', 'Noch nicht. Warenkorb und Onlinezahlung sind nicht freigeschaltet; kontaktieren Sie das Geschäft.'],
      ['Werden Geschäfte geprüft?', 'Ja. Jeder Inhaber hat seine Identität verifiziert, und jedes Geschäft wird geprüft, bevor es erscheint.'],
      ['Mein Geschäft ist nicht hier.', 'Tragen Sie es über die Seite Geschäft eintragen in vier Schritten ein.'],
    ],
    related: {
      'marketplace-join': 'Das eigene Geschäft eintragen.',
      'my-shops': 'Für Anbieter: Geschäft und Produkte verwalten.',
    },
  },

  'marketplace-join': {
    title: 'Geschäft eintragen',
    summary: 'Tragen Sie Ihr Geschäft in vier Schritten ein, damit Kunden in der Nähe es auf der Karte finden.',
    intro:
      'Jeder Betrieb, der Kunden in der Nähe Produkte oder Dienstleistungen anbietet, kann sein Geschäft eintragen. Weil ein Geschäft eine geschäftliche Identität ist und Käufer wissen sollen, wer dahintersteht, ist eine Identitätsprüfung nötig, und das Geschäft wird geprüft, bevor es erscheint. Nach der Freigabe veröffentlichen und bearbeiten Sie Ihre Produkte und Dienstleistungen selbst.',
    steps: [
      ['Konto anlegen', 'Registrieren Sie sich oder melden Sie sich an.'],
      ['Identität verifizieren', 'Bestätigen Sie Ihre Identität im Dashboard.'],
      ['Geschäft anlegen', 'Geben Sie Name, Vorstellung, Branche, Logo, Bild, Kontaktdaten und Standort ein und senden Sie es zur Prüfung.'],
      ['Produkte und Dienstleistungen hinzufügen', 'Nach der Freigabe veröffentlichen, bearbeiten und entfernen Sie Ihre Produkte und Dienstleistungen.'],
    ],
    tips: [
      ['Standort auf der Karte eintragen', 'Ohne Standort erscheint Ihr Geschäft nicht in „In meiner Nähe“-Suchen.'],
    ],
    faqs: [
      ['Wie lange dauert die Prüfung?', 'Das hängt von der Prüfwarteschlange ab. Bittet die prüfende Person um Änderungen, sehen Sie das im Dashboard und senden es nach der Korrektur erneut.'],
      ['Werden auch Produkte geprüft?', 'Nach der Freigabe des Geschäfts erscheinen Produkte sofort, doch Mitarbeitende können jedes Produkt zur Korrektur zurückschicken.'],
    ],
    related: {
      marketplace: 'Der Markt aus Sicht der Käufer.',
      'my-shops': 'Ihr Geschäft nach dem Eintrag verwalten.',
      verification: 'Schritt zwei: Identitätsprüfung.',
    },
  },
};

export default marketplace;
