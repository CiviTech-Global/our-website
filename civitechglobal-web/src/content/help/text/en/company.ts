import type { HelpArticleText } from '../../types';

const company: Record<string, HelpArticleText> = {
  home: {
    title: 'Home page',
    summary: 'Where the site starts: who Rayan Tamaddon Jahan Gostar is, what we build, and where you can go from here.',
    heading: 'Start here',
    intro:
      'Rayan Tamaddon Jahan Gostar is a software engineering company that builds custom software, web and mobile apps, enterprise platforms and data analytics solutions. Alongside introducing the company, this site brings several services together in one place: software project requests, online insurance applications, consulting with experts, jobs, freelance projects and a book market. Each has its own guide, and all of them are collected in the help centre.',
    steps: [
      ['Say what you are looking for', 'To order software, go to Services or straight to Start a project; for insurance, to Insurance; for work or a project, to the marketplace.'],
      ['Open the guide on any page', 'On every page, the Guide button in the top bar (or the ? key) opens an explanation of that page beside it.'],
      ['Submit a request and keep the code', 'Every request you make has a tracking code; use it on Track a request to see where it stands.'],
      ['With an account, it is all in your dashboard', 'Signed in, your tracking codes, messages and marketplace activity sit together in your dashboard.'],
    ],
    points: [
      ['Software development', 'From idea to deployment and maintenance, with a free, no-obligation cost estimate and technical proposal.'],
      ['Secondary services', 'Online applications for many kinds of insurance, with a form per product, and technical and career consulting with experts.'],
      ['Marketplace', 'Jobs and freelance projects, each reviewed before publication, and a book market between members.'],
      ['Six languages', 'The site is available in Persian, English, Turkish, German, French and Spanish; switch language from the top bar.'],
    ],
    faqs: [
      ['What exactly does Rayan Tamaddon Jahan Gostar do?', 'Design and development of custom software, web and mobile apps, enterprise and civic-tech platforms, and data analytics and visualisation. Much of our work is open source.'],
      ['How is CiviTech Global related to Rayan Tamaddon Jahan Gostar?', 'CiviTech Global is the international brand of Rayan Tamaddon Jahan Gostar: one company, one team.'],
      ['Do I need to sign up to use the site?', 'Not to request a project, insurance or a consultation, send a CV or contact us. You need an account to post a listing, bid on a project or sell a book.'],
      ['How do I find out where my request has got to?', 'With the tracking code you received when you submitted it, on Track a request. If you were signed in, the code is also saved under My requests.'],
      ['Does the site have a trust seal?', 'Yes. The ENAMAD e-commerce trust seal appears at the bottom of every page.'],
    ],
    related: {
      services: 'The full list of software development services and how a project runs.',
      'start-project': 'The shortest route to a free technical proposal and cost estimate.',
      about: 'The mission, vision and values behind our work.',
      'help-centre': 'Every guide in one place, with search.',
    },
  },

  services: {
    title: 'Software design and development services',
    summary: 'What we build, the stages every project goes through, and our secondary services at a glance.',
    intro:
      'This page introduces our four main services: intelligent custom software development, web and mobile app development, enterprise and civic-tech platforms, and data analytics and visualisation. Every project, whatever its size, goes through four stages: ideation and consulting, analysis and design, development and testing, and deployment and support. Insurance services are listed on the same page as a secondary service.',
    steps: [
      ['Find the right service', 'Read the cards; if your need spans several, that is fine — you describe all of it in the project request.'],
      ['See the stages', 'The How a project runs section shows what happens from your request to delivery and support.'],
      ['Submit a project request', 'The Start a project button opens the brief; the technical proposal and cost estimate are free.'],
    ],
    points: [
      ['A written proposal before any commitment', 'You see the scope, deliverables, assumptions, exclusions, timeline and price range before work starts.'],
      ['Stage-by-stage development', 'The software is built in short, visible iterations so you see progress and give feedback at every step.'],
      ['Open source, no lock-in', 'Built on open standards and open-source technology, so your software stays free to extend.'],
      ['With you after delivery', 'Maintenance, updates and technical support after launch.'],
    ],
    faqs: [
      ['Do you take small projects?', 'Yes. Size is not how we decide; if something is outside our expertise, we say so honestly at the start.'],
      ['How do I find out the cost?', 'After you submit a request you receive a written proposal with a price range. Reviewing the request and writing the proposal costs nothing.'],
      ['How long will it take?', 'It depends on the scope. The detailed timeline is part of the written proposal, and you see it before work starts.'],
      ['Can you rebuild or maintain software I already have?', 'Yes. "Rebuild or modernise existing software" and "Maintenance and support" are both project types in the request form.'],
      ['Can I talk to someone before submitting a request?', 'Yes. Ask for a technical conversation on the Consulting page; a consultation creates no obligation.'],
    ],
    related: {
      'start-project': 'The brief: the next step once you have chosen a service.',
      portfolio: 'Examples of what we have built and the technology behind them.',
      consult: 'If you are not yet sure what you need, talk it through first.',
      insurance: 'Our secondary service: online applications for many kinds of insurance.',
    },
  },

  'start-project': {
    title: 'Software project request',
    summary: 'Describe what you need and get a technical proposal, timeline and price range, free and without obligation.',
    intro:
      'This form turns your request into a formal proposal. The more clearly you describe the need, goals, constraints and budget, the more precise the proposal. After you submit it you get a tracking code; our specialists review the request, ask about anything unclear, and finally send a written proposal that you read under the same code and accept or decline.',
    steps: [
      ['Introduce yourself', 'Name, email and phone are required. Email and phone together are your identity; enter the same two in later requests.'],
      ['Describe the project', 'Choose the title, project type, engagement model and platforms, and in the brief say in your own words what does not work today and what you expect.'],
      ['Give timing and budget', 'Give a budget range, not an exact figure. If you have no set budget, choose that option.'],
      ['Attach documents', 'Up to 8 files (each up to 10 MB, 25 MB in total). If you need a non-disclosure agreement before review, tick the NDA option.'],
      ['Keep the tracking code', 'Copy the code after submitting. You read the proposal under it on Track a request.'],
    ],
    points: [
      ['A formal, free proposal', 'Scope, deliverables, assumptions, what is not included, timeline and a price range.'],
      ['No commitment until you accept', 'Until you accept the proposal you are not committed to anything; if you decline it, that is the end of it.'],
      ['Confidentiality', 'What you send stays with us, and an NDA is signed before review if you need one.'],
    ],
    tips: [
      ['Do not leave "Out of scope" empty', 'Knowing from the start what you do not want makes the proposal more precise and the price more realistic.'],
      ['Why a budget range?', 'At this stage a software estimate is accurate to roughly −25% to +75%; a range is more realistic for both sides than a single number.'],
      ['Sign in so the code is not lost', 'If you are signed in before submitting, the tracking code is saved automatically under My requests.'],
    ],
    faqs: [
      ['Is reviewing the request and writing a proposal free?', 'Yes. Both are free.'],
      ['When will the proposal be ready?', 'It depends on how complex the request is. Check the status any time with your tracking code; if we have questions, we ask them before writing the proposal.'],
      ['What happens if I decline the proposal?', 'Nothing; you decline and that is it. What you sent stays with us and reaches nobody else.'],
      ['I have lost my tracking code.', 'If you were signed in, it is under My requests. Otherwise send a message from Contact us using the same email and phone number.'],
      ['I do not know which project type to choose.', 'Choose the closest one, or Other, and explain in the brief; we correct it during review.'],
    ],
    related: {
      services: 'If you are not yet sure which service fits.',
      track: 'Where you read the proposal under your tracking code and accept or decline it.',
      'my-requests': 'For members: all your tracking codes in one list.',
      consult: 'A technical conversation before you submit, without obligation.',
    },
  },

  about: {
    title: 'About us',
    summary: 'Who Rayan Tamaddon Jahan Gostar is: mission, vision, values and what we do.',
    intro:
      'This page introduces the company: our mission is to help civilisation get more out of technology every day, by building custom and open-source software for individuals, businesses and organisations. Our vision is a fully intelligent civilisation, and on the way there we want to be a home for open-source engineering and for the next generation of engineers.',
    points: [
      ['Mission and vision', 'Why we do this and where we want to get to.'],
      ['Values', 'Innovation, transparency, community and excellence, and what each means day to day.'],
      ['Get to know us', 'Links to the team, projects, customers, partners and the blog.'],
    ],
    faqs: [
      ['What is CiviTech Global?', 'The international brand of Rayan Tamaddon Jahan Gostar.'],
      ['Why open source?', 'The code is transparent and auditable, tied to no vendor, its security is tested by a wide community, and it costs less to own.'],
      ['How can I work with you?', 'For a project, use Start a project; for a job, Send your CV; for an internship, Volunteering and internships.'],
    ],
    related: {
      team: 'The people who do the work, and how they work.',
      portfolio: 'What we have built so far.',
      customers: 'The organisations whose software we built.',
      join: 'If you want to be part of this team.',
    },
  },

  team: {
    title: 'Our team',
    summary: 'The engineers, designers and collaborators who build this platform and our clients’ projects.',
    heading: 'How our team works',
    intro:
      'Behind every project stands a group of software engineers who review each other’s work, write decisions down, and answer for the work from the first message to delivery. Rayan Tamaddon Jahan Gostar is built on open source, collaboration with the global engineering community, and an open door for people starting out; this section explains what that means day to day.',
    points: [
      ['Code that is reviewed and tested', 'Every change is read by another engineer and covered by tests before delivery. The aim is code that works for years, not just on delivery day.'],
      ['Decisions on paper', 'Scope, assumptions, what is not included, timeline and price range all go into a written proposal. What is not written down has not been agreed.'],
      ['Accessible from day one', 'What we build works with a keyboard and a screen reader and opens on an inexpensive phone. That is a decision, not an extra feature.'],
      ['Open source and an open door', 'Part of our work happens as open-source projects alongside the global engineering community, and the volunteering and internship programme gives people starting out a way to work on real projects.'],
    ],
    faqTitle: 'Common questions about the team',
    faqs: [
      ['How can I join the team?', 'Send your CV from the Send your CV page. We read it and get in touch whenever a role opens that fits your experience.'],
      ['I am just starting out; is there room for me?', 'Yes. The volunteering and internship programme exists for exactly that: real projects alongside experienced engineers.'],
      ['How is CiviTech Global related to Rayan Tamaddon Jahan Gostar?', 'CiviTech Global is the international brand of Rayan Tamaddon Jahan Gostar: one company, one team.'],
      ['How do I start a project with this team?', 'Submit your request on the Start a project page. You get a tracking code, and a written proposal is prepared for you, free and without obligation.'],
    ],
    related: {
      join: 'Send your CV for a job.',
      volunteer: 'The route for people starting out: volunteering and internships on real projects.',
      experts: 'Experts who give technical and career advice.',
      'start-project': 'Start a project with this team.',
    },
  },

  portfolio: {
    title: 'Our projects',
    summary: 'Projects in progress and delivered: the platforms, apps and systems we have built.',
    intro:
      'This page shows examples of our work. For each project you see a short description, its status (in progress or delivered), the technology used and, where available, screenshots and a link. If a project was built for a named client, the client is shown too.',
    steps: [
      ['Browse the list', 'Filter projects by status (in progress or delivered) or by the technology used.'],
      ['Open the screenshots', 'Each project’s gallery shows how it looks and works.'],
      ['Want something similar?', 'Mention the project in your request so we understand exactly what you mean.'],
    ],
    faqs: [
      ['Are all your projects here?', 'Not all of them. Some projects are confidential and are published only with the client’s permission.'],
      ['Can I see the code?', 'For open-source projects, yes; if a repository link has been published, it is on the project.'],
      ['I want something like one of these.', 'Describe your need on Start a project and mention the project.'],
    ],
    related: {
      services: 'The services these projects came out of.',
      customers: 'The organisations we built this software for.',
      'start-project': 'Start your own project.',
    },
  },

  customers: {
    title: 'Customers club',
    summary: 'The organisations whose software we built, and what they say about working with us.',
    heading: 'What being our customer means',
    intro:
      'The customers club lists the organisations and businesses whose software we have built. More important than the list is the experience every customer has from the first message to delivery — the same thing we promise everyone, from small projects to large ones.',
    points: [
      ['A free written proposal', 'Reviewing your request and writing the proposal costs nothing. It covers scope, deliverables, assumptions, exclusions, timeline and a price range.'],
      ['A tracking code, always available', 'Submitting a request gives you a tracking code. At any time, even at three in the morning, you can see where the work stands and accept or decline the proposal.'],
      ['The price before the work', 'You see the price range before anything starts. If part of the work is not worth what it would cost, we say so at the outset.'],
      ['A straight answer', 'If something is outside our expertise, we say so honestly. Size does not decide what we take on; small projects are welcome.'],
    ],
    faqTitle: 'Common questions from customers',
    faqs: [
      ['Do I have to pay to get a quote?', 'No. Reviewing the request and writing the proposal are free.'],
      ['What happens if I decline the proposal?', 'Nothing happens; you decline and that is the end of it. Whatever you sent stays with us and reaches nobody else.'],
      ['I have lost my tracking code.', 'Contact us from the same phone number or email address you used for the request, and we will give it to you again.'],
      ['Do finished engagements stay on this list?', 'Yes. Past customers stay in a separate section; "we built this software for them" is still true.'],
    ],
    related: {
      portfolio: 'The projects we built for these customers.',
      'start-project': 'Become a customer: submit a project request.',
      partners: 'The organisations we work alongside.',
    },
  },

  partners: {
    title: 'Our partners',
    summary: 'The technology, academic, community and strategic partners we build software alongside.',
    heading: 'Working with us',
    intro:
      'Our partners are the organisations we build software alongside: from technology companies to universities and open-source communities. Each partnership has its own shape, but the foundation is the same: transparency about the work, the decisions and the limits, and quality you can rely on.',
    points: [
      ['Technology partner', 'Companies whose technology, infrastructure or tools we use alongside our work, or who choose us to build part of their product.'],
      ['Academic partner', 'Universities and training centres we work with to grow the next generation of engineers — an open door to real projects for students.'],
      ['Community partner', 'Open-source communities and projects we contribute to, which make building alongside others, not in isolation, possible.'],
      ['Strategic and sales partner', 'Organisations that represent or resell our solutions in their market, or walk a long-term path with us.'],
    ],
    faqTitle: 'Common questions about partnering',
    faqs: [
      ['How do I propose a partnership?', 'Send a message from Contact us and say what kind of partnership you have in mind. You get a tracking code and read our reply under it on the same page.'],
      ['What do we look for in a partner?', 'The values we work by ourselves: transparency, quality never traded for speed, and building with others.'],
      ['When does a partner’s name appear on this page?', 'Once the partnership is in place. Finished partnerships stay in a separate section.'],
    ],
    related: {
      customers: 'The organisations we have built software for.',
      contact: 'Send your partnership proposal from here.',
      volunteer: 'For universities: the internship route for students.',
    },
  },

  contact: {
    title: 'Contact us',
    summary: 'Send a message, get a tracking code and read the reply with it on this page — no email needed.',
    heading: 'How your message is followed up',
    intro:
      'To message us you need neither an account nor to wait for an email. You send the message, get a tracking code, and read the reply with that code on this same page.',
    points: [
      ['A tracking code instead of email', 'Your email only identifies your message; no reply is sent to it. You read our reply on this page with the tracking code.'],
      ['The code is shown only once', 'Note or copy the code straight after sending; it is the only way back to your message.'],
      ['A clear status', 'Each message is Awaiting reply, Answered or Closed. Entering the code shows the status and the reply together.'],
      ['The right route for each job', 'For a software project use Start a project, and to talk to an expert use Request a consultation. Follow insurance requests with their own code on Track a request.'],
    ],
    tips: [
      ['Copy the code now', 'The message’s tracking code is shown only once and no email is sent; without it you cannot reach the reply.'],
    ],
    faqTitle: 'Common questions about contacting us',
    faqs: [
      ['Will you email me the reply?', 'No. The reply is read on this page with the tracking code, which is why keeping the code matters.'],
      ['How long until I get a reply?', 'We review messages soon. Until we reply, the message shows Awaiting reply.'],
      ['I have lost my tracking code.', 'Send a new message mentioning the earlier one; you read the reply under the new message’s code.'],
      ['Which page should I use to start a project?', 'Start a project. There, your request leads to a written proposal with scope, timeline and a price range.'],
    ],
    related: {
      'start-project': 'For a software project, its own form gets a better answer.',
      consult: 'To talk to an expert, ask for a consultation.',
      track: 'Follow project, insurance, CV and consultation requests.',
    },
  },

  join: {
    title: 'Send your CV',
    summary: 'Send us your CV and we get in touch as soon as a role opens that fits your experience.',
    heading: 'From CV to conversation',
    intro:
      'This form is for people who want to work at Rayan Tamaddon Jahan Gostar: software engineers, designers or product managers, junior or experienced. We read your CV and get in touch whenever a matching role opens. You can see your CV’s status at any time with a tracking code.',
    steps: [
      ['Enter your details', 'Name, email and phone are required; email and phone together identify you in later follow-ups.'],
      ['Attach your CV', 'PDF, Word (docx) or LaTeX (tex), up to 10 MB. A short note is optional.'],
      ['Keep the tracking code', 'After sending you get a code; use it on Track a request to see your CV’s status.'],
    ],
    tips: [
      ['Sending limit', 'Each person can send a CV at most twice a day (an hour apart) and on only two days, so send your final version.'],
    ],
    faqs: [
      ['I am just starting out; should I send a CV?', 'Yes. If you have no work experience yet, the volunteering and internship programme is built for you too.'],
      ['Do you reply to every CV?', 'We read it, and you can see its status with your tracking code. We get in touch when a matching role opens.'],
      ['Can I update my CV?', 'Send the new version again, within the limit of twice a day on two days.'],
      ['Can I apply for a specific vacancy?', 'Yes; for listings on Jobs, apply directly from the listing’s page.'],
    ],
    related: {
      volunteer: 'If you are looking for an internship or volunteer work.',
      jobs: 'Open vacancies, from us and from other companies.',
      team: 'Meet the team you would be joining.',
      track: 'Your CV’s status with the tracking code.',
    },
  },

  volunteer: {
    title: 'Volunteering and internships',
    summary: 'Work on real projects as a volunteer or intern, and grow alongside experienced engineers.',
    intro:
      'This programme is for students and recent graduates, people changing career into software, and developers who want to contribute to open-source and civic projects. It has two forms: volunteering, where you give your free time to projects without a strict time commitment, and an internship, which is a fixed period with a learning plan, a mentor and a final assessment.',
    steps: [
      ['Choose the kind of placement', 'Volunteer or intern; each has its own description in the form.'],
      ['Say what and when', 'Your field (front end, back end, mobile, data, design and so on), hours per week, start date and working arrangement (on site, hybrid or remote).'],
      ['Describe your studies and skills', 'University, field of study, skills and a GitHub or portfolio link; the fuller it is, the easier it is to find the right project.'],
      ['Send it and keep the code', 'Follow your application with the tracking code.'],
    ],
    points: [
      ['Real projects', 'Work on software that is actually used, not made-up exercises.'],
      ['Review and mentoring', 'Code review and guidance from experienced engineers.'],
      ['A certificate', 'A certificate and reference letter for those who complete the placement.'],
    ],
    faqs: [
      ['Is volunteering paid?', 'Volunteering is unpaid and flexible in time. If you are looking for a job, use Send your CV.'],
      ['Can I apply without experience?', 'Yes; that is what the programme is for. List whatever skills you have, however few.'],
      ['Is remote work possible?', 'Yes. Choose on site, hybrid or remote as the working arrangement in the form.'],
      ['What is the difference between an internship and volunteering?', 'An internship is a fixed period with a learning plan, a mentor and a final assessment; volunteering is flexible with no strict time commitment.'],
    ],
    related: {
      join: 'If you are looking for a job.',
      team: 'The engineers you would work alongside.',
      experts: 'For career advice from experts.',
    },
  },

  blog: {
    title: 'Blog',
    summary: 'Practical guides to insurance and software: prices, buying tips and comparisons, written for better decisions.',
    intro:
      'The blog publishes articles that help with a real decision: the price of third-party and car body insurance, tips for buying insurance, or how to define a software project. Most articles are in Persian and some have an English edition; an article that does not exist in your language does not appear in that language’s list.',
    steps: [
      ['Find an article', 'Browse the list; each article has a summary, a publication date and an estimated reading time.'],
      ['Read, then act', 'Every article ends with a link to the online insurance application, so you can start a request there if you are ready.'],
    ],
    faqs: [
      ['How often are articles published?', 'Whenever we have something new to say; we prefer quality to quantity.'],
      ['Are the prices in the articles final?', 'No. Prices are as of the article’s publication date and can change; you get the final price when you apply.'],
      ['Why is an article I saw not in another language?', 'Each article is published only in the languages it was written in; we do not publish machine translations.'],
    ],
    related: {
      insurance: 'After reading an insurance article, apply for that insurance.',
      services: 'The software services the technical articles relate to.',
      'help-centre': 'For guides to using each part of the site.',
    },
  },

  track: {
    title: 'Track a request',
    summary: 'Use your tracking code to see the status of a project, insurance, CV or consultation request.',
    intro:
      'Every request you make on this site has a ten-character tracking code. This page shows the request’s status from that code, whatever kind it is: a software project request (and our proposal, which you accept or decline right here), an insurance request (and the agreed callback time), a CV, or a consultation request (which you can cancel if needed). Messages from the contact form are followed separately on the Contact us page.',
    steps: [
      ['Enter the code', 'Type the code as you received it; letters are capitalised automatically.'],
      ['See the status', 'The request type, submission date, last update and current status are shown.'],
      ['If a proposal has arrived, decide', 'For a project request, open the written proposal and accept or decline it.'],
    ],
    points: [
      ['One page for everything', 'Projects, insurance, CVs and consultations are all followed with the same form.'],
      ['A shareable link', 'The code stays in the page address, so you can bookmark the link or send it to the person the insurance is for.'],
    ],
    tips: [
      ['Keep them all in one place', 'If you have an account, add your codes under My requests so you do not have to type them each time.'],
    ],
    faqs: [
      ['Where is my tracking code?', 'It is shown straight after you submit a request. If you were signed in, it is also saved under My requests.'],
      ['It says no request was found with this code.', 'Check the code again; do not confuse zero with the letter O, or one with the letter I. If it still fails, send a message from Contact us.'],
      ['Do I follow a contact form message here?', 'No; contact messages are followed on the Contact us page itself, with their own code.'],
      ['What can others see with my code?', 'Anyone with the code can see the status; keep it like a password and share it only with whoever needs it.'],
    ],
    related: {
      'start-project': 'Submit a software project request.',
      insurance: 'Submit an insurance request.',
      join: 'Send your CV.',
      'my-requests': 'For members: every code in one list.',
    },
  },

  'help-centre': {
    title: 'Help centre',
    summary: 'Every guide on the site in one place, grouped and searchable.',
    intro:
      'For each part of the site, the help centre explains what it does, how to use it, which other sections it works with, and the answers to common questions. The same guides are available on every page through the Guide button or the ? key. Guides to the member dashboard can be read by anyone, so you know what an account offers before you create one.',
    steps: [
      ['Search', 'Type something like "tracking code", "verification" or "proposal".'],
      ['Or browse a collection', 'Guides are grouped by the parts of the site.'],
      ['Go from the guide to the section', 'Each guide has a Go to this section button and links to related sections.'],
    ],
    faqs: [
      ['I could not find the answer to my question.', 'Ask from the Contact us page; questions that come up often are added to the guides.'],
      ['The guide is not in my language.', 'Guides to the public pages are written in all six of the site’s languages; guides to the member and admin panels are in Persian and English for now.'],
    ],
    related: {
      home: 'Back to the home page.',
      contact: 'If the answer to your question was not in the guides.',
      dashboard: 'The member dashboard guide.',
    },
  },
};

export default company;
