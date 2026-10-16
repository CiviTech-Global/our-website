import type { HelpArticleText } from '../../types';

const consult: Record<string, HelpArticleText> = {
  consult: {
    title: 'Beratung anfragen',
    summary: 'Fragen Sie technische oder berufliche Beratung an; sagen Sie, wann Sie Zeit haben, und wir rufen an.',
    intro:
      'Ihr Berufsweg, ein technisches Problem oder ein Code-Review, der Einstieg in die Softwareentwicklung oder die Vorbereitung auf Vorstellungsgespräche und den Lebenslauf: Sagen Sie, worüber Sie sprechen möchten und wann Sie Zeit haben. Wir rufen an und legen den Termin fest. Das Gespräch kann online, telefonisch oder vor Ort stattfinden und verpflichtet Sie zu nichts.',
    steps: [
      ['Thema wählen', 'Berufsweg, ein technisches Problem, Einstieg, Vorstellungsgespräch und Lebenslauf oder etwas anderes.'],
      ['Wie und wozu', 'Online, telefonisch oder vor Ort – und was das Gespräch Ihnen bringen soll.'],
      ['Experten wählen oder uns überlassen', 'Haben Sie jemanden aus dem Expertenclub im Sinn, wählen Sie ihn; sonst „wer am besten passt“.'],
      ['Freie Zeiten angeben', 'Wählen Sie einige Zeitfenster (Tag und Vormittag, Nachmittag oder Abend). Ungefähre Zeiten genügen.'],
      ['Vorgangscode aufbewahren', 'Wir rufen die angegebene Nummer an; den Stand verfolgen Sie mit dem Code und können die Anfrage bei Bedarf stornieren.'],
    ],
    points: [
      ['Ein klarer Status', 'Eingegangen, Termin wird abgestimmt, Termin bestätigt, Stattgefunden – alles unter dem Vorgangscode.'],
      ['Einfach stornieren', 'Ändern sich Ihre Pläne, stornieren Sie die Anfrage auf der Verfolgungsseite.'],
    ],
    tips: [
      ['Beschreiben Sie das Ziel genau', 'Je genauer Ihre Erwartung, desto nützlicher das Gespräch – etwa: „Ich möchte wissen, wo ich für den Einstieg ins Backend anfange“.'],
    ],
    faqs: [
      ['Verpflichtet mich eine Beratung zu etwas?', 'Nein. Eine Beratung begründet keine Pflicht, ein Projekt zu starten oder zusammenzuarbeiten.'],
      ['Wann rufen Sie an?', 'In einem der angegebenen Zeitfenster, um den Termin zu bestätigen. Der bestätigte Termin steht auch auf der Verfolgungsseite.'],
      ['Brauche ich eine E-Mail-Adresse?', 'Nein; eine Telefonnummer genügt. Die E-Mail ist optional.'],
      ['Kann ich die Anfrage stornieren?', 'Ja, mit dem Vorgangscode auf der Seite Anfrage verfolgen.'],
    ],
    related: {
      experts: 'Fachleute, die Sie namentlich anfragen können.',
      'start-project': 'Wenn Sie nach der Beratung ein Projekt starten möchten.',
      'my-requests': 'Für Mitglieder: der Beratungscode in Ihrer Anfrageliste.',
    },
  },

  experts: {
    title: 'Expertenclub',
    summary: 'Engineers und Fachleute für technische und berufliche Beratung, mit Fachgebieten, Sprachen und Berufsjahren.',
    heading: 'Wie der Expertenclub funktioniert',
    intro:
      'Der Expertenclub ist eine Gruppe von Ingenieuren und Fachleuten, die technische und berufliche Beratung geben – die Menschen, an die wir uns selbst wenden und die Sie namentlich anfragen können. Jedes Profil zeigt, ob die Person Beratungen annimmt.',
    points: [
      ['Technische Beratung', 'Für Entscheidungen wie die Wahl einer Technologie oder den Entwurf einer Architektur, oder für einen Blick auf ein bestehendes System, das nicht so läuft, wie es sollte.'],
      ['Berufliche Beratung', 'Für Ingenieure, die gerade anfangen oder die Richtung wechseln – von Menschen, die diesen Weg selbst gegangen sind.'],
      ['Namentlich wählen', 'Die Seite jedes Experten nennt Fachgebiete, Sprachen und Berufsjahre. Nimmt die Person Beratungen an, fragen Sie direkt auf dieser Seite an.'],
      ['Eine Beratung vereinbaren', 'Stellen Sie eine Anfrage über die Seite „Beratung anfragen“ und nennen Sie einige passende Zeiten – wir rufen an. Eine Beratung verpflichtet Sie zu nichts.'],
    ],
    faqTitle: 'Häufige Fragen zur Beratung',
    faqs: [
      ['Wie buche ich eine Beratung?', 'Über die Seite „Beratung anfragen“ oder mit der Beratungsschaltfläche auf der Seite eines Experten. Sie nennen einige passende Zeiten, und wir rufen an.'],
      ['Kann ich den Experten selbst wählen?', 'Ja. Experten mit dem Hinweis „Nimmt Beratungen an“ können Sie namentlich anfragen.'],
      ['Verpflichtet mich eine Beratung zu einem Projekt?', 'Nein. Eine Beratung verpflichtet Sie zu nichts.'],
      ['Wie werde ich Mitglied im Expertenclub?', 'Schreiben Sie uns über die Seite „Kontakt“ zu Ihrer Erfahrung und Ihren Fachgebieten. Die Profile im Club werden von unserem Team angelegt und gepflegt.'],
    ],
    related: {
      consult: 'Das Formular für Beratungsanfragen.',
      team: 'Das Engineering-Team von Rayan Tamaddon Jahan Gostar.',
      freelancers: 'Wenn Sie statt Beratung jemanden suchen, der die Arbeit erledigt.',
    },
  },
};

export default consult;
