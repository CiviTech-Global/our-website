import type { HelpArticleText } from '../../types';

const jobs: Record<string, HelpArticleText> = {
  jobs: {
    title: 'Jobs',
    summary: 'Vacancies from verified employers across Iran and remote, with search, filters and alerts.',
    intro:
      'This section lists job vacancies, from Rayan Tamaddon Jahan Gostar and from other companies. Only employers whose identity our team has verified can post, and every listing is reviewed before it is published. Everything is free for job seekers: searching, saving listings, alerts and applying.',
    steps: [
      ['Search and filter', 'Search by job title, skill or company, and filter by category, province, country, remote or minimum salary.'],
      ['Open a listing', 'Each listing shows the requirements, pay and benefits, skills and information about the company.'],
      ['Save it or set an alert', 'Save interesting listings; press Get alerts for this search to hear about new ones.'],
      ['Apply', 'Sign in and complete identity verification to send your CV; the application goes straight to the employer.'],
    ],
    points: [
      ['Verified employers', 'Every employer’s identity has been checked, and every listing is read before it goes live.'],
      ['Province and category pages', 'The vacancies for a province, a country or a category each have their own address you can bookmark.'],
      ['International remote work', 'Remote roles open to applicants from every country, or from one particular country.'],
      ['Suggestions from your activity', 'Once signed in, you see listings that fit what you have applied for or saved.'],
    ],
    tips: [
      ['Set an alert', 'Instead of checking every day, save your search with Get alerts for this search; each matching new listing notifies you once.'],
    ],
    faqs: [
      ['Does applying cost anything?', 'No. Searching, saving listings, alerts and applying are free for job seekers.'],
      ['Who can post here?', 'Only employers whose identity our team has verified, and every listing is reviewed before publication.'],
      ['How do I post a vacancy?', 'Sign in, complete identity verification, and create a listing under My postings in your dashboard, then send it for review.'],
      ['Why do I need to verify my identity to apply?', 'So the employer knows they are dealing with a real person — the same reason employers are verified.'],
      ['How is this different from Send your CV?', 'Send your CV is for working with Rayan Tamaddon Jahan Gostar itself; this section is for specific vacancies, from us or from other companies.'],
    ],
    related: {
      'job-detail': 'Each listing’s page and the application form.',
      companies: 'The companies that are hiring.',
      'my-applications': 'For job seekers: applications, saved jobs and alerts.',
      'my-jobs': 'For employers: posting and managing vacancies.',
    },
  },

  'job-detail': {
    title: 'A job listing',
    summary: 'The details of one vacancy, how well you match it, and the application form.',
    intro:
      'Each listing shows the role description, requirements, pay and benefits, the skills needed and information about the company. If you have added your skills to your profile, it also shows how many of the required skills you have. Your application goes straight to the employer, and we let you know at every stage.',
    steps: [
      ['Read the listing', 'Check the requirements, pay and type of work; if the employer usually replies, their response rate is shown too.'],
      ['See your fit', 'The "How well do you fit?" section shows the skills you have and those worth learning.'],
      ['Sign in and verify', 'The application form opens once you are signed in and your identity is verified.'],
      ['Send your CV', 'Send the application and follow its status under My applications.'],
    ],
    tips: [
      ['Add your skills to your profile', 'Without skills on your profile, your fit with a listing cannot be worked out.'],
    ],
    faqs: [
      ['How do I know the employer has seen my CV?', 'When the employer opens your application its status becomes Seen by the employer, and we let you know whenever the stage changes.'],
      ['Can I withdraw my application?', 'Yes, from My applications. While the listing is open you can apply again.'],
      ['Can I apply twice to the same listing?', 'No; if you have already applied, the date is shown on the listing.'],
      ['I cannot see the salary.', 'Some employers do not state it; the listing then says Negotiable.'],
    ],
    related: {
      jobs: 'Back to all listings.',
      companies: 'The page of the company behind the listing.',
      'my-applications': 'Follow the applications you have sent.',
      verification: 'Identity verification, which you need before applying.',
    },
  },

  companies: {
    title: 'Companies',
    summary: 'Verified employers, each company’s page and its open vacancies.',
    intro:
      'Every verified employer can have a company page: an introduction, the size of the organisation, images and all its open vacancies. Here you search companies and go from each company’s page to its listings.',
    steps: [
      ['Find the company', 'Search by name or browse by organisation size.'],
      ['Read the page', 'See the company’s introduction and its open vacancies.'],
      ['Are you an employer?', 'Once verified, create your company page from your dashboard; every vacancy you post links to it.'],
    ],
    faqs: [
      ['How do I create a company page?', 'Go to Company page in your dashboard. Your identity must be verified first.'],
      ['Why has a company page been hidden?', 'If a page breaks the site’s rules, our staff hide it; the owner can ask support for the reason.'],
    ],
    related: {
      jobs: 'Every vacancy.',
      'my-jobs': 'For employers: listings and the company page.',
    },
  },
};

export default jobs;
