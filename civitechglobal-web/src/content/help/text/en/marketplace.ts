import type { HelpArticleText } from '../../types';

const marketplace: Record<string, HelpArticleText> = {
  marketplace: {
    title: 'Local market',
    summary: 'Find shops, products and services near you on the map, and contact the shop directly.',
    intro:
      'The local market shows shops and businesses around you on a map: their products, services, pictures and how to contact them. For now it is a shop window, not an online store; buying, booking and arranging happen directly with the shop itself.',
    steps: [
      ['Set your point', 'Allow access to your location, or click on the map so the search centres on that point.'],
      ['Search', 'Search for a shop name, a trade, or the product or service you want; set the search radius and choose Nearest to sort.'],
      ['Open a shop or product', 'See the introduction, pictures, products and services, and the location on the map.'],
      ['Get in touch', 'To buy or book, use that shop’s own contact details.'],
    ],
    tips: [
      ['Location not available?', 'Browsers only share location over a secure connection, and you may not have allowed it; in that case choose a point on the map.'],
    ],
    faqs: [
      ['Can I buy and pay here?', 'Not yet. The basket and online payment are not switched on; contact the shop.'],
      ['Are shops checked?', 'Yes. Each shop owner has verified their identity and every shop is reviewed before it appears.'],
      ['My shop is not here.', 'Add it in four steps from the List your shop page.'],
    ],
    related: {
      'marketplace-join': 'Listing your own shop.',
      'my-shops': 'For sellers: managing your shop and products.',
    },
  },

  'marketplace-join': {
    title: 'List your shop',
    summary: 'List your shop in four steps so customers nearby can find it on the map.',
    intro:
      'Any business that offers products or services to customers nearby can list its shop. Because a shop is a business identity and buyers should know who is behind it, identity verification is required and the shop is reviewed before it appears. Once approved, you publish and edit your products and services yourself.',
    steps: [
      ['Create an account', 'Sign up, or sign in.'],
      ['Verify your identity', 'Confirm your identity in your dashboard.'],
      ['Create the shop', 'Enter the name, introduction, trade, logo, picture, contact details and location, and send it for review.'],
      ['Add products and services', 'Once the shop is approved, publish, edit and remove your products and services.'],
    ],
    tips: [
      ['Put your location on the map', 'Without a location, your shop does not show up in "near me" searches.'],
    ],
    faqs: [
      ['How long does review take?', 'It depends on the review queue. If the reviewer asks for changes, you are told in your dashboard and send it again after fixing them.'],
      ['Are products reviewed too?', 'Once the shop is approved, products are published straight away, but staff can send any product back for correction.'],
    ],
    related: {
      marketplace: 'The market as a buyer sees it.',
      'my-shops': 'Managing your shop once listed.',
      verification: 'Step two: identity verification.',
    },
  },
};

export default marketplace;
