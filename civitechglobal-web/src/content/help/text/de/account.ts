import type { HelpArticleText } from '../../types';

const account: Record<string, HelpArticleText> = {
  login: {
    title: 'Anmelden',
    summary: 'Melden Sie sich mit E-Mail und Passwort an; ist die Zwei-Schritt-Anmeldung aktiv, wird auch der Code Ihrer Authenticator-App abgefragt.',
    intro:
      'Mit der Anmeldung erreichen Sie Ihr Dashboard: Profil, Identitätsprüfung, Vorgangscodes, Nachrichten und Ihre Marktplatz-Aktivität. Haben Sie die Zwei-Schritt-Anmeldung aktiviert, wird nach dem Passwort der sechsstellige Code aus Ihrer Authenticator-App (oder einer Ihrer Wiederherstellungscodes) abgefragt.',
    steps: [
      ['E-Mail und Passwort', 'Verwenden Sie die E-Mail-Adresse, mit der Sie sich registriert haben.'],
      ['Zwei-Schritt-Code, falls aktiv', 'Geben Sie den sechsstelligen Code aus Ihrer Authenticator-App oder einen Wiederherstellungscode ein.'],
      ['Dort weitermachen, wo Sie waren', 'Kamen Sie von einer Seite wie einer Anzeige zur Anmeldung, kehren Sie danach dorthin zurück.'],
    ],
    faqs: [
      ['Ich habe mein Passwort vergessen.', 'Nutzen Sie „Passwort vergessen?“. Kann keine E-Mail gesendet werden, verweist die Seite auf das Kontaktformular.'],
      ['Ich komme nicht an meine Authenticator-App.', 'Geben Sie einen der Wiederherstellungscodes ein, die Sie beim Aktivieren gespeichert haben. Jeder Code funktioniert einmal.'],
      ['Wie melde ich mich auf allen Geräten ab?', 'Wählen Sie im Sicherheitsbereich Ihres Profils „Überall abmelden“.'],
    ],
    related: {
      register: 'Noch kein Konto?',
      'password-reset': 'Passwort zurücksetzen.',
      dashboard: 'Was Sie nach der Anmeldung erwartet.',
    },
  },

  register: {
    title: 'Registrieren',
    summary: 'Legen Sie ein Konto an, um Anzeigen und Projekte auszuschreiben, Angebote zu senden, Bücher zu verkaufen und Ihre Vorgangscodes zu bündeln.',
    intro:
      'Für eine Projekt-, Versicherungs- oder Beratungsanfrage, einen Lebenslauf oder eine Nachricht an uns brauchen Sie kein Konto. Ein Konto ist für alles, wobei Ihre Identität zählt: eine Stelle oder ein Projekt ausschreiben, Angebote senden, sich bewerben, Bücher kaufen und verkaufen und ein Geschäft eintragen. Außerdem bleiben Ihre Vorgangscodes unter Meine Anfragen zusammen.',
    steps: [
      ['Grunddaten', 'Geben Sie Vorname, Nachname, E-Mail und ein Passwort ein.'],
      ['Ins Dashboard', 'Nach der Registrierung sind Sie sofort angemeldet.'],
      ['Verifizierung abschließen', 'Für Marktplatz-Aktivitäten bestätigen Sie Ihre Identität im Dashboard.'],
    ],
    faqs: [
      ['Kostet die Registrierung etwas?', 'Nein.'],
      ['Warum muss ich nach der Registrierung auch meine Identität verifizieren?', 'Die Registrierung legt ein Konto an; die Verifizierung bestätigt, dass eine echte Person dahintersteht. Sie ist für Kauf und Verkauf, Einstellungen und Projekte nötig.'],
      ['Welche Regeln gelten für das Passwort?', 'Sie stehen unter dem Passwortfeld; wählen Sie ein langes, einzigartiges Passwort.'],
    ],
    related: {
      login: 'Wenn Sie schon ein Konto haben.',
      'verify-email': 'Ihre E-Mail bestätigen.',
      verification: 'Identitätsprüfung nach der Registrierung.',
    },
  },

  'password-reset': {
    title: 'Passwort zurücksetzen',
    summary: 'Passwort vergessen? Fordern Sie einen Link zum Zurücksetzen an und legen Sie ein neues fest.',
    intro:
      'Auf der Seite zum Zurücksetzen geben Sie die E-Mail Ihres Kontos ein und erhalten einen Link; damit legen Sie ein neues Passwort fest. Kann die Website gerade keine E-Mail senden, sagt die Seite das offen und verweist Sie für Hilfe an das Kontaktformular.',
    steps: [
      ['E-Mail eingeben', 'Die Adresse, mit der Sie sich registriert haben.'],
      ['Link öffnen', 'Der Link führt zur Seite, auf der Sie ein neues Passwort wählen.'],
      ['Neues Passwort festlegen', 'Geben Sie es zweimal ein und melden Sie sich damit an.'],
    ],
    faqs: [
      ['Der Link ist nicht angekommen.', 'Sehen Sie im Spam-Ordner nach. Hat die Seite gemeldet, dass vorerst keine E-Mail gesendet werden kann, schreiben Sie über Kontakt.'],
      ['Der Link funktioniert nicht.', 'Er ist vielleicht abgelaufen; fordern Sie einen neuen an.'],
    ],
    related: {
      login: 'Zurück zur Anmeldung.',
      profile: 'Passwort ändern, während Sie angemeldet sind.',
    },
  },

  'verify-email': {
    title: 'E-Mail bestätigen',
    summary: 'Öffnen Sie den Bestätigungslink, um die E-Mail-Adresse Ihres Kontos zu bestätigen.',
    intro:
      'Diese Seite öffnet sich über den Link, der zur Bestätigung Ihrer E-Mail-Adresse gesendet wurde. Beim Öffnen wird der Link geprüft und das Ergebnis angezeigt. Die E-Mail-Bestätigung ist etwas anderes als die Identitätsprüfung: Erstere belegt, dass Ihnen die Adresse gehört, Letztere, wer Sie sind.',
    faqs: [
      ['Der Link ist abgelaufen.', 'Melden Sie sich an und fordern Sie im Dashboard einen neuen Link an, oder holen Sie sich Hilfe über Kontakt.'],
      ['Ist die E-Mail-Bestätigung dasselbe wie die Identitätsprüfung?', 'Nein. Ihre Identität verifizieren Sie gesondert im Dashboard.'],
    ],
    related: {
      register: 'Ein Konto anlegen.',
      login: 'Anmelden.',
      verification: 'Identitätsprüfung für Marktplatz-Aktivitäten.',
    },
  },
};

export default account;
