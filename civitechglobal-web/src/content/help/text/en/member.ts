import type { HelpArticleText } from '../../types';

const member: Record<string, HelpArticleText> = {
  dashboard: {
    title: 'Dashboard overview',
    summary: 'Your marketplace activity and what is left to complete your account, at a glance.',
    intro:
      'The dashboard is home to everything you do on this site. On the overview, the Complete your account bar shows what remains (adding a phone number, confirming your email, verifying your identity), alongside a summary of your activity in listings, projects and collaborations and shortcuts to the sections you use most. The side menu groups every section into three: your account, the marketplace and messages.',
    steps: [
      ['Complete your account', 'Work through the Complete your account bar; identity verification is required for most marketplace activity.'],
      ['Pick a section from the side menu', 'Listings, projects, books, shops, messages and notifications each have their own page.'],
      ['Open the guide on any page', 'The Guide button in each page’s top bar, or the ? key, explains that page.'],
    ],
    tips: [
      ['Keep an eye on notifications', 'The bell at the top shows how many notifications are unread, so you do not miss a reply from a client or buyer.'],
      ['Tips come one at a time', 'Each page has a few short tips shown one after another at the top; dismiss one and you see the next on your next visit.'],
    ],
    faqs: [
      ['Why can I not see some sections in the menu?', 'Some sections appear only when that feature is switched on for the site.'],
      ['Where do I edit my account details?', 'Under Profile: name, contact details, public profile and account security.'],
      ['How do I get back to the public site?', 'The View site icon in the top bar opens the site in a new tab.'],
    ],
    related: {
      profile: 'Name, contact details, public profile and security.',
      verification: 'Required for posting listings, sending proposals and buying and selling.',
      'my-requests': 'All your tracking codes in one list.',
      notifications: 'What has happened to your listings, proposals and collaborations.',
    },
  },

  profile: {
    title: 'Profile',
    summary: 'Name, contact details, public profile and account security.',
    intro:
      'Your profile holds your account details in three parts: personal and contact details, seen only by you and staff; the public profile with your username, headline, bio and skills, shown in the freelancer directory and on your public page; and security, covering your password, two-step sign-in and signing out everywhere.',
    steps: [
      ['Complete your contact details', 'A phone number is one of the Complete your account tasks.'],
      ['Choose a username', 'Without a username you have no public page and do not appear in the freelancer directory.'],
      ['Add your skills', 'Skills are used to show how well you fit job listings and to help clients find you.'],
      ['Turn on two-step sign-in', 'Add the key to an authenticator app and keep the recovery codes somewhere safe.'],
    ],
    tips: [
      ['Save your recovery codes', 'If you lose your phone, recovery codes are the only way in while two-step sign-in is on. Each code works once.'],
      ['A short, precise headline', 'Your headline is the first thing a client sees in the directory — for example, "React developer with 3 years’ experience".'],
    ],
    faqs: [
      ['Are my contact details public?', 'No. Your email and phone number are never shown on your public profile or in the freelancer directory.'],
      ['What is two-step sign-in?', 'Once on, signing in asks for a one-time code from an authenticator app (such as Google Authenticator or Aegis) as well as your password.'],
      ['What does Sign out everywhere do?', 'It ends every active session on every device; you need your password to sign in again.'],
    ],
    related: {
      verification: 'Verifying your identity, which adds the verified badge to your public profile.',
      freelancers: 'Where your public profile is shown.',
      dashboard: 'Back to the overview.',
    },
  },

  verification: {
    title: 'Identity verification',
    summary: 'Verify yourself or your company to post listings, send proposals and buy and sell.',
    intro:
      'Verification shows there is a real person or company behind the account. It is needed to post a vacancy or apply for a job, post a project or send a proposal, offer or order a service, buy or sell books, create a company page and list a shop. You can verify as an individual (with your national ID number and a picture of your national ID card) or as a company (with its registration details, your role, and pictures of your national ID card and the company registration notice). Our specialists review the documents.',
    steps: [
      ['Choose the type', 'Individual or company.'],
      ['Enter the details', 'For an individual, the national ID number; for a company, its name, registration number, economic code, your role and website.'],
      ['Attach the documents', 'The national ID card is required; for a company, the registration notice is required too.'],
      ['Wait for review', 'The status reads Under review; once approved, a Verified badge appears next to your name.'],
    ],
    tips: [
      ['Send readable pictures', 'Most rejected requests come down to a blurred or cropped picture; every corner of the document must be visible.'],
    ],
    faqs: [
      ['Who sees my documents?', 'Only the reviewing specialists. Documents are never made public.'],
      ['My request was not approved.', 'The reviewer’s note is shown under the status; correct what it says and send it again.'],
      ['What can I do without verification?', 'View and search every listing, project, book and shop, save listings, set alerts, and use every service that does not need an account.'],
    ],
    related: {
      profile: 'Account details and public profile.',
      'my-jobs': 'Posting vacancies once verified.',
      'client-projects': 'Posting projects once verified.',
      'my-books': 'Selling books once verified.',
    },
  },

  'my-requests': {
    title: 'My requests',
    summary: 'All your tracking codes — projects, insurance, CVs and consultations — in one list with the status of each.',
    intro:
      'Every request you submit while signed in has its tracking code saved to this list automatically. You can also add codes you received earlier without signing in. For each request you see its type and current status, and one click takes you to its tracking page.',
    steps: [
      ['Add older codes', 'Enter a tracking code to add it to the list.'],
      ['See the status', 'Each request shows its type (project, insurance, CV, consultation) and status.'],
      ['Open the details', 'Each row takes you to that request’s tracking page — for example, to read and accept a project proposal.'],
    ],
    faqs: [
      ['Does removing a request from the list cancel it?', 'No. It only removes the code from your list; the request stays as it is and can still be tracked with the code.'],
      ['How is this different from My applications?', 'This lists requests made with a tracking code; My applications lists the CVs you have sent to job listings.'],
    ],
    related: {
      insurance: 'Applying for insurance.',
      'start-project': 'Submitting a project request.',
      consult: 'Requesting a consultation.',
      track: 'Tracking with a code, without signing in.',
    },
  },

  messages: {
    title: 'Messages',
    summary: 'Your conversations with clients, freelancers, applicants, and book buyers and sellers.',
    intro:
      'Every job application, project proposal and book purchase request has its own conversation thread. This page lists every thread with the other person’s name, the listing or project title and the last message; threads with unread messages are highlighted.',
    steps: [
      ['Open a thread', 'Tap any conversation to see its messages and the reply form.'],
      ['Reply', 'Keep messages short and clear; the other side is notified.'],
    ],
    tips: [
      ['Put promises in writing', 'Write the amount, delivery time and payment method in the thread, so there is a clear record if a disagreement arises.'],
    ],
    faqs: [
      ['Should I share my contact details?', 'Not unless you need to. Keep the conversation here as far as you can.'],
      ['Where do I talk to a service seller?', 'Service orders are followed under Orders.'],
      ['What if we run into a problem with the other side?', 'Under My collaborations, choose Open a dispute on that engagement so our specialists can review it.'],
    ],
    related: {
      notifications: 'Notice of new messages.',
      'my-proposals': 'Project proposals and collaborations.',
      'my-books': 'Book purchase and sale requests.',
      'my-applications': 'Job applications.',
    },
  },

  notifications: {
    title: 'Notifications',
    summary: 'What has happened to your listings, proposals, requests and collaborations.',
    intro:
      'Whenever something happens to your work, a notification appears here: a listing or project approved or sent back, a new proposal or request, a job application moving stage, a new message, a milestone delivered or approved, and an alert for a matching listing or project. The bell in the top bar shows how many are unread.',
    faqs: [
      ['Are notifications also sent by email or SMS?', 'No; notifications appear on this page and on the bell in the top bar.'],
      ['How do I get fewer notifications?', 'Pause or delete the job and project alerts you no longer need.'],
    ],
    related: {
      messages: 'Replying to messages.',
      dashboard: 'Back to the overview.',
    },
  },

  'my-jobs': {
    title: 'My postings and company page',
    summary: 'For employers: posting vacancies, reviewing applications and building your company page.',
    intro:
      'If you are hiring, you create and manage your vacancies here. Each listing is reviewed after you send it, then published. You move applications through stages — shortlist, interview, accept or decline — and keep private notes on each applicant. Your company page is your public introduction, and every vacancy you post links to it.',
    steps: [
      ['Verify your identity', 'Posting vacancies and a company page need verification.'],
      ['Build your company page', 'Name, introduction, organisation size and pictures; applicants read it before applying.'],
      ['Create a listing and send it', 'Enter the role, requirements, pay and benefits, skills, and location or remote work, and send it for review.'],
      ['Move applications forward', 'Read CVs, see how well skills match and update each application’s stage; the applicant is told.'],
    ],
    tips: [
      ['State the salary', 'Listings with a salary also appear under the minimum salary filter and get more applications.'],
      ['Reply to everyone', 'Your response rate is shown on your listings; declining is a reply too.'],
    ],
    faqs: [
      ['When will my listing be published?', 'After our specialists review it. If anything needs changing, we let you know.'],
      ['Can applicants see my notes?', 'No; notes are private.'],
      ['Why has my company page been hidden?', 'If it breaks the site’s rules, staff hide it; ask support for the reason.'],
    ],
    related: {
      jobs: 'Your listing as job seekers see it.',
      companies: 'The public list of companies.',
      verification: 'Required before posting.',
      messages: 'Talking to applicants.',
    },
  },

  'my-applications': {
    title: 'My applications, saved jobs and alerts',
    summary: 'For job seekers: the CVs you have sent, the listings you saved and your job alerts.',
    intro:
      'Three pages for finding work: My applications shows every application and its stage (seen by the employer, shortlisted, interview, accepted or declined); Saved jobs holds the listings you put aside for later; and Job alerts lists the searches you are notified about when new listings match.',
    steps: [
      ['Follow each application', 'You are notified whenever its stage changes.'],
      ['Withdraw if you need to', 'While the listing is open you can apply again after withdrawing.'],
      ['Manage your alerts', 'Pause, resume or delete each alert.'],
    ],
    faqs: [
      ['How often does an alert notify me?', 'Once for each new listing that matches it.'],
      ['Why has my application not been seen yet?', 'The employer has not opened it yet. You may prefer employers with a higher response rate.'],
    ],
    related: {
      jobs: 'Searching the listings.',
      'job-detail': 'Each listing’s page.',
      profile: 'Your skills, used to show your fit.',
      messages: 'Talking to the employer.',
    },
  },

  'client-projects': {
    title: 'My projects (client)',
    summary: 'Posting a freelance project, reviewing proposals, inviting freelancers and hiring.',
    intro:
      'As a client, you build a project in a few steps: the description, category and skills (up to 20), pricing type (fixed or hourly) and budget, duration, experience level, visibility (everyone, members or invited only), questions freelancers must answer (up to 5) and, if needed, an NDA. Once reviewed and published, proposals arrive; you compare up to three side by side and hire one. Rayan Tamaddon Jahan Gostar itself may also send an official company offer.',
    steps: [
      ['Build the project', 'Fill in the steps and review everything before sending.'],
      ['Send it for review', 'It is usually published within a few hours.'],
      ['Invite freelancers', 'Invite suitable freelancers by username to send a proposal.'],
      ['Compare and hire', 'Compare proposals and choose one with Hire; the engagement opens under My collaborations.'],
      ['Carry the work through', 'Approve each milestone’s delivery, approve hours on hourly projects, and leave a rating at the end.'],
    ],
    tips: [
      ['Ask a pointed question', 'One or two questions about similar past work separate generic proposals from serious ones.'],
      ['Close the project', 'Once you have hired someone or changed your mind, close the project so no new proposals arrive.'],
    ],
    faqs: [
      ['Does payment go through the site?', 'No. You agree the amount and method directly with the freelancer; the proposal’s milestone plan gives that a clear basis.'],
      ['What if the work does not go as agreed?', 'Under My collaborations, choose Open a dispute; the engagement is paused until our specialists review it.'],
      ['What is an official company offer?', 'A proposal sent by Rayan Tamaddon Jahan Gostar itself for your project, if you are open to one.'],
    ],
    related: {
      projects: 'Your project as freelancers see it.',
      freelancers: 'Finding and inviting freelancers.',
      verification: 'Required before posting a project.',
      messages: 'Talking to freelancers.',
    },
  },

  'my-proposals': {
    title: 'My proposals, invitations and collaborations (freelancer)',
    summary: 'For freelancers: proposals sent, invitations, saved projects, alerts and work in progress.',
    intro:
      'The freelancer side has several pages: My proposals shows each proposal’s status; Invitations lists clients who have asked you to send a proposal; Saved projects and Project alerts help you find work; and My collaborations holds work in progress, with milestones, delivery, approval and ratings.',
    steps: [
      ['Answer invitations', 'Send a proposal or decline the invitation; the client is told.'],
      ['Follow your proposals', 'You can withdraw a proposal before the client decides.'],
      ['Deliver milestones', 'Under My collaborations, deliver each milestone with a note and a file for the client to approve.'],
      ['Log your hours', 'On hourly projects, log your hours for the client to approve or query.'],
      ['Finish and rate', 'When the engagement ends, rate the other side.'],
    ],
    tips: [
      ['A complete profile gets more invitations', 'A profile with skills and work samples is invited more often.'],
    ],
    faqs: [
      ['Where are ratings shown?', 'On your public profile and in the freelancer directory.'],
      ['What if the client does not approve a delivery?', 'Clear it up in the conversation; if it is not resolved, choose Open a dispute.'],
    ],
    related: {
      projects: 'Finding projects.',
      'project-detail': 'Writing a proposal.',
      profile: 'Your public profile.',
      messages: 'Talking to the client.',
    },
  },

  'my-services': {
    title: 'My services and orders',
    summary: 'For service sellers: building a service with price packages and handling orders.',
    intro:
      'Under My services you offer ready-made work: a title, description, category, pictures and up to three packages (Basic, Standard and Premium), each with a price and delivery time. Every service is reviewed before it is published. Orders arrive under Orders, where you accept or decline them.',
    steps: [
      ['Build a service', 'Write a clear description, add pictures and set the packages.'],
      ['Send it for review', 'It is published once approved; edits to a published service show straight away.'],
      ['Handle orders', 'Accept or decline new orders.'],
    ],
    tips: [
      ['Make the packages distinct', 'The difference between packages should be clear in what is delivered, not only in the price.'],
    ],
    faqs: [
      ['How are orders paid?', 'Not through the site; once you accept an order, you arrange it with the buyer.'],
      ['Why has my service not been published?', 'It is still in the review queue, or changes were requested; its status is shown under My services.'],
    ],
    related: {
      'freelance-services': 'Your service as buyers see it.',
      profile: 'The seller’s public profile.',
      freelancers: 'An approved service also lists you in the freelancer directory.',
    },
  },

  'my-books': {
    title: 'My books for sale and purchases',
    summary: 'Selling books, editing your copies, answering purchase requests and following your own purchases.',
    intro:
      'To sell, you find the book in the catalogue and list your copy with its condition (New to Acceptable), photos, price and delivery method; it is reviewed before it is published. You accept or decline purchase requests and arrange delivery in that request’s conversation. Purchases lists the requests you have sent to buy.',
    steps: [
      ['Choose the book', 'Search the catalogue by title, ISBN or author and pick the book; if it is not there, add it as a new book.'],
      ['List your copy', 'Choose the condition honestly, add real photos and set the price and delivery method.'],
      ['Answer requests', 'Accept or decline; after accepting, arrange payment and delivery with the buyer.'],
      ['Rate after the sale', 'Buyer and seller review each other.'],
    ],
    tips: [
      ['Honest condition', 'An accurate grade and real photos prevent declined requests and poor reviews.'],
    ],
    faqs: [
      ['My book is not in the catalogue.', 'Add it as a new book with its title, author and, if it has one, ISBN; the ISBN check digit is validated and a 10-digit ISBN is converted to 13 digits.'],
      ['Does the site take the money?', 'No; payment is directly between you and the buyer.'],
    ],
    related: {
      books: 'Your copy as buyers see it.',
      messages: 'Conversations about purchase requests.',
      verification: 'Required for buying and selling.',
    },
  },

  'my-shops': {
    title: 'My shops',
    summary: 'Managing your shop in the local market and its products and services.',
    intro:
      'The shops you have created are here, each with its status: in the review queue, needing changes, or published. Once a shop is approved, you publish, edit and remove its products and services from its products page; changes show straight away.',
    steps: [
      ['Create the shop', 'Name, introduction, trade, logo, picture, contact details and location on the map.'],
      ['Send corrections', 'If the reviewer asks for changes, make them and choose Send for review again.'],
      ['Add products', 'Once approved, add products and services with prices and pictures.'],
    ],
    faqs: [
      ['Why can I not add products?', 'The shop has not been approved yet.'],
      ['Will I receive online orders?', 'Not for now; buyers reach you through the shop’s contact details.'],
    ],
    related: {
      marketplace: 'Your shop on the map.',
      'marketplace-join': 'The steps for listing a shop.',
      verification: 'Required before creating a shop.',
    },
  },
};

export default member;
