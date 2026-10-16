import type { HelpLibraryText } from '../../types';
import company from './company';
import insurance from './insurance';
import consult from './consult';
import jobs from './jobs';
import freelance from './freelance';
import books from './books';
import marketplace from './marketplace';
import account from './account';
import member from './member';
import staff from './staff';

const en: HelpLibraryText = {
  collections: {
    company: { title: 'The company and software services', description: 'Meet Rayan Tamaddon Jahan Gostar: software development services, project requests, contacting us and working with us.' },
    insurance: { title: 'Insurance', description: 'Online insurance applications, a form for each product, and tracking with a code.' },
    consult: { title: 'Consulting and experts', description: 'Request technical or career consulting, and meet the experts club.' },
    jobs: { title: 'Jobs', description: 'Find and apply for jobs, browse company pages, and post a vacancy.' },
    freelance: { title: 'Freelance projects', description: 'Post a project, send proposals, ready-made services and the freelancer directory.' },
    books: { title: 'Book market', description: 'Buy and sell new and second-hand books between members.' },
    marketplace: { title: 'Local market', description: 'Local shops and products on the map, and listing your shop.' },
    account: { title: 'Your account', description: 'Signing up, signing in, resetting your password and confirming your email.' },
    member: { title: 'Member dashboard', description: 'Your dashboard: profile, verification, requests, messages and your marketplace activity.' },
    staff: { title: 'Admin panel', description: 'Staff guides to reviewing requests, approval queues and running the site.' },
  },
  articles: {
    ...company,
    ...insurance,
    ...consult,
    ...jobs,
    ...freelance,
    ...books,
    ...marketplace,
    ...account,
    ...member,
    ...staff,
  },
};

export default en;
