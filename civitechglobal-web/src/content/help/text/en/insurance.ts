import type { HelpArticleText } from '../../types';

const insurance: Record<string, HelpArticleText> = {
  insurance: {
    title: 'Insurance',
    summary: 'Every kind of insurance we handle: find the one you need and apply for it online.',
    heading: 'From choosing a policy to a specialist’s call',
    intro:
      'Online insurance applications are one of our secondary services, because the financial security, safety and peace of mind of our colleagues and clients matter to us. This page lists every insurance we take requests for: from third-party and car body cover for cars and motorcycles to supplementary health, life, accident, liability, cargo, engineering all-risk and mobile phone insurance. Each has its own form, and after you apply, a specialist calls to offer the best option for your needs and budget.',
    steps: [
      ['Find the insurance', 'Browse the list or search by name. Corporate policies carry a Corporate label.'],
      ['Read its page', 'Each insurance page lists the coverages, what is not covered, the documents needed and what affects the premium.'],
      ['Fill in the form', 'Enter the policy details and your contact details, and confirm your mobile number with a six-digit code.'],
      ['Keep the tracking code', 'After applying, keep the tracking code; use it to see the request’s status and the agreed callback time.'],
    ],
    points: [
      ['Apply online', 'For policies labelled Apply online, you give everything needed in the form.'],
      ['Priced by a specialist', 'Policies labelled Priced by a specialist are priced over the phone; you give the basics and the specialist calls you.'],
      ['No prices on the site', 'The premium depends on your details; the specialist gives you the options and the price after review.'],
    ],
    faqs: [
      ['Can I buy and pay for the insurance here?', 'No. Here you submit the request; our specialist calls you, goes through the options and arranges issuing the policy.'],
      ['Why can I not see a price on the site?', 'The premium depends on things like the vehicle, your history and the coverages you choose. Those factors are listed on each policy’s page, and the specialist gives the exact price.'],
      ['Why do I have to confirm my number?', 'The number is how the specialist reaches you; confirming it prevents typos.'],
      ['Do I need an account to apply for insurance?', 'No. But if you are signed in, the tracking code is saved under My requests.'],
      ['The insurance I want is not on the list.', 'Ask from the Contact us page; we will suggest the closest option.'],
    ],
    related: {
      'insurance-product': 'Each policy’s own page and form.',
      track: 'Follow an insurance request with its code.',
      'my-requests': 'For members: every request in one list.',
      blog: 'Guides to insurance prices and buying tips.',
    },
  },

  'insurance-product': {
    title: 'An insurance policy’s page and form',
    summary: 'One policy in detail, with its own form: coverages, exclusions, documents, price factors and applying.',
    intro:
      'Every policy has its own page. At a glance gives the summary; then come the coverages and optional coverages, what is not covered, the documents needed, what affects the premium, and what to do if you need to claim. The application form is on the same page, and its fields are specific to that policy.',
    steps: [
      ['Policy details', 'Fill in the fields specific to this policy; they are needed for an accurate price.'],
      ['Contact details', 'Enter your name and how to reach you; we call to arrange and send the policy.'],
      ['Confirm your number', 'Confirm your mobile number with the six-digit code; the request cannot be submitted without it.'],
      ['Submit and keep the code', 'Submit the request and keep the tracking code.'],
    ],
    tips: [
      ['Read the exclusions before applying', 'The Not covered list matters as much as the coverages, and saves disappointment when you claim.'],
      ['Have the documents ready', 'Prepare the required documents before the specialist calls, so the policy is issued faster.'],
    ],
    faqs: [
      ['What happens after I apply?', 'A specialist calls you as soon as possible to go through the options, and the agreed call time appears on the tracking page.'],
      ['What does "Priced by a specialist" mean?', 'This policy is priced by a specialist; you give the basics so they can call you well informed.'],
      ['I did not receive the confirmation code.', 'Wait a moment and press Resend, or check the number and correct it with Change number.'],
      ['Where are my details shown?', 'The tracking page shows only the request’s status, not your personal details.'],
    ],
    related: {
      insurance: 'Back to the list of all insurance.',
      track: 'Follow the request with its code.',
      'my-requests': 'For members: your codes in one list.',
    },
  },
};

export default insurance;
