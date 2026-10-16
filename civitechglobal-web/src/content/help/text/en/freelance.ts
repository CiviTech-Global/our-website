import type { HelpArticleText } from '../../types';

const freelance: Record<string, HelpArticleText> = {
  projects: {
    title: 'Freelance projects',
    summary: 'Fixed-price and hourly projects from verified clients: find one, send a proposal and carry the work through.',
    intro:
      'Clients post projects here and freelancers send proposals for them. Every project is reviewed before it is published, and can be fixed-price or hourly. Anyone can browse the projects, but to post a project or send a proposal you need to sign in and complete identity verification. Payment does not go through the site; client and freelancer arrange it directly with each other.',
    steps: [
      ['Find a project', 'Search titles, descriptions or skills; sort and filter by category, pricing type, experience level or fewest proposals.'],
      ['Read the project', 'See the budget, duration, skills and the client’s record (verified, hire rate and rating).'],
      ['Send a proposal', 'Give your price or hourly rate, delivery time and a milestone plan, and answer the client’s questions.'],
      ['Carry the work through', 'If you are hired, the engagement opens under My collaborations, and the conversation and milestones continue in your dashboard.'],
    ],
    points: [
      ['Fixed price or hourly', 'On hourly projects you log your hours and the client approves them.'],
      ['Milestone payments', 'Split the work into milestones with an amount and a time each; the milestones must add up to your proposal.'],
      ['NDA', 'Some projects require you to sign a non-disclosure agreement before reading the description and attachments.'],
      ['Project visibility', 'A project can be visible to everyone, to members only, or only to invited freelancers.'],
    ],
    tips: [
      ['Set a project alert', 'Create an alert for your search so you do not miss new projects that match it.'],
    ],
    faqs: [
      ['Does the site hold the money or handle payment?', 'No. Payment does not go through the site; client and freelancer agree the amount and method directly. The milestone plan helps keep that agreement clear.'],
      ['Why is verification required?', 'To post a project, send a proposal or sign an NDA. Both sides know they are dealing with a real person.'],
      ['When will my project be published?', 'After you send it for review, usually within a few hours.'],
      ['How many proposals can I send?', 'One per project; you can withdraw it before the client decides.'],
    ],
    related: {
      'project-detail': 'Each project’s page and the proposal form.',
      'client-projects': 'For clients: posting and managing projects.',
      'my-proposals': 'For freelancers: proposals, invitations and collaborations.',
      freelancers: 'Freelancers you can invite to your project.',
    },
  },

  'project-detail': {
    title: 'A project page',
    summary: 'The details of one project, the client’s record and the proposal form.',
    intro:
      'Each project page shows the description, the budget or hourly rate range, the duration, the experience level wanted, the skills and the client’s record. If the project requires an NDA, the full description and attachments open once you sign it. If the client invited you, an Invited label is shown.',
    steps: [
      ['Read, then decide', 'Look at the budget, duration and the client’s questions before writing a proposal.'],
      ['Sign the NDA if needed', 'Enter your name as your signature to open the description and files.'],
      ['Write your proposal', 'Your price or hourly rate, a milestone plan, delivery time and answers to the questions.'],
      ['Wait for the reply', 'See the proposal’s status under My proposals; messages from the client arrive under Messages.'],
    ],
    tips: [
      ['Write a proposal for this project', 'Address this project’s problem and answer the client’s questions precisely; generic proposals are chosen less often.'],
    ],
    faqs: [
      ['What does signing the NDA commit me to?', 'To keeping the project description, attachments and anything the client tells you about it confidential.'],
      ['Can I decline an invitation?', 'Yes, with Decline invitation. The client is told.'],
      ['What happens if the project is closed?', 'A closed project accepts no new proposals; earlier proposals stay in your list.'],
    ],
    related: {
      projects: 'Back to all projects.',
      'my-proposals': 'The proposals you have sent.',
      verification: 'Required before sending a proposal.',
      messages: 'Talking to the client.',
    },
  },

  'freelance-services': {
    title: 'Freelance services',
    summary: 'Ready-made work at a set price: choose a package and order it.',
    intro:
      'Freelance services work the other way round from projects: a freelancer offers what they do at a set price and delivery time, and you order it. Each service can have up to three packages: Basic, Standard and Premium. Every service is reviewed before it is published.',
    steps: [
      ['Find a service', 'Search and sort by category, price or rating.'],
      ['Choose a package', 'Compare what each package includes and how long delivery takes.'],
      ['Place an order', 'Once signed in and verified, send the order with a description of what you need.'],
      ['Wait for the seller', 'The seller accepts or declines the order; follow its status under Orders in your dashboard.'],
    ],
    faqs: [
      ['How is payment made?', 'Not through the site; once the order is accepted, buyer and seller arrange it directly.'],
      ['How is a service different from a project?', 'With a project you describe the work and receive proposals; with a service, the freelancer offers ready-made work at a set price.'],
      ['How do I offer my own service?', 'Create a service under My services in your dashboard and send it for review.'],
    ],
    related: {
      'my-services': 'For sellers: creating services and managing orders.',
      freelancers: 'Sellers’ profiles.',
      projects: 'If what you need is not ready-made and has to be described, post a project.',
    },
  },

  freelancers: {
    title: 'Freelancers and profiles',
    summary: 'Find freelancers by skill, language and availability, read their profiles and invite them.',
    intro:
      'The freelancer directory shows the public profiles of members who have a username and either list skills on their profile or offer an active, approved service: their skills, languages, country, availability, ratings and work samples. Contact details are never shown in the directory.',
    steps: [
      ['Search', 'Filter by skill, category, language, country, availability or verification, and sort by rating.'],
      ['Read a profile', 'Verification badge, ratings, work samples and the services they offer.'],
      ['Invite', 'Clients can invite a freelancer by username to send a proposal for their project.'],
    ],
    faqs: [
      ['How do I appear in this directory?', 'Choose a username and add your skills in your dashboard, or offer a service that gets approved. Work samples make an invitation more likely.'],
      ['What does the verified badge on a profile mean?', 'That our team has verified this member’s identity.'],
      ['Where do ratings come from?', 'From the people who rated this member at the end of working together.'],
    ],
    related: {
      profile: 'Creating and editing your own public profile.',
      'freelance-services': 'The services freelancers offer.',
      projects: 'Projects you can send proposals for.',
    },
  },
};

export default freelance;
