import type { HelpArticleText } from '../../types';

const freelance: Record<string, HelpArticleText> = {
  projects: {
    title: 'Freelance-Projekte',
    summary: 'Festpreis- und Stundenprojekte verifizierter Auftraggeber: ein Projekt finden, ein Angebot senden und die Arbeit durchführen.',
    intro:
      'Auftraggeber schreiben hier Projekte aus, und Freelancer senden Angebote dafür. Jedes Projekt wird vor der Veröffentlichung geprüft und kann Festpreis oder stundenbasiert sein. Jeder kann die Projekte ansehen, aber um ein Projekt auszuschreiben oder ein Angebot zu senden, müssen Sie angemeldet und verifiziert sein. Die Bezahlung läuft nicht über die Website; Auftraggeber und Freelancer vereinbaren sie direkt miteinander.',
    steps: [
      ['Ein Projekt finden', 'Durchsuchen Sie Titel, Beschreibungen oder Fähigkeiten; sortieren und filtern Sie nach Kategorie, Preisart, Erfahrungsstufe oder wenigsten Angeboten.'],
      ['Das Projekt lesen', 'Sehen Sie Budget, Dauer, Fähigkeiten und die Bilanz des Auftraggebers (verifiziert, Einstellungsquote und Bewertung).'],
      ['Ein Angebot senden', 'Nennen Sie Preis oder Stundensatz, Lieferzeit und einen Meilensteinplan und beantworten Sie die Fragen des Auftraggebers.'],
      ['Die Arbeit durchführen', 'Werden Sie beauftragt, öffnet sich die Zusammenarbeit unter Meine Zusammenarbeiten; Gespräch und Meilensteine laufen in Ihrem Dashboard weiter.'],
    ],
    points: [
      ['Festpreis oder Stunden', 'Bei Stundenprojekten erfassen Sie Ihre Stunden, und der Auftraggeber bestätigt sie.'],
      ['Zahlung in Meilensteinen', 'Teilen Sie die Arbeit in Meilensteine mit Betrag und Zeitraum; deren Summe muss Ihrem Angebot entsprechen.'],
      ['NDA', 'Manche Projekte verlangen vor dem Lesen von Beschreibung und Anhängen eine Vertraulichkeitsvereinbarung.'],
      ['Sichtbarkeit', 'Ein Projekt kann für alle, nur für Mitglieder oder nur für eingeladene Freelancer sichtbar sein.'],
    ],
    tips: [
      ['Projektbenachrichtigung einrichten', 'Legen Sie für Ihre Suche eine Benachrichtigung an, um passende neue Projekte nicht zu verpassen.'],
    ],
    faqs: [
      ['Verwahrt die Website Geld oder wickelt sie die Zahlung ab?', 'Nein. Die Bezahlung läuft nicht über die Website; Auftraggeber und Freelancer vereinbaren Betrag und Weg direkt. Der Meilensteinplan hilft, diese Vereinbarung klar zu halten.'],
      ['Warum ist eine Verifizierung nötig?', 'Um ein Projekt auszuschreiben, ein Angebot zu senden oder ein NDA zu unterzeichnen. Beide Seiten wissen, dass sie es mit einer echten Person zu tun haben.'],
      ['Wann wird mein Projekt veröffentlicht?', 'Nach dem Senden zur Prüfung meist innerhalb weniger Stunden.'],
      ['Wie viele Angebote kann ich senden?', 'Eines pro Projekt; Sie können es zurückziehen, bevor der Auftraggeber entscheidet.'],
    ],
    related: {
      'project-detail': 'Die Seite jedes Projekts und das Angebotsformular.',
      'client-projects': 'Für Auftraggeber: Projekte ausschreiben und verwalten.',
      'my-proposals': 'Für Freelancer: Angebote, Einladungen und Zusammenarbeiten.',
      freelancers: 'Freelancer, die Sie zu Ihrem Projekt einladen können.',
    },
  },

  'project-detail': {
    title: 'Eine Projektseite',
    summary: 'Die Details eines Projekts, die Bilanz des Auftraggebers und das Angebotsformular.',
    intro:
      'Jede Projektseite zeigt Beschreibung, Budget oder Stundensatzspanne, Dauer, gewünschte Erfahrungsstufe, Fähigkeiten und die Bilanz des Auftraggebers. Verlangt das Projekt ein NDA, öffnen sich vollständige Beschreibung und Anhänge nach der Unterzeichnung. Hat der Auftraggeber Sie eingeladen, wird der Hinweis Eingeladen angezeigt.',
    steps: [
      ['Lesen, dann entscheiden', 'Sehen Sie sich Budget, Dauer und die Fragen des Auftraggebers an, bevor Sie ein Angebot schreiben.'],
      ['Bei Bedarf das NDA unterzeichnen', 'Geben Sie Ihren Namen als Unterschrift ein, um Beschreibung und Dateien zu öffnen.'],
      ['Angebot schreiben', 'Preis oder Stundensatz, Meilensteinplan, Lieferzeit und Antworten auf die Fragen.'],
      ['Auf Antwort warten', 'Den Stand sehen Sie unter Meine Angebote; Nachrichten des Auftraggebers kommen unter Nachrichten an.'],
    ],
    tips: [
      ['Ein Angebot für genau dieses Projekt', 'Gehen Sie auf das Problem dieses Projekts ein und beantworten Sie die Fragen genau; allgemeine Angebote werden seltener gewählt.'],
    ],
    faqs: [
      ['Wozu verpflichtet mich das NDA?', 'Projektbeschreibung, Anhänge und alles, was der Auftraggeber Ihnen dazu sagt, vertraulich zu behandeln.'],
      ['Kann ich eine Einladung ablehnen?', 'Ja, mit Einladung ablehnen. Der Auftraggeber wird informiert.'],
      ['Was passiert, wenn das Projekt geschlossen wird?', 'Ein geschlossenes Projekt nimmt keine neuen Angebote an; frühere Angebote bleiben in Ihrer Liste.'],
    ],
    related: {
      projects: 'Zurück zu allen Projekten.',
      'my-proposals': 'Ihre gesendeten Angebote.',
      verification: 'Vor dem Senden eines Angebots nötig.',
      messages: 'Gespräch mit dem Auftraggeber.',
    },
  },

  'freelance-services': {
    title: 'Freelance-Dienstleistungen',
    summary: 'Fertige Leistungen zum festen Preis: Paket wählen und bestellen.',
    intro:
      'Freelance-Dienstleistungen funktionieren umgekehrt wie Projekte: Ein Freelancer bietet seine Leistung zu festem Preis und fester Lieferzeit an, und Sie bestellen. Jede Dienstleistung kann bis zu drei Pakete haben: Basis, Standard und Premium. Jede Dienstleistung wird vor der Veröffentlichung geprüft.',
    steps: [
      ['Eine Dienstleistung finden', 'Suchen und sortieren Sie nach Kategorie, Preis oder Bewertung.'],
      ['Ein Paket wählen', 'Vergleichen Sie, was jedes Paket enthält und wie lange die Lieferung dauert.'],
      ['Bestellen', 'Angemeldet und verifiziert senden Sie die Bestellung mit einer Beschreibung Ihres Bedarfs.'],
      ['Auf den Anbieter warten', 'Der Anbieter nimmt die Bestellung an oder lehnt ab; den Stand sehen Sie unter Bestellungen in Ihrem Dashboard.'],
    ],
    faqs: [
      ['Wie wird bezahlt?', 'Nicht über die Website; nach Annahme der Bestellung vereinbaren Käufer und Anbieter das direkt.'],
      ['Was unterscheidet eine Dienstleistung von einem Projekt?', 'Beim Projekt beschreiben Sie die Arbeit und erhalten Angebote; bei einer Dienstleistung bietet der Freelancer fertige Arbeit zu festem Preis an.'],
      ['Wie biete ich meine eigene Dienstleistung an?', 'Legen Sie unter Meine Dienstleistungen in Ihrem Dashboard eine an und senden Sie sie zur Prüfung.'],
    ],
    related: {
      'my-services': 'Für Anbieter: Dienstleistungen anlegen und Bestellungen verwalten.',
      freelancers: 'Die Profile der Anbieter.',
      projects: 'Ist Ihr Bedarf nicht fertig verfügbar und muss beschrieben werden, schreiben Sie ein Projekt aus.',
    },
  },

  freelancers: {
    title: 'Freelancer und Profile',
    summary: 'Freelancer nach Fähigkeit, Sprache und Verfügbarkeit finden, Profile lesen und einladen.',
    intro:
      'Das Freelancer-Verzeichnis zeigt die öffentlichen Profile von Mitgliedern mit Benutzernamen, die entweder Fähigkeiten im Profil angeben oder eine aktive, freigegebene Dienstleistung anbieten: Fähigkeiten, Sprachen, Land, Verfügbarkeit, Bewertungen und Arbeitsproben. Kontaktdaten werden im Verzeichnis nie angezeigt.',
    steps: [
      ['Suchen', 'Filtern Sie nach Fähigkeit, Kategorie, Sprache, Land, Verfügbarkeit oder Verifizierung und sortieren Sie nach Bewertung.'],
      ['Ein Profil lesen', 'Verifizierungsabzeichen, Bewertungen, Arbeitsproben und angebotene Dienstleistungen.'],
      ['Einladen', 'Auftraggeber können einen Freelancer per Benutzername einladen, ein Angebot für ihr Projekt zu senden.'],
    ],
    faqs: [
      ['Wie erscheine ich in diesem Verzeichnis?', 'Wählen Sie in Ihrem Dashboard einen Benutzernamen und tragen Sie Ihre Fähigkeiten ein, oder bieten Sie eine Dienstleistung an, die freigegeben wird. Arbeitsproben machen eine Einladung wahrscheinlicher.'],
      ['Was bedeutet das Verifizierungsabzeichen?', 'Dass unser Team die Identität dieses Mitglieds verifiziert hat.'],
      ['Woher stammen die Bewertungen?', 'Von den Personen, die dieses Mitglied am Ende einer Zusammenarbeit bewertet haben.'],
    ],
    related: {
      profile: 'Ihr eigenes öffentliches Profil anlegen und bearbeiten.',
      'freelance-services': 'Die Dienstleistungen, die Freelancer anbieten.',
      projects: 'Projekte, für die Sie Angebote senden können.',
    },
  },
};

export default freelance;
