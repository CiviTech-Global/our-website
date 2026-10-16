import type { HelpArticleText } from '../../types';

const jobs: Record<string, HelpArticleText> = {
  jobs: {
    title: 'Stellenangebote',
    summary: 'Stellen verifizierter Arbeitgeber im ganzen Iran und remote – mit Suche, Filtern und Benachrichtigungen.',
    intro:
      'Dieser Bereich listet Stellenangebote von Rayan Tamaddon Jahan Gostar und von anderen Unternehmen. Nur Arbeitgeber, deren Identität unser Team verifiziert hat, können Anzeigen aufgeben, und jede Anzeige wird vor der Veröffentlichung geprüft. Für Jobsuchende ist alles kostenlos: Suchen, Merken, Benachrichtigungen und Bewerben.',
    steps: [
      ['Suchen und filtern', 'Suchen Sie nach Jobtitel, Fähigkeit oder Unternehmen und filtern Sie nach Kategorie, Provinz, Land, Remote oder Mindestgehalt.'],
      ['Eine Anzeige öffnen', 'Jede Anzeige zeigt Anforderungen, Gehalt und Leistungen, Fähigkeiten und Angaben zum Unternehmen.'],
      ['Merken oder benachrichtigen lassen', 'Merken Sie interessante Anzeigen; mit „Benachrichtigung für diese Suche“ erfahren Sie von neuen.'],
      ['Bewerben', 'Melden Sie sich an und schließen Sie die Identitätsprüfung ab, um Ihren Lebenslauf zu senden; die Bewerbung geht direkt an den Arbeitgeber.'],
    ],
    points: [
      ['Verifizierte Arbeitgeber', 'Die Identität jedes Arbeitgebers ist geprüft, und jede Anzeige wird gelesen, bevor sie online geht.'],
      ['Provinz- und Kategorieseiten', 'Die Stellen einer Provinz, eines Landes oder einer Kategorie haben jeweils eine eigene Adresse, die Sie speichern können.'],
      ['Internationale Remote-Arbeit', 'Remote-Stellen für Bewerber aus allen Ländern oder aus einem bestimmten Land.'],
      ['Vorschläge aus Ihrer Aktivität', 'Angemeldet sehen Sie Anzeigen, die zu Ihren Bewerbungen und gemerkten Stellen passen.'],
    ],
    tips: [
      ['Benachrichtigung einrichten', 'Statt täglich nachzusehen, speichern Sie Ihre Suche mit „Benachrichtigung für diese Suche“; jede passende neue Anzeige meldet sich einmal.'],
    ],
    faqs: [
      ['Kostet eine Bewerbung etwas?', 'Nein. Suchen, Merken, Benachrichtigungen und Bewerben sind für Jobsuchende kostenlos.'],
      ['Wer kann hier Anzeigen aufgeben?', 'Nur Arbeitgeber, deren Identität unser Team verifiziert hat, und jede Anzeige wird vor der Veröffentlichung geprüft.'],
      ['Wie gebe ich eine Stellenanzeige auf?', 'Melden Sie sich an, schließen Sie die Identitätsprüfung ab, legen Sie unter Meine Anzeigen in Ihrem Dashboard eine Anzeige an und senden Sie sie zur Prüfung.'],
      ['Warum muss ich mich für eine Bewerbung verifizieren?', 'Damit der Arbeitgeber weiß, dass er es mit einer echten Person zu tun hat – aus demselben Grund werden Arbeitgeber verifiziert.'],
      ['Was unterscheidet das von „Lebenslauf senden“?', '„Lebenslauf senden“ ist für die Arbeit bei Rayan Tamaddon Jahan Gostar selbst; dieser Bereich ist für konkrete Stellen, von uns oder anderen Unternehmen.'],
    ],
    related: {
      'job-detail': 'Die Seite jeder Anzeige und das Bewerbungsformular.',
      companies: 'Die Unternehmen, die einstellen.',
      'my-applications': 'Für Jobsuchende: Bewerbungen, gemerkte Stellen und Benachrichtigungen.',
      'my-jobs': 'Für Arbeitgeber: Stellen ausschreiben und verwalten.',
    },
  },

  'job-detail': {
    title: 'Eine Stellenanzeige',
    summary: 'Die Details einer Stelle, wie gut Sie passen, und das Bewerbungsformular.',
    intro:
      'Jede Anzeige zeigt die Stellenbeschreibung, Anforderungen, Gehalt und Leistungen, die nötigen Fähigkeiten und Angaben zum Unternehmen. Haben Sie Ihre Fähigkeiten im Profil eingetragen, sehen Sie auch, wie viele der geforderten Fähigkeiten Sie mitbringen. Ihre Bewerbung geht direkt an den Arbeitgeber, und wir informieren Sie bei jedem Schritt.',
    steps: [
      ['Anzeige lesen', 'Prüfen Sie Anforderungen, Gehalt und Art der Stelle; antwortet der Arbeitgeber in der Regel, wird auch seine Antwortquote angezeigt.'],
      ['Ihre Passung sehen', 'Der Abschnitt „Wie gut passen Sie?“ zeigt die Fähigkeiten, die Sie haben, und die, die sich zu lernen lohnen.'],
      ['Anmelden und verifizieren', 'Das Bewerbungsformular öffnet sich, sobald Sie angemeldet und verifiziert sind.'],
      ['Lebenslauf senden', 'Senden Sie die Bewerbung und verfolgen Sie den Stand unter Meine Bewerbungen.'],
    ],
    tips: [
      ['Fähigkeiten ins Profil eintragen', 'Ohne Fähigkeiten im Profil lässt sich Ihre Passung nicht berechnen.'],
    ],
    faqs: [
      ['Woher weiß ich, dass der Arbeitgeber meinen Lebenslauf gesehen hat?', 'Öffnet der Arbeitgeber Ihre Bewerbung, steht sie auf „Vom Arbeitgeber gesehen“, und wir informieren Sie bei jeder Statusänderung.'],
      ['Kann ich meine Bewerbung zurückziehen?', 'Ja, unter Meine Bewerbungen. Solange die Anzeige offen ist, können Sie sich erneut bewerben.'],
      ['Kann ich mich zweimal auf dieselbe Anzeige bewerben?', 'Nein; haben Sie sich bereits beworben, wird das Datum in der Anzeige angezeigt.'],
      ['Ich sehe kein Gehalt.', 'Manche Arbeitgeber nennen es nicht; dann steht dort „Verhandelbar“.'],
    ],
    related: {
      jobs: 'Zurück zu allen Anzeigen.',
      companies: 'Die Seite des Unternehmens hinter der Anzeige.',
      'my-applications': 'Ihre gesendeten Bewerbungen verfolgen.',
      verification: 'Die Identitätsprüfung, die vor einer Bewerbung nötig ist.',
    },
  },

  companies: {
    title: 'Unternehmen',
    summary: 'Verifizierte Arbeitgeber, die Seite jedes Unternehmens und seine offenen Stellen.',
    intro:
      'Jeder verifizierte Arbeitgeber kann eine Unternehmensseite haben: Vorstellung, Unternehmensgröße, Bilder und alle offenen Stellen. Hier suchen Sie Unternehmen und gelangen von jeder Seite zu den Anzeigen.',
    steps: [
      ['Unternehmen finden', 'Suchen Sie nach Namen oder stöbern Sie nach Unternehmensgröße.'],
      ['Seite lesen', 'Sehen Sie die Vorstellung des Unternehmens und seine offenen Stellen.'],
      ['Sie sind Arbeitgeber?', 'Nach der Verifizierung legen Sie Ihre Unternehmensseite im Dashboard an; jede Ihrer Anzeigen verlinkt darauf.'],
    ],
    faqs: [
      ['Wie lege ich eine Unternehmensseite an?', 'Gehen Sie in Ihrem Dashboard zu Unternehmensseite. Zuvor muss Ihre Identität verifiziert sein.'],
      ['Warum wurde eine Unternehmensseite ausgeblendet?', 'Verstößt eine Seite gegen die Regeln der Website, blenden unsere Mitarbeitenden sie aus; die Inhaber können beim Support nach dem Grund fragen.'],
    ],
    related: {
      jobs: 'Alle Stellenangebote.',
      'my-jobs': 'Für Arbeitgeber: Anzeigen und Unternehmensseite.',
    },
  },
};

export default jobs;
