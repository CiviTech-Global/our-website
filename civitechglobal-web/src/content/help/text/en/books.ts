import type { HelpArticleText } from '../../types';

const books: Record<string, HelpArticleText> = {
  books: {
    title: 'Book market',
    summary: 'New and second-hand books from readers and bookshops: every copy of a book on one page.',
    intro:
      'In the book market each book has one page, and every copy offered for sale appears together on it, cheapest first. Each copy belongs to a seller, and you see its condition (from New to Acceptable), photos, price, shipping cost and delivery method. Buying starts with a request to buy; no payment goes through the site, and buyer and seller arrange payment and delivery directly.',
    steps: [
      ['Find the book', 'Search or browse the shelves; filter by condition, price, free shipping or below the cover price.'],
      ['Choose a copy', 'On the book’s page, compare copies by condition, photos, price and delivery method.'],
      ['Send a request to buy', 'Choose how to receive it and, if you like, offer a price; you need to be signed in and verified.'],
      ['Arrange delivery', 'When the seller accepts, arrange payment and delivery in that request’s conversation.'],
    ],
    points: [
      ['Graded condition', 'Each copy has one of five grades — New, Like new, Very good, Good or Acceptable — with photos.'],
      ['Selling books', 'List your copy with photos, condition and price from your dashboard; it is reviewed before it is published.'],
      ['Two-way reviews', 'After a sale, buyer and seller review each other.'],
    ],
    tips: [
      ['Offering a price', 'If a copy’s price is negotiable you can offer your own; leave it empty to accept the seller’s price.'],
    ],
    faqs: [
      ['Do I pay the site?', 'No. No payment goes through the site; once your request is accepted, you arrange payment and delivery directly with the seller.'],
      ['Why do I need to verify my identity to buy?', 'So the seller knows they are dealing with a real person; the same rule applies to sellers.'],
      ['How do I sell a book?', 'Under My books for sale in your dashboard, list your copy with its ISBN, photos, condition and price, and send it for review.'],
      ['The seller declined my request.', 'You can request another copy of the same book from a different seller.'],
    ],
    related: {
      'my-books': 'Selling books and following purchases from your dashboard.',
      messages: 'Talking to the buyer or seller.',
      verification: 'Required for buying and selling.',
    },
  },
};

export default books;
