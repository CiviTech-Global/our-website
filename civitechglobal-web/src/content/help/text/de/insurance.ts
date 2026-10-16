import type { HelpArticleText } from '../../types';

const insurance: Record<string, HelpArticleText> = {
  insurance: {
    title: 'Versicherung',
    summary: 'Alle Versicherungsarten, die wir bearbeiten: finden Sie die passende und beantragen Sie sie online.',
    heading: 'Von der Wahl der Police bis zum Anruf der Fachleute',
    intro:
      'Online-Versicherungsanträge sind eine unserer Nebenleistungen, denn die finanzielle Sicherheit, die Gesundheit und der Seelenfrieden unserer Kollegen und Kunden liegen uns am Herzen. Diese Seite listet alle Versicherungen, für die wir Anträge annehmen: von Kfz-Haftpflicht und Kasko für Autos und Motorräder bis zu Krankenzusatz-, Lebens-, Unfall-, Haftpflicht-, Transport-, Bauleistungs- und Handyversicherung. Jede hat ihr eigenes Formular, und nach Ihrem Antrag ruft eine Fachperson an, um Ihnen die beste Option für Bedarf und Budget anzubieten.',
    steps: [
      ['Versicherung finden', 'Durchsuchen Sie die Liste oder suchen Sie nach Namen. Firmenpolicen tragen das Label Firmenkunden.'],
      ['Ihre Seite lesen', 'Jede Versicherungsseite nennt Leistungen, Ausschlüsse, benötigte Unterlagen und was den Beitrag beeinflusst.'],
      ['Formular ausfüllen', 'Geben Sie die Angaben zur Police und Ihre Kontaktdaten ein und bestätigen Sie Ihre Mobilnummer mit einem sechsstelligen Code.'],
      ['Vorgangscode aufbewahren', 'Bewahren Sie den Vorgangscode nach dem Antrag auf; damit sehen Sie Stand und vereinbarten Rückrufzeitpunkt.'],
    ],
    points: [
      ['Online beantragen', 'Bei Policen mit dem Label Online beantragen geben Sie alles Nötige im Formular an.'],
      ['Von Fachleuten kalkuliert', 'Policen mit dem Label Von Fachleuten kalkuliert werden telefonisch berechnet; Sie geben die Grunddaten an, und die Fachperson ruft Sie an.'],
      ['Keine Preise auf der Website', 'Der Beitrag hängt von Ihren Angaben ab; die Fachperson nennt Optionen und Preis nach der Prüfung.'],
    ],
    faqs: [
      ['Kann ich die Versicherung hier kaufen und bezahlen?', 'Nein. Hier stellen Sie die Anfrage; unsere Fachperson ruft Sie an, bespricht die Optionen und veranlasst die Ausstellung der Police.'],
      ['Warum sehe ich keinen Preis auf der Website?', 'Der Beitrag hängt etwa vom Fahrzeug, Ihrer Vorgeschichte und den gewählten Leistungen ab. Diese Faktoren stehen auf der Seite jeder Police, den genauen Preis nennt die Fachperson.'],
      ['Warum muss ich meine Nummer bestätigen?', 'Über die Nummer erreicht Sie die Fachperson; die Bestätigung verhindert Tippfehler.'],
      ['Brauche ich für einen Versicherungsantrag ein Konto?', 'Nein. Sind Sie aber angemeldet, wird der Vorgangscode unter Meine Anfragen gespeichert.'],
      ['Die gewünschte Versicherung steht nicht auf der Liste.', 'Fragen Sie über die Seite Kontakt; wir schlagen die nächstliegende Option vor.'],
    ],
    related: {
      'insurance-product': 'Die eigene Seite und das Formular jeder Police.',
      track: 'Eine Versicherungsanfrage mit ihrem Code verfolgen.',
      'my-requests': 'Für Mitglieder: alle Anfragen in einer Liste.',
      blog: 'Anleitungen zu Versicherungspreisen und Kauftipps.',
    },
  },

  'insurance-product': {
    title: 'Seite und Formular einer Police',
    summary: 'Eine Police im Detail mit eigenem Formular: Leistungen, Ausschlüsse, Unterlagen, Preisfaktoren und Antrag.',
    intro:
      'Jede Police hat ihre eigene Seite. „Auf einen Blick“ fasst sie zusammen; danach folgen Leistungen und optionale Leistungen, Ausschlüsse, benötigte Unterlagen, was den Beitrag beeinflusst und was im Schadensfall zu tun ist. Das Antragsformular steht auf derselben Seite, und seine Felder gehören genau zu dieser Police.',
    steps: [
      ['Angaben zur Police', 'Füllen Sie die Felder dieser Police aus; sie werden für einen genauen Preis benötigt.'],
      ['Kontaktdaten', 'Geben Sie Ihren Namen und Ihre Erreichbarkeit an; wir rufen an, um die Police abzustimmen und zu senden.'],
      ['Nummer bestätigen', 'Bestätigen Sie Ihre Mobilnummer mit dem sechsstelligen Code; ohne sie kann die Anfrage nicht gesendet werden.'],
      ['Absenden und Code aufbewahren', 'Senden Sie die Anfrage ab und bewahren Sie den Vorgangscode auf.'],
    ],
    tips: [
      ['Ausschlüsse vor dem Antrag lesen', 'Die Liste „Nicht versichert“ ist so wichtig wie die Leistungen und erspart Enttäuschungen im Schadensfall.'],
      ['Unterlagen bereithalten', 'Halten Sie die benötigten Unterlagen bereit, bevor die Fachperson anruft, dann wird die Police schneller ausgestellt.'],
    ],
    faqs: [
      ['Was passiert nach dem Antrag?', 'Eine Fachperson ruft Sie so bald wie möglich an, um die Optionen zu besprechen; der vereinbarte Zeitpunkt erscheint auf der Verfolgungsseite.'],
      ['Was bedeutet „Von Fachleuten kalkuliert“?', 'Diese Police wird von einer Fachperson berechnet; Sie geben die Grunddaten an, damit sie gut informiert anrufen kann.'],
      ['Der Bestätigungscode ist nicht angekommen.', 'Warten Sie einen Moment und tippen Sie auf Erneut senden, oder prüfen Sie die Nummer und korrigieren Sie sie mit Nummer ändern.'],
      ['Wo werden meine Angaben angezeigt?', 'Die Verfolgungsseite zeigt nur den Stand der Anfrage, keine persönlichen Daten.'],
    ],
    related: {
      insurance: 'Zurück zur Liste aller Versicherungen.',
      track: 'Die Anfrage mit ihrem Code verfolgen.',
      'my-requests': 'Für Mitglieder: Ihre Codes in einer Liste.',
    },
  },
};

export default insurance;
