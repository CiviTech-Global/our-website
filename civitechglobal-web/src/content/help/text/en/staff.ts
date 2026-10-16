import type { HelpArticleText } from '../../types';

const staff: Record<string, HelpArticleText> = {
  'admin-dashboard': {
    title: 'Admin dashboard',
    summary: 'An overview of the queues assigned to you: new arrivals, the last 14 days’ trend and the latest activity.',
    intro:
      'Each staff member sees only the sections the super admin has assigned them, and the dashboard is built the same way: the number of items waiting in each queue, a chart of new requests over the last 14 days, and the latest requests (projects, CVs, volunteering, insurance and messages). When everything has been handled, it says so.',
    steps: [
      ['Start with the fullest queues', 'Each queue’s card shows how many items are waiting and takes you to that queue.'],
      ['Read the trend', 'The 14-day chart shows whether arrivals are rising or falling.'],
      ['Latest activity', 'Open the newest requests from here.'],
    ],
    tips: [
      ['No access?', 'If you cannot see a section, the super admin has not assigned it to you yet; access is set on the Users page.'],
    ],
    faqs: [
      ['Why does my dashboard look different from a colleague’s?', 'Everyone sees only the queues of the sections assigned to them.'],
      ['How is the super admin different?', 'They have access to every section, and some — such as Team and Marketplace events — are theirs alone.'],
    ],
    related: {
      'admin-audit': 'Marketplace events, for the super admin.',
      'admin-users': 'Setting staff access.',
      'admin-analytics': 'Marketplace statistics.',
    },
  },

  'admin-insurance-requests': {
    title: 'Insurance requests',
    summary: 'Insurance requests from the website and the Telegram bot: assigning, calling, scheduling and seeing them through.',
    intro:
      'Every insurance request, whether from the site’s form or the Telegram bot, arrives here. For each you see the channel, the policy type, contact details, whether the number was verified, the form answers and the preferred contact time. You assign the request to a colleague, record the call time and move the status from New to Completed or Cancelled; the applicant sees the same status and call time with their tracking code.',
    steps: [
      ['Filter', 'By status, channel (website or Telegram), or search by name, number and tracking code.'],
      ['Assign an owner', 'Assign the request to yourself or a colleague so it is clear who is following it up.'],
      ['Record the call time', 'The agreed time also appears on the applicant’s tracking page.'],
      ['Update the status', 'New, Contacted, In progress, Completed or Cancelled.'],
    ],
    tips: [
      ['Older form answers', 'If a policy’s form changed after the request was made, you are warned, and fields that no longer exist are shown separately.'],
    ],
    faqs: [
      ['What does the applicant see of the status?', 'Only the policy type, dates, status and call time — not personal details or notes.'],
      ['What does a "verified" number mean?', 'The applicant confirmed the number with a six-digit code.'],
    ],
    related: {
      insurance: 'The forms as applicants see them.',
      track: 'What the applicant sees with the tracking code.',
      'admin-messages': 'Contact form messages.',
    },
  },

  'admin-project-requests': {
    title: 'Software project requests',
    summary: 'Software development requests, and writing, previewing and sending the formal proposal to the client.',
    intro:
      'Requests from the Start a project form arrive here: the brief, goals, constraints, budget, timing, attachments and any NDA request. For each, you write a formal proposal (scope, deliverables, assumptions, exclusions, timeline, price range and validity date), preview it as a document and send it to the client. The client reads it under their tracking code and accepts it; after the validity date, the proposal expires.',
    steps: [
      ['Read the request', 'See the brief and attachments; the history of earlier requests from the same email and phone is shown too.'],
      ['Write a draft', 'Write the proposal and save it as a draft.'],
      ['Preview', 'See the document exactly as the client will see and print it.'],
      ['Send it to the client', 'Once sent, the status is Proposal sent until the client accepts or the validity date passes.'],
    ],
    tips: [
      ['Attachments are not scanned', 'Attachments are files sent by the client; open them with care.'],
    ],
    faqs: [
      ['Is the proposal a contract?', 'No. It is a proposal, and its figures hold until the validity date.'],
      ['What if the client asked for an NDA?', 'Arrange the NDA before reviewing the content.'],
    ],
    related: {
      'start-project': 'The request form as clients see it.',
      'admin-showcase': 'Adding a delivered project to the showcase.',
      track: 'Where the client reads and accepts the proposal.',
    },
  },

  'admin-resumes': {
    title: 'CVs, volunteering and internships',
    summary: 'CVs sent for jobs, and applications to the volunteering and internship programme.',
    intro:
      'Two queues side by side: CVs, for people who want a job at the company, and Volunteering and internships, for programme applications with their field, hours per week, working arrangement and skills. You read each one, open the CV file and update its status; the applicant sees that status with their tracking code.',
    steps: [
      ['Filter the queue', 'By status, or search by name, email and code.'],
      ['Open a CV', 'The details, the applicant’s note and the CV file.'],
      ['Update the status', 'The applicant sees the change on the tracking page.'],
    ],
    faqs: [
      ['Why does one person have several CVs?', 'Each person can send a CV up to twice a day on two days; go by the newest version.'],
    ],
    related: {
      join: 'The Send your CV form.',
      volunteer: 'The volunteering and internship form.',
      'admin-team': 'Adding a new colleague to the team page.',
    },
  },

  'admin-messages': {
    title: 'Contact messages',
    summary: 'Messages from the Contact us form: reading, replying and closing tickets.',
    intro:
      'Each contact form message is a ticket with a tracking code. Your reply is not emailed; the sender reads it with the code on the contact page. You mark messages read or unread, reply, and close or reopen the ticket.',
    steps: [
      ['Unread first', 'Start from new messages with the Unread only filter.'],
      ['Reply', 'Write the reply; the status becomes Answered.'],
      ['Close', 'Close the ticket when it is done; it can be reopened if needed.'],
    ],
    tips: [
      ['Write a complete reply', 'The sender gets no email and only returns to this page with the code; write a reply that stands on its own without back-and-forth.'],
    ],
    faqs: [
      ['How does the sender see the reply?', 'With the tracking code on the Contact us page.'],
      ['A project or insurance request came in here.', 'Point them to its own form; it has structured follow-up there.'],
    ],
    related: {
      contact: 'The contact form as senders see it.',
      'admin-insurance-requests': 'Insurance requests.',
    },
  },

  'admin-users': {
    title: 'Users and access',
    summary: 'User accounts, creating admin accounts, setting each admin’s access and deactivating accounts.',
    intro:
      'The Users page lists every account with its role (User, Admin, Super admin) and status. You create a new admin account yourself and set its password, then choose the sections it can reach: projects, CVs, insurance, messages, users, analytics, verification, jobs, freelance, the book market, experts, consultations, marketplace operations and the showcase. The Roles and permissions page only displays the defined permission sets.',
    steps: [
      ['Find the user', 'Search by name or email, and filter by role and status.'],
      ['Set access', 'Choose the admin’s sections and save; their open sessions are ended so the new access applies at once.'],
      ['Deactivate if needed', 'A deactivated account can no longer sign in.'],
    ],
    tips: [
      ['Least access needed', 'Give each person only the sections their work needs; an admin with no sections can sign in but sees nothing.'],
    ],
    faqs: [
      ['Can the super admin’s access be limited?', 'No; the super admin has access to every section.'],
      ['Why was an admin signed out after an access change?', 'Changing access ends open sessions so the old access stops being valid.'],
      ['How is deactivating an account different from pausing marketplace access?', 'Deactivating blocks sign-in; pausing (from the marketplace queues) stops only their marketplace activity.'],
    ],
    related: {
      'admin-verifications': 'Verifying users’ identities.',
      'admin-audit': 'Events performed by users and staff.',
      'admin-team': 'The public introduction of team members.',
    },
  },

  'admin-team': {
    title: 'Managing the team page',
    summary: 'For the super admin: adding, editing and ordering the members on the public Our team page.',
    intro:
      'The members shown on the public Our team page are managed here. Members are grouped into sections (such as engineering or design), and for each you record a name, role, photo, short bio and website link. Each member is published or hidden, and you set the display order yourself. This section is for the super admin only.',
    steps: [
      ['Create sections', 'The groups members are shown under.'],
      ['Add a member', 'Enter the name, role, photo, bio and section, and publish.'],
      ['Set the order', 'Members appear on the public page in the order you arrange here.'],
    ],
    faqs: [
      ['Is this page linked to user accounts?', 'No; it is only the public introduction and changes nobody’s access.'],
    ],
    related: {
      team: 'The public team page.',
      'admin-users': 'Accounts and access.',
    },
  },

  'admin-showcase': {
    title: 'Showcase: customers, partners and projects',
    summary: 'Managing the customers club, partners and the public Our projects page.',
    intro:
      'Three public lists are fed from here: the customers club, partners and Our projects. For each organisation you record its name, logo, industry, start year, partnership type and, where there is one, a testimonial, and keep finished relationships in a separate section. For each project you record the description, status (in progress or delivered), technology, client, links and a screenshot gallery, and arrange the display order.',
    steps: [
      ['Add an organisation or project', 'Enter the details and upload the images.'],
      ['Arrange the order', 'This list’s order is the public page’s order.'],
      ['Update the status', 'Move a delivered project or a finished relationship; do not delete it.'],
    ],
    tips: [
      ['Client permission', 'Publish a client’s name, logo and testimonial only with their permission.'],
    ],
    faqs: [
      ['Should I delete a finished relationship?', 'No; keep it in the Former section. "We built this software for them" is still true.'],
    ],
    related: {
      customers: 'The public customers club.',
      partners: 'The partners page.',
      portfolio: 'The Our projects page.',
    },
  },

  'admin-verifications': {
    title: 'Verification queue',
    summary: 'Reviewing identity documents for individuals and companies, and approving or rejecting with a note.',
    intro:
      'Identity verification requests arrive here for individuals (national ID number and card) and companies (registration details, the applicant’s role, national ID card and the company registration notice). After checking the documents you approve, or reject with a clear note; the applicant sees the note and tries again. Verification is required for most marketplace activity.',
    steps: [
      ['Open the request', 'Match the entered details against the documents.'],
      ['Decide', 'Approve, or reject with a note that says exactly what must be fixed.'],
    ],
    tips: [
      ['Make rejection notes actionable', '"The ID card picture is blurred; all four corners must be visible" works better than "Documents incomplete".'],
    ],
    faqs: [
      ['Where are documents kept?', 'They are visible only to reviewing staff and never made public.'],
      ['What happens after approval?', 'A Verified badge appears next to the user’s name and marketplace activity opens to them.'],
    ],
    related: {
      verification: 'The verification form as users see it.',
      'admin-users': 'User accounts.',
      'admin-jobs': 'Listings from verified employers.',
    },
  },

  'admin-consultations': {
    title: 'Consultations and the experts club',
    summary: 'Handling consultation requests and managing expert profiles.',
    intro:
      'Under Consultations, technical and career consultation requests arrive oldest first, with the topic, session type, requested expert and the applicant’s time windows. You call the applicant, settle the time and move the status forward: Received, Arranging a time, Time confirmed, Held, or No answer. Under Experts you maintain the club’s profiles with fields, languages, years of experience and whether they are taking consultations.',
    steps: [
      ['Call', 'Within one of the given windows, on the number the applicant gave.'],
      ['Record the time', 'The confirmed time appears on the applicant’s tracking page.'],
      ['Close the status', 'After the session, Held; if they did not answer, No answer.'],
    ],
    faqs: [
      ['Can the applicant cancel?', 'Yes, with the tracking code. The status becomes Cancelled.'],
      ['An expert is not taking consultations for now?', 'Turn off taking consultations on their profile so they cannot be chosen in the form.'],
    ],
    related: {
      consult: 'The consultation request form.',
      experts: 'The public experts page.',
    },
  },

  'admin-jobs': {
    title: 'Jobs, companies and applications',
    summary: 'Reviewing vacancies, company pages and job applications.',
    intro:
      'Every vacancy is reviewed here before it is published: approve, reject or request changes. You can feature a published listing or extend its deadline. You review company pages and hide them if they break the rules, and the applications queue is for overseeing applications sent. If a user breaks the rules, you pause their marketplace access with a stated reason.',
    steps: [
      ['Read the listing', 'Check the title, description, salary, requirements and employer.'],
      ['Decide', 'Approve, reject, or request changes with a note.'],
      ['After publication', 'Feature, unfeature or extend the deadline.'],
    ],
    tips: [
      ['Pause, do not delete', 'For a user who breaks the rules, Pause access with a reason stops their marketplace activity and can be reversed.'],
    ],
    faqs: [
      ['When is the employer told?', 'They get a notification with every approval, rejection or change request.'],
      ['What does a featured listing get?', 'It is shown more prominently in the lists and on the home page.'],
    ],
    related: {
      jobs: 'Listings as job seekers see them.',
      companies: 'Company pages.',
      'my-jobs': 'Listings as employers see them.',
      'admin-verifications': 'Verifying employers.',
    },
  },

  'admin-freelance': {
    title: 'Freelance projects, services and proposals',
    summary: 'Reviewing freelance projects, services and proposals before they go live, and handling disputes.',
    intro:
      'Three review queues: projects posted by clients, services offered by freelancers, and proposals, which are reviewed before they reach the client. You approve, reject or send each item back for changes. You also review disputes opened on engagements and close them by recording the outcome.',
    steps: [
      ['Open a queue', 'Projects, services or proposals; oldest first.'],
      ['Review', 'Content, pricing and compliance with the site’s rules.'],
      ['Decide', 'Approve, reject, or request changes with a note.'],
      ['Disputes', 'Read both sides and close the dispute with the review outcome.'],
    ],
    faqs: [
      ['Where is an official company offer placed?', 'From this projects queue, on projects whose client is open to an official company offer.'],
      ['What happens during a dispute?', 'The engagement is paused until the dispute is closed.'],
    ],
    related: {
      projects: 'Projects as freelancers see them.',
      'freelance-services': 'Services as buyers see them.',
      'client-projects': 'Projects as clients see them.',
      'my-proposals': 'Proposals and engagements as freelancers see them.',
    },
  },

  'admin-books': {
    title: 'Book market: copy queue and catalogue',
    summary: 'Reviewing copies for sale before they are published, and maintaining the reference book catalogue.',
    intro:
      'Every copy a seller lists arrives in the review queue before it is published: checking the claimed condition against the photos, the price and the book details. In the catalogue you complete each book’s reference details (title, authors, publisher, ISBN, cover price, cover and shelves), merge duplicates and mark checked books as verified.',
    steps: [
      ['Review the copy', 'The photos should match the claimed condition.'],
      ['Decide', 'Approve, reject or request changes.'],
      ['Keep the catalogue clean', 'Merge duplicate books and complete missing details.'],
    ],
    faqs: [
      ['What does a verified book mean?', 'Staff have checked its reference details; sellers see it with a verified mark when they choose a book.'],
    ],
    related: {
      books: 'The book market as buyers see it.',
      'my-books': 'Selling as sellers see it.',
    },
  },

  'admin-trademaster': {
    title: 'Local market desk',
    summary: 'Reviewing shops and products, opening shops for businesses, and managing categories and trades.',
    intro:
      'The market desk has several pages: the shop queue (approve, reject or request changes), creating a shop on behalf of a business that has not built one itself, the product queue (sending unsuitable products back for correction), the product and service categories sellers choose from, and the trades each shop belongs to.',
    steps: [
      ['Review a shop', 'The owner’s identity, trade, pictures, contact details and map location.'],
      ['Create a shop when needed', 'For a business that registered in person, create its shop from Create a shop.'],
      ['Monitor products', 'Products are published straight away; send unsuitable ones back with a note.'],
      ['Categories and trades', 'Keep the category structure tidy and add a trade when needed.'],
    ],
    faqs: [
      ['Do category changes affect existing products?', 'Yes; sellers choose from this list, so consider the products that depend on a category before removing or merging it.'],
    ],
    related: {
      marketplace: 'The market as buyers see it.',
      'my-shops': 'The shop as sellers see it.',
    },
  },

  'admin-analytics': {
    title: 'Marketplace analytics',
    summary: 'Collaborations, disputes, review queues, the listing trend, and the skills and categories in demand.',
    intro:
      'This page shows the marketplace’s health: total collaborations and completion rate, open disputes, featured listings, review queue depth and average review time, the publishing trend over the last 12 weeks, and the skills and categories most in demand.',
    points: [
      ['Review time', 'If the average review time is rising, the queues need more people.'],
      ['Open disputes', 'A rise in disputes points to a problem in how work is defined or followed up.'],
      ['Demand', 'The skills and categories in demand are a guide for blog content and the internship programme.'],
    ],
    faqs: [
      ['How fresh is the data?', 'It is worked out from current data each time you open the page.'],
    ],
    related: {
      'admin-jobs': 'The jobs queue.',
      'admin-freelance': 'The freelance queues.',
      'admin-dashboard': 'The admin dashboard.',
    },
  },

  'admin-audit': {
    title: 'Marketplace events',
    summary: 'For the super admin: a record of marketplace events and staff actions, with search and filters.',
    intro:
      'Every significant action in the marketplace — from approvals and rejections to featuring, pausing a user and closing a dispute — is recorded with its time, user and target. This page is for the super admin only, and answers "who did what, and when?".',
    steps: [
      ['Filter', 'By event type.'],
      ['Search', 'By action, target ID or user ID.'],
    ],
    faqs: [
      ['Can an event be deleted?', 'No; the record is there for accountability and cannot be edited.'],
    ],
    related: {
      'admin-users': 'Users and access.',
      'admin-dashboard': 'The admin dashboard.',
    },
  },
};

export default staff;
