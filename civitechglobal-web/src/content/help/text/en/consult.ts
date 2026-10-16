import type { HelpArticleText } from '../../types';

const consult: Record<string, HelpArticleText> = {
  consult: {
    title: 'Request a consultation',
    summary: 'Ask for technical or career advice; tell us when you are free and we call you.',
    intro:
      'Your career path, a technical problem or a code review, getting started in software, or preparing for interviews and your CV: say what you want to talk about and when you are available. We call you and settle the time. The session can be online, by phone or in person, and it commits you to nothing.',
    steps: [
      ['Choose a topic', 'Career path, a technical problem, getting started, interviews and CV, or something else.'],
      ['Say how and why', 'Online, by phone or in person, and what you hope the session will achieve.'],
      ['Choose an expert, or leave it to us', 'If you have someone from the experts club in mind, choose them; otherwise, Whoever fits best.'],
      ['Give the times you are free', 'Pick a few windows (a day and morning, afternoon or evening). Rough times are enough.'],
      ['Keep the tracking code', 'We call the number you gave; follow the status with the code, and cancel the request if you need to.'],
    ],
    points: [
      ['A clear status', 'Received, Arranging a time, Time confirmed, Held — all under the tracking code.'],
      ['Easy to cancel', 'If your plans change, cancel the request from the tracking page.'],
    ],
    tips: [
      ['Be specific about the goal', 'The more precise your expectation, the more useful the conversation — for example, "I want to know where to start to move into back-end work".'],
    ],
    faqs: [
      ['Does a consultation commit me to anything?', 'No. A consultation creates no obligation to start a project or work together.'],
      ['When will you call?', 'Within one of the windows you gave, to confirm the session time. The confirmed time also appears on the tracking page.'],
      ['Do I need an email address?', 'No; a phone number is enough. Email is optional.'],
      ['Can I cancel the request?', 'Yes, with the tracking code on the Track a request page.'],
    ],
    related: {
      experts: 'Experts you can ask for by name.',
      'start-project': 'If the consultation leaves you ready to start a project.',
      'my-requests': 'For members: the consultation code in your request list.',
    },
  },

  experts: {
    title: 'Experts club',
    summary: 'Engineers and specialists who give technical and career advice, with their fields, languages and years of experience.',
    heading: 'How the experts club works',
    intro:
      'The experts club is a group of engineers and specialists who give technical and career advice — the people we turn to ourselves, whom you can also ask for by name. Each expert shows whether they are taking consultations.',
    points: [
      ['Technical advice', 'For decisions such as choosing technology and designing an architecture, or reviewing a system you have that is not working as it should.'],
      ['Career advice', 'For engineers who are just starting or changing direction, from people who have walked that road themselves.'],
      ['Choose by name', 'Each expert’s page lists their fields, languages and years of experience. If they are taking consultations, you can ask for one directly from that page.'],
      ['Arranging a consultation', 'Submit a request on the Request a consultation page with a few suitable times, and we call you. A consultation commits you to nothing.'],
    ],
    faqTitle: 'Common questions about consultations',
    faqs: [
      ['How do I book a consultation?', 'From the Request a consultation page, or with the consultation button on an expert’s page. Give a few suitable times and we call you.'],
      ['Can I choose the expert myself?', 'Yes. Experts labelled Taking consultations can be requested by name.'],
      ['Does a consultation commit me to starting a project?', 'No. A consultation creates no obligation.'],
      ['How do I join the experts club?', 'Write about your experience and expertise from the Contact us page. Club profiles are added and maintained by our team.'],
    ],
    related: {
      consult: 'The consultation request form.',
      team: 'The Rayan Tamaddon Jahan Gostar engineering team.',
      freelancers: 'If you want someone to do the work rather than advise on it.',
    },
  },
};

export default consult;
