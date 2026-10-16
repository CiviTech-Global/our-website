import type { HelpArticleText } from '../../types';

const company: Record<string, HelpArticleText> = {
  home: {
    title: 'Startseite',
    summary: 'Der Ausgangspunkt der Website: wer Rayan Tamaddon Jahan Gostar ist, was wir bauen und wohin Sie von hier aus gehen können.',
    heading: 'Hier beginnen',
    intro:
      'Rayan Tamaddon Jahan Gostar ist ein Software-Engineering-Unternehmen, das Individualsoftware, Web- und Mobile-Apps, Unternehmensplattformen und Lösungen für Datenanalyse baut. Neben der Vorstellung des Unternehmens bündelt diese Website mehrere Leistungen an einem Ort: Softwareprojektanfragen, Online-Versicherungsanträge, Beratung durch Fachleute, Stellenangebote, Freelance-Projekte und einen Büchermarkt. Jeder Bereich hat seine eigene Anleitung, und alle sind im Hilfe-Center gesammelt.',
    steps: [
      ['Sagen Sie, was Sie suchen', 'Für Software gehen Sie zu Leistungen oder direkt zu Projekt starten; für Versicherungen zu Versicherung; für Arbeit oder ein Projekt zum Marktplatz.'],
      ['Öffnen Sie die Hilfe jeder Seite', 'Auf jeder Seite öffnet die Schaltfläche Hilfe in der oberen Leiste (oder die Taste ?) die Erklärung zu dieser Seite daneben.'],
      ['Anfrage stellen und Code aufbewahren', 'Jede Anfrage hat einen Vorgangscode; unter Anfrage verfolgen sehen Sie damit ihren Stand.'],
      ['Mit Konto ist alles in Ihrem Dashboard', 'Angemeldet liegen Ihre Vorgangscodes, Nachrichten und Ihre Marktplatz-Aktivität zusammen in Ihrem Dashboard.'],
    ],
    points: [
      ['Softwareentwicklung', 'Von der Idee über den Rollout bis zur Wartung – mit kostenloser, unverbindlicher Kostenschätzung und technischem Angebot.'],
      ['Nebenleistungen', 'Online-Anträge für viele Versicherungsarten mit eigenem Formular je Produkt sowie technische und berufliche Beratung durch Fachleute.'],
      ['Marktplatz', 'Stellenangebote und Freelance-Projekte, jeweils vor der Veröffentlichung geprüft, und ein Büchermarkt zwischen Mitgliedern.'],
      ['Sechs Sprachen', 'Die Website gibt es auf Persisch, Englisch, Türkisch, Deutsch, Französisch und Spanisch; wechseln Sie die Sprache in der oberen Leiste.'],
    ],
    faqs: [
      ['Was genau macht Rayan Tamaddon Jahan Gostar?', 'Konzeption und Entwicklung von Individualsoftware, Web- und Mobile-Apps, Unternehmens- und Civic-Tech-Plattformen sowie Datenanalyse und Visualisierung. Ein großer Teil unserer Arbeit ist Open Source.'],
      ['Wie hängen CiviTech Global und Rayan Tamaddon Jahan Gostar zusammen?', 'CiviTech Global ist die internationale Marke von Rayan Tamaddon Jahan Gostar: ein Unternehmen, ein Team.'],
      ['Muss ich mich registrieren, um die Website zu nutzen?', 'Nicht, um ein Projekt, eine Versicherung oder eine Beratung anzufragen, einen Lebenslauf zu senden oder uns zu kontaktieren. Ein Konto brauchen Sie, um Anzeigen aufzugeben, auf Projekte zu bieten oder Bücher zu verkaufen.'],
      ['Wie erfahre ich, wo meine Anfrage steht?', 'Mit dem Vorgangscode, den Sie beim Absenden erhalten haben, unter Anfrage verfolgen. Waren Sie angemeldet, ist der Code auch unter Meine Anfragen gespeichert.'],
      ['Hat die Website ein Vertrauenssiegel?', 'Ja. Das ENAMAD-Vertrauenssiegel für den elektronischen Handel steht am Ende jeder Seite.'],
    ],
    related: {
      services: 'Alle Leistungen der Softwareentwicklung und wie ein Projekt abläuft.',
      'start-project': 'Der kürzeste Weg zu einem kostenlosen technischen Angebot und einer Kostenschätzung.',
      about: 'Mission, Vision und Werte hinter unserer Arbeit.',
      'help-centre': 'Alle Anleitungen an einem Ort, mit Suche.',
    },
  },

  services: {
    title: 'Leistungen in Softwaredesign und -entwicklung',
    summary: 'Was wir bauen, welche Phasen jedes Projekt durchläuft und unsere Nebenleistungen auf einen Blick.',
    intro:
      'Diese Seite stellt unsere vier Hauptleistungen vor: intelligente Individualsoftware, Web- und App-Entwicklung, Unternehmens- und Civic-Tech-Plattformen sowie Datenanalyse und Visualisierung. Jedes Projekt durchläuft unabhängig von seiner Größe vier Phasen: Idee und Beratung, Analyse und Design, Entwicklung und Tests, Rollout und Support. Versicherungsleistungen stehen als Nebenleistung auf derselben Seite.',
    steps: [
      ['Die passende Leistung finden', 'Lesen Sie die Karten; betrifft Ihr Bedarf mehrere Leistungen, ist das kein Problem – Sie beschreiben alles in der Projektanfrage.'],
      ['Die Phasen ansehen', 'Der Abschnitt „So läuft ein Projekt ab“ zeigt, was von Ihrer Anfrage bis zu Übergabe und Support geschieht.'],
      ['Projektanfrage stellen', 'Die Schaltfläche Projekt starten öffnet das Formular; technisches Angebot und Kostenschätzung sind kostenlos.'],
    ],
    points: [
      ['Ein schriftliches Angebot vor jeder Verpflichtung', 'Sie sehen Umfang, Lieferumfang, Annahmen, Ausschlüsse, Zeitplan und Preisspanne, bevor die Arbeit beginnt.'],
      ['Entwicklung in Etappen', 'Die Software entsteht in kurzen, sichtbaren Iterationen, sodass Sie bei jedem Schritt Fortschritte sehen und Feedback geben.'],
      ['Open Source, keine Herstellerbindung', 'Gebaut auf offenen Standards und Open-Source-Technologie, damit Ihre Software frei erweiterbar bleibt.'],
      ['Auch nach der Übergabe an Ihrer Seite', 'Wartung, Updates und technischer Support nach dem Start.'],
    ],
    faqs: [
      ['Übernehmen Sie auch kleine Projekte?', 'Ja. Die Größe entscheidet nicht; liegt etwas außerhalb unserer Expertise, sagen wir das von Anfang an ehrlich.'],
      ['Wie erfahre ich die Kosten?', 'Nach Ihrer Anfrage erhalten Sie ein schriftliches Angebot mit Preisspanne. Die Prüfung und das Angebot kosten nichts.'],
      ['Wie lange dauert es?', 'Das hängt vom Umfang ab. Der genaue Zeitplan ist Teil des schriftlichen Angebots, und Sie sehen ihn vor Beginn der Arbeit.'],
      ['Können Sie bestehende Software neu bauen oder warten?', 'Ja. „Bestehende Software neu aufbauen oder modernisieren“ und „Wartung und Support“ sind Projekttypen im Anfrageformular.'],
      ['Kann ich vor der Anfrage mit jemandem sprechen?', 'Ja. Fragen Sie auf der Seite Beratung ein technisches Gespräch an; eine Beratung verpflichtet Sie zu nichts.'],
    ],
    related: {
      'start-project': 'Das Anfrageformular: der nächste Schritt nach der Wahl einer Leistung.',
      portfolio: 'Beispiele unserer Arbeit und die Technik dahinter.',
      consult: 'Wenn Sie noch nicht sicher sind, was Sie brauchen, sprechen Sie zuerst darüber.',
      insurance: 'Unsere Nebenleistung: Online-Anträge für viele Versicherungsarten.',
    },
  },

  'start-project': {
    title: 'Softwareprojekt anfragen',
    summary: 'Beschreiben Sie Ihren Bedarf und erhalten Sie technisches Angebot, Zeitplan und Preisspanne – kostenlos und unverbindlich.',
    intro:
      'Dieses Formular macht aus Ihrer Anfrage ein schriftliches Angebot. Je klarer Sie Bedarf, Ziele, Rahmenbedingungen und Budget beschreiben, desto genauer das Angebot. Nach dem Absenden erhalten Sie einen Vorgangscode; unsere Fachleute prüfen die Anfrage, fragen bei Unklarheiten nach und senden schließlich ein schriftliches Angebot, das Sie unter demselben Code lesen und annehmen oder ablehnen.',
    steps: [
      ['Stellen Sie sich vor', 'Name, E-Mail und Telefon sind Pflicht. E-Mail und Telefon zusammen sind Ihre Kennung; geben Sie bei späteren Anfragen dieselben an.'],
      ['Beschreiben Sie das Projekt', 'Wählen Sie Titel, Projekttyp, Zusammenarbeitsmodell und Plattformen, und schreiben Sie im Bedarfsfeld mit eigenen Worten, was heute nicht funktioniert und was Sie erwarten.'],
      ['Nennen Sie Zeit und Budget', 'Geben Sie eine Budgetspanne an, keinen festen Betrag. Haben Sie kein festes Budget, wählen Sie diese Option.'],
      ['Unterlagen anhängen', 'Bis zu 8 Dateien (je bis 10 MB, insgesamt 25 MB). Brauchen Sie vor der Prüfung eine Vertraulichkeitsvereinbarung, kreuzen Sie NDA an.'],
      ['Vorgangscode aufbewahren', 'Kopieren Sie den Code nach dem Absenden. Das Angebot lesen Sie damit unter Anfrage verfolgen.'],
    ],
    points: [
      ['Ein formelles, kostenloses Angebot', 'Umfang, Lieferumfang, Annahmen, was nicht enthalten ist, Zeitplan und Preisspanne.'],
      ['Unverbindlich bis zur Annahme', 'Bis Sie das Angebot annehmen, sind Sie zu nichts verpflichtet; lehnen Sie ab, ist die Sache erledigt.'],
      ['Vertraulichkeit', 'Was Sie senden, bleibt bei uns, und bei Bedarf wird vor der Prüfung ein NDA unterzeichnet.'],
    ],
    tips: [
      ['Lassen Sie „Nicht Teil des Projekts“ nicht leer', 'Wissen wir von Anfang an, was Sie nicht wollen, wird das Angebot genauer und der Preis realistischer.'],
      ['Warum eine Budgetspanne?', 'In dieser Phase ist eine Softwareschätzung auf etwa −25 % bis +75 % genau; eine Spanne ist für beide Seiten realistischer als eine Zahl.'],
      ['Melden Sie sich an, damit der Code nicht verloren geht', 'Sind Sie vor dem Absenden angemeldet, wird der Vorgangscode automatisch unter Meine Anfragen gespeichert.'],
    ],
    faqs: [
      ['Sind Prüfung und Angebot kostenlos?', 'Ja. Beides ist kostenlos.'],
      ['Wann ist das Angebot fertig?', 'Das hängt von der Komplexität ab. Sehen Sie den Stand jederzeit mit Ihrem Vorgangscode; haben wir Fragen, stellen wir sie vor dem Schreiben des Angebots.'],
      ['Was passiert, wenn ich das Angebot ablehne?', 'Nichts; Sie lehnen ab, und das war es. Was Sie gesendet haben, bleibt bei uns und erreicht niemanden sonst.'],
      ['Ich habe meinen Vorgangscode verloren.', 'Waren Sie angemeldet, steht er unter Meine Anfragen. Andernfalls schreiben Sie über Kontakt mit derselben E-Mail und Telefonnummer.'],
      ['Ich weiß nicht, welchen Projekttyp ich wählen soll.', 'Wählen Sie den nächstliegenden oder „Sonstiges“ und erklären Sie es im Bedarfsfeld; wir korrigieren es bei der Prüfung.'],
    ],
    related: {
      services: 'Wenn Sie noch nicht sicher sind, welche Leistung passt.',
      track: 'Wo Sie das Angebot unter Ihrem Vorgangscode lesen und annehmen oder ablehnen.',
      'my-requests': 'Für Mitglieder: alle Vorgangscodes in einer Liste.',
      consult: 'Ein technisches Gespräch vor der Anfrage, unverbindlich.',
    },
  },

  about: {
    title: 'Über uns',
    summary: 'Wer Rayan Tamaddon Jahan Gostar ist: Mission, Vision, Werte und was wir tun.',
    intro:
      'Diese Seite stellt das Unternehmen vor: Unsere Mission ist es, der Zivilisation zu helfen, jeden Tag mehr aus Technologie zu machen – indem wir Individual- und Open-Source-Software für Privatpersonen, Unternehmen und Organisationen bauen. Unsere Vision ist eine durch und durch intelligente Zivilisation, und auf dem Weg dorthin wollen wir ein Zuhause für Open-Source-Engineering und die nächste Generation von Engineers sein.',
    points: [
      ['Mission und Vision', 'Warum wir das tun und wohin wir wollen.'],
      ['Werte', 'Innovation, Transparenz, Community und Exzellenz – und was sie im Alltag bedeuten.'],
      ['Lernen Sie uns kennen', 'Links zu Team, Projekten, Kunden, Partnern und Blog.'],
    ],
    faqs: [
      ['Was ist CiviTech Global?', 'Die internationale Marke von Rayan Tamaddon Jahan Gostar.'],
      ['Warum Open Source?', 'Der Code ist transparent und prüfbar, an keinen Hersteller gebunden, eine große Community prüft seine Sicherheit, und er kostet weniger im Betrieb.'],
      ['Wie kann ich mit Ihnen arbeiten?', 'Für ein Projekt über Projekt starten, für eine Stelle über Lebenslauf senden, für ein Praktikum über Ehrenamt & Praktikum.'],
    ],
    related: {
      team: 'Die Menschen, die die Arbeit machen, und wie sie arbeiten.',
      portfolio: 'Was wir bisher gebaut haben.',
      customers: 'Die Organisationen, für die wir Software gebaut haben.',
      join: 'Wenn Sie Teil dieses Teams werden möchten.',
    },
  },

  team: {
    title: 'Unser Team',
    summary: 'Die Engineers, Designer und Mitwirkenden, die diese Plattform und die Projekte unserer Kunden bauen.',
    heading: 'Wie unser Team arbeitet',
    intro:
      'Hinter jedem Projekt steht eine Gruppe von Softwareingenieurinnen und -ingenieuren, die gegenseitig ihre Arbeit prüfen, Entscheidungen schriftlich festhalten und von der ersten Nachricht bis zur Übergabe für das Ergebnis einstehen. Rayan Tamaddon Jahan Gostar baut auf Open Source, auf die Zusammenarbeit mit einer weltweiten Ingenieursgemeinschaft und auf eine offene Tür für Einsteiger. Was das im Alltag heißt:',
    points: [
      ['Geprüfter und getesteter Code', 'Jede Änderung wird vor der Auslieferung von einer zweiten Person gelesen und durch Tests abgesichert. Das Ziel ist Code, der jahrelang funktioniert – nicht nur am Tag der Übergabe.'],
      ['Entscheidungen auf Papier', 'Umfang, Annahmen, was nicht enthalten ist, Zeitplan und Preisspanne stehen in einem schriftlichen Angebot. Was nicht aufgeschrieben ist, ist nicht vereinbart.'],
      ['Barrierefrei vom ersten Tag an', 'Was wir bauen, funktioniert mit Tastatur und Screenreader und öffnet sich auch auf einem günstigen Smartphone. Das ist eine Entscheidung, keine Nebensache.'],
      ['Open Source, offene Tür', 'Ein Teil unserer Arbeit entsteht in Open-Source-Projekten mit einer weltweiten Gemeinschaft, und das Ehrenamts- und Praktikumsprogramm gibt Einsteigern die Möglichkeit, an echten Projekten mitzuarbeiten.'],
    ],
    faqTitle: 'Häufige Fragen zum Team',
    faqs: [
      ['Wie kann ich dem Team beitreten?', 'Schicken Sie Ihren Lebenslauf über die Seite „Lebenslauf senden“. Wir lesen ihn und melden uns, sobald eine Stelle frei wird, die zu Ihrer Erfahrung passt.'],
      ['Ich fange gerade erst an. Gibt es Platz für mich?', 'Ja. Genau dafür gibt es das Programm „Ehrenamt & Praktikum“: echte Projekte, an der Seite erfahrener Ingenieure.'],
      ['Wie hängen CiviTech Global und Rayan Tamaddon Jahan Gostar zusammen?', 'CiviTech Global ist die internationale Marke von Rayan Tamaddon Jahan Gostar: ein Unternehmen, ein Team.'],
      ['Wie starte ich ein Projekt mit diesem Team?', 'Stellen Sie Ihre Anfrage über die Seite „Projekt starten“. Sie erhalten einen Vorgangscode, und für Sie wird ein schriftliches Angebot erstellt – kostenlos und unverbindlich.'],
    ],
    related: {
      join: 'Lebenslauf für eine Stelle senden.',
      volunteer: 'Der Weg für Einsteiger: Ehrenamt und Praktikum an echten Projekten.',
      experts: 'Fachleute für technische und berufliche Beratung.',
      'start-project': 'Ein Projekt mit diesem Team starten.',
    },
  },

  portfolio: {
    title: 'Unsere Projekte',
    summary: 'Laufende und abgeschlossene Projekte: die Plattformen, Apps und Systeme, die wir gebaut haben.',
    intro:
      'Diese Seite zeigt Beispiele unserer Arbeit. Zu jedem Projekt sehen Sie eine kurze Beschreibung, den Status (laufend oder ausgeliefert), die verwendete Technologie und, falls vorhanden, Screenshots und einen Link. Wurde ein Projekt für einen namentlich genannten Kunden gebaut, steht auch dieser dabei.',
    steps: [
      ['Liste durchsehen', 'Filtern Sie Projekte nach Status (laufend oder ausgeliefert) oder nach der verwendeten Technologie.'],
      ['Screenshots öffnen', 'Die Galerie jedes Projekts zeigt, wie es aussieht und funktioniert.'],
      ['Etwas Ähnliches gewünscht?', 'Nennen Sie das Projekt in Ihrer Anfrage, damit wir genau verstehen, was Sie meinen.'],
    ],
    faqs: [
      ['Sind alle Ihre Projekte hier?', 'Nicht alle. Manche Projekte sind vertraulich und werden nur mit Erlaubnis des Kunden veröffentlicht.'],
      ['Kann ich den Code sehen?', 'Bei Open-Source-Projekten ja; ist ein Repository-Link veröffentlicht, steht er beim Projekt.'],
      ['Ich möchte etwas wie eines davon.', 'Beschreiben Sie Ihren Bedarf unter Projekt starten und nennen Sie das Projekt.'],
    ],
    related: {
      services: 'Die Leistungen, aus denen diese Projekte hervorgingen.',
      customers: 'Die Organisationen, für die wir diese Software gebaut haben.',
      'start-project': 'Ihr eigenes Projekt starten.',
    },
  },

  customers: {
    title: 'Kundenclub',
    summary: 'Die Organisationen, deren Software wir gebaut haben, und was sie über die Zusammenarbeit sagen.',
    heading: 'Was es heißt, unser Kunde zu sein',
    intro:
      'Der Kundenclub zeigt die Organisationen und Unternehmen, deren Software wir gebaut haben. Wichtiger als die Liste ist die Erfahrung, die jeder Kunde von der ersten Nachricht bis zur fertigen Software macht – das, was wir allen versprechen, bei kleinen wie bei großen Projekten.',
    points: [
      ['Ein schriftliches Angebot, kostenlos', 'Die Prüfung Ihrer Anfrage und das Angebot kosten nichts. Es nennt Umfang, Ergebnisse, Annahmen, was nicht enthalten ist, einen Zeitplan und eine Preisspanne.'],
      ['Ein Vorgangscode, jederzeit verfügbar', 'Mit Ihrer Anfrage erhalten Sie einen Vorgangscode. Zu jeder Stunde, auch um drei Uhr nachts, zeigt er den Stand Ihrer Arbeit und lässt Sie das Angebot annehmen oder ablehnen.'],
      ['Der Preis vor der Arbeit', 'Sie sehen eine Preisspanne, bevor irgendetwas beginnt. Ist ein Teil der Arbeit das Geld nicht wert, sagen wir das früh.'],
      ['Klare Antworten', 'Liegt etwas außerhalb dessen, was wir gut können, sagen wir es offen. Die Größe eines Projekts entscheidet nicht – wir übernehmen auch kleine Projekte.'],
    ],
    faqTitle: 'Häufige Fragen von Kunden',
    faqs: [
      ['Kostet ein Angebot etwas?', 'Nein. Die Prüfung Ihrer Anfrage und das Angebot sind kostenlos.'],
      ['Was passiert, wenn ich das Angebot ablehne?', 'Nichts. Sie lehnen ab, und das war es. Alles, was Sie geschickt haben, bleibt bei uns und geht an niemanden sonst.'],
      ['Ich habe meinen Vorgangscode verloren.', 'Melden Sie sich über die Telefonnummer oder E-Mail-Adresse, mit der Sie die Anfrage gestellt haben, und wir geben ihn Ihnen erneut.'],
      ['Bleiben beendete Zusammenarbeiten auf dieser Liste?', 'Ja. Frühere Kunden bleiben in einem eigenen Abschnitt: „Wir haben das für sie gebaut“ stimmt weiterhin.'],
    ],
    related: {
      portfolio: 'Die Projekte, die wir für diese Kunden gebaut haben.',
      'start-project': 'Werden Sie Kunde: Projektanfrage stellen.',
      partners: 'Die Organisationen, mit denen wir zusammenarbeiten.',
    },
  },

  partners: {
    title: 'Unsere Partner',
    summary: 'Die Technologie-, Hochschul-, Community- und strategischen Partner, mit denen wir Software bauen.',
    heading: 'Mit uns zusammenarbeiten',
    intro:
      'Unsere Partner sind die Organisationen, mit denen wir Software bauen – von Technologieunternehmen bis zu Hochschulen und Open-Source-Gemeinschaften. Jede Partnerschaft hat ihre eigene Form, die Grundlage ist aber dieselbe: Transparenz über die Arbeit, die Entscheidungen und ihre Grenzen, und Qualität, auf die man sich verlassen kann.',
    points: [
      ['Technologiepartner', 'Unternehmen, deren Technologie, Infrastruktur oder Werkzeuge wir neben unserer eigenen Arbeit einsetzen, oder die uns für einen Teil ihres Produkts wählen.'],
      ['Akademische Partner', 'Hochschulen und Ausbildungszentren, mit denen wir die nächste Generation von Ingenieuren fördern – mit einer offenen Tür zu echten Projekten für Studierende.'],
      ['Community-Partner', 'Gemeinschaften und Open-Source-Projekte, zu denen wir beitragen und die es möglich machen, mit anderen statt isoliert zu bauen.'],
      ['Strategische Partner und Wiederverkäufer', 'Organisationen, die unsere Lösungen in ihrem Markt vertreten oder verkaufen oder einen längeren Weg mit uns gehen.'],
    ],
    faqTitle: 'Häufige Fragen zur Partnerschaft',
    faqs: [
      ['Wie schlage ich eine Partnerschaft vor?', 'Schicken Sie über die Seite „Kontakt“ eine Nachricht und beschreiben Sie die Partnerschaft, die Ihnen vorschwebt. Sie erhalten einen Vorgangscode und lesen unsere Antwort damit auf derselben Seite.'],
      ['Worauf achten Sie bei einem Partner?', 'Auf die Werte, nach denen wir selbst arbeiten: Transparenz, Qualität, die nie dem Tempo geopfert wird, und gemeinsames Bauen.'],
      ['Wann erscheint ein Partner auf dieser Seite?', 'Sobald die Partnerschaft besteht. Beendete Partnerschaften bleiben in einem eigenen Abschnitt.'],
    ],
    related: {
      customers: 'Die Organisationen, für die wir Software gebaut haben.',
      contact: 'Senden Sie Ihren Partnerschaftsvorschlag von hier.',
      volunteer: 'Für Hochschulen: der Praktikumsweg für Studierende.',
    },
  },

  contact: {
    title: 'Kontakt',
    summary: 'Nachricht senden, Vorgangscode erhalten und die Antwort damit auf dieser Seite lesen – ohne E-Mail.',
    heading: 'Wie Ihre Nachricht weiterverfolgt wird',
    intro:
      'Um uns zu schreiben, brauchen Sie kein Konto und müssen auf keine E-Mail warten. Sie senden eine Nachricht, erhalten einen Vorgangscode und lesen die Antwort damit auf genau dieser Seite.',
    points: [
      ['Ein Vorgangscode statt E-Mail', 'Ihre E-Mail-Adresse kennzeichnet nur Ihre Nachricht; an sie wird keine Antwort geschickt. Unsere Antwort lesen Sie auf dieser Seite, mit Ihrem Vorgangscode.'],
      ['Der Code wird einmal angezeigt', 'Notieren oder kopieren Sie den Code direkt nach dem Senden: Er ist der einzige Weg zurück zu Ihrer Nachricht.'],
      ['Ein klarer Status', 'Jede Nachricht ist „Wartet auf Antwort“, „Beantwortet“ oder „Geschlossen“. Mit Ihrem Code sehen Sie Status und Antwort zusammen.'],
      ['Die richtige Seite für jedes Anliegen', 'Für ein Softwareprojekt nutzen Sie „Projekt starten“, für ein Gespräch mit einem Experten „Beratung anfragen“. Versicherungsanfragen verfolgen Sie mit ihrem eigenen Code unter „Anfrage verfolgen“.'],
    ],
    tips: [
      ['Kopieren Sie den Code jetzt', 'Der Vorgangscode der Nachricht wird nur einmal angezeigt, und es wird keine E-Mail gesendet; ohne ihn erreichen Sie die Antwort nicht.'],
    ],
    faqTitle: 'Häufige Fragen zum Kontakt',
    faqs: [
      ['Schicken Sie mir die Antwort per E-Mail?', 'Nein. Die Antwort steht auf dieser Seite und wird mit Ihrem Vorgangscode gelesen – deshalb ist es wichtig, den Code aufzubewahren.'],
      ['Wie lange dauert eine Antwort?', 'Wir sehen uns Nachrichten zeitnah an. Bis zu unserer Antwort steht die Nachricht auf „Wartet auf Antwort“.'],
      ['Ich habe meinen Vorgangscode verloren.', 'Senden Sie eine neue Nachricht, die auf die frühere verweist; die Antwort lesen Sie mit dem Code der neuen Nachricht.'],
      ['Welche Seite nutze ich, um ein Projekt zu starten?', '„Projekt starten“. Dort führt Ihre Anfrage zu einem schriftlichen Angebot mit Umfang, Zeitplan und Preisspanne.'],
    ],
    related: {
      'start-project': 'Für ein Softwareprojekt bekommt das eigene Formular eine bessere Antwort.',
      consult: 'Für ein Gespräch mit Fachleuten fragen Sie eine Beratung an.',
      track: 'Projekt-, Versicherungs-, Lebenslauf- und Beratungsanfragen verfolgen.',
    },
  },

  join: {
    title: 'Lebenslauf senden',
    summary: 'Senden Sie uns Ihren Lebenslauf; wir melden uns, sobald eine passende Stelle frei wird.',
    heading: 'Vom Lebenslauf zum Gespräch',
    intro:
      'Dieses Formular ist für alle, die bei Rayan Tamaddon Jahan Gostar arbeiten möchten: Software-Engineers, Designerinnen und Designer oder Produktmanager, ob Einsteiger oder erfahren. Wir lesen Ihren Lebenslauf und melden uns, sobald eine passende Stelle frei wird. Den Stand sehen Sie jederzeit mit einem Vorgangscode.',
    steps: [
      ['Angaben eintragen', 'Name, E-Mail und Telefon sind Pflicht; E-Mail und Telefon zusammen kennzeichnen Sie bei späteren Nachfragen.'],
      ['Lebenslauf anhängen', 'PDF, Word (docx) oder LaTeX (tex), bis 10 MB. Eine kurze Notiz ist optional.'],
      ['Vorgangscode aufbewahren', 'Nach dem Senden erhalten Sie einen Code; damit sehen Sie unter Anfrage verfolgen den Stand.'],
    ],
    tips: [
      ['Sendebeschränkung', 'Jede Person kann höchstens zweimal am Tag (im Abstand von einer Stunde) und nur an zwei Tagen einen Lebenslauf senden – senden Sie also Ihre endgültige Fassung.'],
    ],
    faqs: [
      ['Ich bin Einsteiger; soll ich einen Lebenslauf senden?', 'Ja. Haben Sie noch keine Berufserfahrung, ist auch das Programm Ehrenamt & Praktikum für Sie gedacht.'],
      ['Antworten Sie auf jeden Lebenslauf?', 'Wir lesen ihn, und Sie sehen seinen Stand mit Ihrem Vorgangscode. Wir melden uns, sobald eine passende Stelle frei wird.'],
      ['Kann ich meinen Lebenslauf aktualisieren?', 'Senden Sie die neue Fassung erneut, innerhalb der Grenze von zweimal am Tag an zwei Tagen.'],
      ['Kann ich mich auf eine bestimmte Stelle bewerben?', 'Ja; für Anzeigen unter Stellenangebote bewerben Sie sich direkt auf der Seite der Anzeige.'],
    ],
    related: {
      volunteer: 'Wenn Sie ein Praktikum oder ehrenamtliche Mitarbeit suchen.',
      jobs: 'Offene Stellen, von uns und von anderen Unternehmen.',
      team: 'Lernen Sie das Team kennen, dem Sie beitreten würden.',
      track: 'Der Stand Ihres Lebenslaufs mit dem Vorgangscode.',
    },
  },

  volunteer: {
    title: 'Ehrenamt & Praktikum',
    summary: 'Arbeiten Sie als Ehrenamtliche oder Praktikant an echten Projekten und wachsen Sie an der Seite erfahrener Engineers.',
    intro:
      'Dieses Programm richtet sich an Studierende und Absolventen, an Quereinsteiger in die Softwareentwicklung und an Entwickler, die zu Open-Source- und Civic-Projekten beitragen möchten. Es gibt zwei Formen: das Ehrenamt, bei dem Sie Ihre freie Zeit ohne feste Zeitverpflichtung einbringen, und das Praktikum, einen festen Zeitraum mit Lernplan, Mentor und Abschlussbewertung.',
    steps: [
      ['Art der Mitarbeit wählen', 'Ehrenamt oder Praktikum; beide haben im Formular ihre eigene Beschreibung.'],
      ['Was und wann', 'Ihr Fachgebiet (Frontend, Backend, Mobile, Daten, Design usw.), Stunden pro Woche, Startdatum und Arbeitsform (vor Ort, hybrid oder remote).'],
      ['Studium und Fähigkeiten beschreiben', 'Hochschule, Studienfach, Fähigkeiten und ein GitHub- oder Portfolio-Link; je vollständiger, desto leichter findet sich das passende Projekt.'],
      ['Absenden und Code aufbewahren', 'Verfolgen Sie Ihre Bewerbung mit dem Vorgangscode.'],
    ],
    points: [
      ['Echte Projekte', 'Arbeit an Software, die tatsächlich genutzt wird, nicht an erfundenen Übungen.'],
      ['Reviews und Mentoring', 'Code-Reviews und Anleitung von erfahrenen Engineers.'],
      ['Ein Zertifikat', 'Zertifikat und Empfehlungsschreiben für alle, die die Mitarbeit abschließen.'],
    ],
    faqs: [
      ['Ist das Ehrenamt bezahlt?', 'Das Ehrenamt ist unbezahlt und zeitlich flexibel. Suchen Sie eine Stelle, nutzen Sie Lebenslauf senden.'],
      ['Kann ich mich ohne Erfahrung bewerben?', 'Ja; genau dafür ist das Programm da. Nennen Sie alle Fähigkeiten, die Sie haben, auch wenige.'],
      ['Ist Remote-Arbeit möglich?', 'Ja. Wählen Sie im Formular vor Ort, hybrid oder remote als Arbeitsform.'],
      ['Was unterscheidet Praktikum und Ehrenamt?', 'Ein Praktikum ist ein fester Zeitraum mit Lernplan, Mentor und Abschlussbewertung; das Ehrenamt ist flexibel ohne feste Zeitverpflichtung.'],
    ],
    related: {
      join: 'Wenn Sie eine Stelle suchen.',
      team: 'Die Engineers, mit denen Sie arbeiten würden.',
      experts: 'Für berufliche Beratung durch Fachleute.',
    },
  },

  blog: {
    title: 'Blog',
    summary: 'Praktische Anleitungen zu Versicherung und Software: Preise, Kauftipps und Vergleiche.',
    intro:
      'Im Blog veröffentlichen wir Artikel, die bei einer echten Entscheidung helfen: Preise für Kfz-Haftpflicht und Kasko, Tipps zum Versicherungskauf oder wie man ein Softwareprojekt definiert. Die meisten Artikel sind auf Persisch, einige haben eine englische Fassung; ein Artikel, den es in Ihrer Sprache nicht gibt, erscheint nicht in der Liste dieser Sprache.',
    steps: [
      ['Einen Artikel finden', 'Durchsuchen Sie die Liste; jeder Artikel hat eine Zusammenfassung, ein Veröffentlichungsdatum und eine geschätzte Lesezeit.'],
      ['Lesen, dann handeln', 'Jeder Artikel endet mit einem Link zum Online-Versicherungsantrag, sodass Sie dort beginnen können, wenn Sie so weit sind.'],
    ],
    faqs: [
      ['Wie oft erscheinen Artikel?', 'Wenn wir etwas Neues zu sagen haben; Qualität geht uns vor Menge.'],
      ['Sind die Preise in den Artikeln verbindlich?', 'Nein. Preise gelten zum Veröffentlichungsdatum und können sich ändern; den endgültigen Preis erhalten Sie bei der Anfrage.'],
      ['Warum gibt es einen Artikel nicht in einer anderen Sprache?', 'Jeder Artikel erscheint nur in den Sprachen, in denen er geschrieben wurde; maschinelle Übersetzungen veröffentlichen wir nicht.'],
    ],
    related: {
      insurance: 'Nach einem Versicherungsartikel diese Versicherung beantragen.',
      services: 'Die Softwareleistungen, auf die sich technische Artikel beziehen.',
      'help-centre': 'Anleitungen zu jedem Bereich der Website.',
    },
  },

  track: {
    title: 'Anfrage verfolgen',
    summary: 'Sehen Sie mit Ihrem Vorgangscode den Stand einer Projekt-, Versicherungs-, Lebenslauf- oder Beratungsanfrage.',
    intro:
      'Jede Anfrage auf dieser Website hat einen zehnstelligen Vorgangscode. Diese Seite zeigt damit den Stand, gleich welcher Art: eine Softwareprojektanfrage (mit unserem Angebot, das Sie hier annehmen oder ablehnen), eine Versicherungsanfrage (mit vereinbartem Rückrufzeitpunkt), ein Lebenslauf oder eine Beratungsanfrage (die Sie bei Bedarf stornieren können). Nachrichten über das Kontaktformular verfolgen Sie gesondert auf der Seite Kontakt.',
    steps: [
      ['Code eingeben', 'Geben Sie den Code ein, wie Sie ihn erhalten haben; Buchstaben werden automatisch großgeschrieben.'],
      ['Stand ansehen', 'Art der Anfrage, Datum, letzte Aktualisierung und aktueller Status werden angezeigt.'],
      ['Ist ein Angebot da, entscheiden Sie', 'Bei einer Projektanfrage öffnen Sie das schriftliche Angebot und nehmen es an oder lehnen ab.'],
    ],
    points: [
      ['Eine Seite für alles', 'Projekte, Versicherungen, Lebensläufe und Beratungen werden mit demselben Formular verfolgt.'],
      ['Ein teilbarer Link', 'Der Code bleibt in der Adresse, sodass Sie den Link speichern oder an die versicherte Person senden können.'],
    ],
    tips: [
      ['Alles an einem Ort', 'Haben Sie ein Konto, fügen Sie Ihre Codes unter Meine Anfragen hinzu, damit Sie sie nicht jedes Mal eingeben müssen.'],
    ],
    faqs: [
      ['Wo ist mein Vorgangscode?', 'Er wird direkt nach dem Absenden angezeigt. Waren Sie angemeldet, ist er auch unter Meine Anfragen gespeichert.'],
      ['Es heißt, zu diesem Code wurde keine Anfrage gefunden.', 'Prüfen Sie den Code; verwechseln Sie nicht die Null mit dem Buchstaben O oder die Eins mit dem I. Bleibt es dabei, schreiben Sie über Kontakt.'],
      ['Verfolge ich hier eine Nachricht aus dem Kontaktformular?', 'Nein; Kontaktnachrichten werden auf der Seite Kontakt selbst mit ihrem eigenen Code verfolgt.'],
      ['Was sehen andere mit meinem Code?', 'Wer den Code hat, sieht den Stand; bewahren Sie ihn wie ein Passwort auf und teilen Sie ihn nur mit Personen, die ihn brauchen.'],
    ],
    related: {
      'start-project': 'Eine Softwareprojektanfrage stellen.',
      insurance: 'Eine Versicherungsanfrage stellen.',
      join: 'Lebenslauf senden.',
      'my-requests': 'Für Mitglieder: alle Codes in einer Liste.',
    },
  },

  'help-centre': {
    title: 'Hilfe-Center',
    summary: 'Alle Anleitungen der Website an einem Ort, gruppiert und durchsuchbar.',
    intro:
      'Für jeden Bereich der Website erklärt das Hilfe-Center, was er tut, wie Sie ihn nutzen, mit welchen anderen Bereichen er zusammenarbeitet und was die Antworten auf häufige Fragen sind. Dieselben Anleitungen erreichen Sie auf jeder Seite über die Schaltfläche Hilfe oder die Taste ?. Die Anleitungen zum Mitgliederbereich kann jeder lesen, damit Sie wissen, was ein Konto bietet, bevor Sie eines anlegen.',
    steps: [
      ['Suchen', 'Geben Sie etwa „Vorgangscode“, „Verifizierung“ oder „Angebot“ ein.'],
      ['Oder eine Sammlung durchsehen', 'Die Anleitungen sind nach den Bereichen der Website gruppiert.'],
      ['Von der Anleitung zum Bereich', 'Jede Anleitung hat die Schaltfläche Zu diesem Bereich und Links zu verwandten Bereichen.'],
    ],
    faqs: [
      ['Ich habe keine Antwort auf meine Frage gefunden.', 'Fragen Sie über Kontakt; häufige Fragen nehmen wir in die Anleitungen auf.'],
      ['Die Anleitung ist nicht in meiner Sprache.', 'Anleitungen zu den öffentlichen Seiten gibt es in allen sechs Sprachen der Website; die zum Mitglieder- und Adminbereich vorerst auf Persisch und Englisch.'],
    ],
    related: {
      home: 'Zurück zur Startseite.',
      contact: 'Wenn die Antwort nicht in den Anleitungen stand.',
      dashboard: 'Die Anleitung zum Mitgliederbereich.',
    },
  },
};

export default company;
