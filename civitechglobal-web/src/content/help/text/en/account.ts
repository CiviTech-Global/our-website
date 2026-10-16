import type { HelpArticleText } from '../../types';

const account: Record<string, HelpArticleText> = {
  login: {
    title: 'Sign in',
    summary: 'Sign in with your email and password; if two-step sign-in is on, your authenticator code is asked for too.',
    intro:
      'Signing in gives you your dashboard: profile, identity verification, tracking codes, messages and your marketplace activity. If you have turned on two-step sign-in, after your password you are asked for the six-digit code from your authenticator app (or one of your recovery codes).',
    steps: [
      ['Email and password', 'Use the email address you signed up with.'],
      ['Two-step code, if it is on', 'Enter the six-digit code from your authenticator app, or a recovery code.'],
      ['Carry on where you were', 'If you came to sign in from a page such as a listing, you return to it afterwards.'],
    ],
    faqs: [
      ['I have forgotten my password.', 'Use "Forgot your password?". If an email cannot be sent, the page directs you to the contact form.'],
      ['I cannot get to my authenticator app.', 'Enter one of the recovery codes you saved when you turned two-step sign-in on. Each code works once.'],
      ['How do I sign out on every device?', 'In the security section of your profile, choose Sign out everywhere.'],
    ],
    related: {
      register: 'No account yet?',
      'password-reset': 'Resetting your password.',
      dashboard: 'What is waiting once you are signed in.',
    },
  },

  register: {
    title: 'Sign up',
    summary: 'Create an account to post listings and projects, send proposals, sell books and keep your tracking codes in one place.',
    intro:
      'You do not need an account to request a project, insurance or a consultation, send a CV or contact us. An account is for things where your identity matters: posting a vacancy or a project, sending proposals, applying for jobs, buying and selling books and listing a shop. Your tracking codes also stay together under My requests.',
    steps: [
      ['The basics', 'Enter your first name, last name, email and a password.'],
      ['Into your dashboard', 'After signing up you are signed in straight away.'],
      ['Complete verification', 'For marketplace activity, confirm your identity from your dashboard.'],
    ],
    faqs: [
      ['Does signing up cost anything?', 'No.'],
      ['Why do I also need to verify my identity after signing up?', 'Signing up creates an account; verification confirms there is a real person behind it. It is needed for buying and selling, hiring and projects.'],
      ['What are the password rules?', 'They are shown under the password field; choose a long, unique password.'],
    ],
    related: {
      login: 'If you already have an account.',
      'verify-email': 'Confirming your email.',
      verification: 'Identity verification after signing up.',
    },
  },

  'password-reset': {
    title: 'Reset your password',
    summary: 'If you have forgotten your password, ask for a reset link and set a new one.',
    intro:
      'On the Reset your password page you enter your account’s email to be sent a reset link; opening the link lets you set a new password. If the site cannot send email at that moment, the page says so plainly and sends you to the contact form for help instead.',
    steps: [
      ['Enter your email', 'The one you signed up with.'],
      ['Open the link', 'The reset link takes you to the page for choosing a new password.'],
      ['Set a new password', 'Enter it twice and sign in with it.'],
    ],
    faqs: [
      ['The link has not arrived.', 'Check your spam folder. If the page said email cannot be sent for now, send a message from Contact us.'],
      ['The link does not work.', 'It may have expired; ask for a new reset.'],
    ],
    related: {
      login: 'Back to sign in.',
      profile: 'Changing your password while signed in.',
    },
  },

  'verify-email': {
    title: 'Confirm your email',
    summary: 'Open the email confirmation link to confirm your account’s email address.',
    intro:
      'This page opens from the link sent to confirm your email address. When it opens, the link is checked and the result is shown. Confirming your email is different from identity verification: the first proves you own the address, the second confirms who you are.',
    faqs: [
      ['The link has expired.', 'Sign in and ask for a fresh link from your dashboard, or get help from Contact us.'],
      ['Is confirming my email the same as identity verification?', 'No. You verify your identity separately, from your dashboard.'],
    ],
    related: {
      register: 'Creating an account.',
      login: 'Signing in.',
      verification: 'Identity verification for marketplace activity.',
    },
  },
};

export default account;
