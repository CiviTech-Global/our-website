import { describe, expect, it } from 'vitest';
import { proposalBucket, WORK_CATEGORIES } from '../catalog/work-taxonomy.js';
import { excerpt, freelancerLevel } from './project-cards.service.js';
import { projectAlertMatches } from './project-work.service.js';
import { weekStartOf } from './engagement.service.js';
import { bidSchema, projectBoardSchema, projectSchema } from '../validators/marketplace.schema.js';
import { orderSchema, serviceSchema, timesheetSchema } from '../validators/work.schema.js';

describe('the work taxonomy', () => {
  it('has unique, permanent ASCII slugs', () => {
    const slugs = WORK_CATEGORIES.flatMap((node) => [node.slug, ...(node.children ?? []).map((child) => child.slug)]);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^w-[a-z0-9-]+$/);
  });

  it('names every category in both languages', () => {
    for (const node of WORK_CATEGORIES) {
      for (const entry of [node, ...(node.children ?? [])]) {
        expect(entry.name.trim()).not.toBe('');
        expect(entry.nameEn.trim()).not.toBe('');
      }
    }
  });
});

describe('proposalBucket', () => {
  it('shows a range, the way Upwork does', () => {
    expect(proposalBucket(0)).toBe('LT5');
    expect(proposalBucket(4)).toBe('LT5');
    expect(proposalBucket(5)).toBe('5_10');
    expect(proposalBucket(10)).toBe('5_10');
    expect(proposalBucket(11)).toBe('10_15');
    expect(proposalBucket(49)).toBe('20_50');
    expect(proposalBucket(500)).toBe('50_PLUS');
  });
});

describe('freelancerLevel', () => {
  it('starts everybody as new', () => {
    expect(freelancerLevel({ completed: 0, jobSuccess: null, ratingAvg: 0, ratingCount: 0 })).toBe('NEW');
  });

  it('is earned by finished, well-rated work', () => {
    expect(freelancerLevel({ completed: 1, jobSuccess: 100, ratingAvg: 4.8, ratingCount: 1 })).toBe('RISING');
    expect(freelancerLevel({ completed: 6, jobSuccess: 85, ratingAvg: 4.5, ratingCount: 6 })).toBe('ESTABLISHED');
    expect(freelancerLevel({ completed: 12, jobSuccess: 95, ratingAvg: 4.9, ratingCount: 12 })).toBe('TOP_RATED');
  });

  it('falls when the record does', () => {
    expect(freelancerLevel({ completed: 12, jobSuccess: 70, ratingAvg: 4.9, ratingCount: 12 })).toBe('RISING');
  });
});

describe('excerpt', () => {
  it('leaves a short brief alone', () => {
    expect(excerpt('Build a  small\nsite')).toBe('Build a small site');
  });

  it('cuts a long one at a word', () => {
    const text = 'word '.repeat(200);
    const cut = excerpt(text, 40);
    expect(cut.endsWith('…')).toBe(true);
    expect(cut.length).toBeLessThanOrEqual(41);
    expect(cut).not.toMatch(/wor…$/);
  });
});

describe('projectAlertMatches', () => {
  const project = {
    title: 'Shopify store for a fashion brand',
    description: 'Theme customisation and product import.',
    skills: ['Shopify', 'Liquid'],
    workCategoryId: 'child',
    categoryParentId: 'parent',
    pricingType: 'FIXED',
    experienceLevel: 'INTERMEDIATE',
    budgetMin: 20_000_000n,
    budgetMax: 40_000_000n,
    budgetUnknown: false,
    currency: 'IRT',
    preferredCountries: [],
    languages: ['fa'],
  };

  it('matches a group by its children, as the board does', () => {
    expect(projectAlertMatches({ workCategoryId: 'parent' }, project)).toBe(true);
    expect(projectAlertMatches({ workCategoryId: 'other' }, project)).toBe(false);
  });

  it('matches keywords against title, brief and skills', () => {
    expect(projectAlertMatches({ search: 'liquid' }, project)).toBe(true);
    expect(projectAlertMatches({ search: 'wordpress' }, project)).toBe(false);
  });

  it('reads an empty country list as open to anywhere', () => {
    expect(projectAlertMatches({ country: 'DE' }, project)).toBe(true);
    expect(projectAlertMatches({ country: 'DE' }, { ...project, preferredCountries: ['IR'] })).toBe(false);
  });

  it('compares a budget floor in toman only', () => {
    expect(projectAlertMatches({ budgetMin: '30000000' }, project)).toBe(true);
    expect(projectAlertMatches({ budgetMin: '50000000' }, project)).toBe(false);
    expect(projectAlertMatches({ budgetMin: '1' }, { ...project, currency: 'EUR' })).toBe(false);
  });

  it('matches any one of the skills asked for', () => {
    expect(projectAlertMatches({ skills: ['react', 'shopify'] }, project)).toBe(true);
    expect(projectAlertMatches({ skills: ['react'] }, project)).toBe(false);
  });
});

describe('weekStartOf', () => {
  it('keys every day of a week by its Saturday', () => {
    // 2026-10-03 is a Saturday.
    for (const day of ['2026-10-03', '2026-10-05', '2026-10-09']) {
      expect(weekStartOf(new Date(`${day}T15:00:00Z`)).toISOString().slice(0, 10)).toBe('2026-10-03');
    }
    expect(weekStartOf(new Date('2026-10-10T00:30:00Z')).toISOString().slice(0, 10)).toBe('2026-10-10');
  });
});

describe('the project form', () => {
  const base = { title: 'A shop on Shopify', description: 'x'.repeat(60) };

  it('defaults to a sealed, public, fixed-price project', () => {
    const parsed = projectSchema.parse(base);
    expect(parsed).toMatchObject({ pricingType: 'FIXED', sealed: true, visibility: 'PUBLIC', freelancersNeeded: 1 });
  });

  it('refuses weekly hours on fixed-price work, and a backwards budget', () => {
    expect(projectSchema.safeParse({ ...base, weeklyHours: 'LESS_THAN_10' }).success).toBe(false);
    expect(projectSchema.safeParse({ ...base, budgetMin: '20', budgetMax: '10' }).success).toBe(false);
    expect(projectSchema.safeParse({ ...base, pricingType: 'HOURLY', weeklyHours: 'LESS_THAN_10' }).success).toBe(true);
  });

  it('allows at most five screening questions', () => {
    const questions = Array.from({ length: 6 }, (_, i) => `Question number ${i}?`);
    expect(projectSchema.safeParse({ ...base, screeningQuestions: questions }).success).toBe(false);
  });

  it('accepts the new board filters and drops nothing it knows', () => {
    const parsed = projectBoardSchema.parse({ pricingType: 'HOURLY', maxBids: '5', clientVerified: 'true', sort: 'fewestBids' });
    expect(parsed).toMatchObject({ pricingType: 'HOURLY', maxBids: 5, clientVerified: true, sort: 'fewestBids' });
  });
});

describe('the bid form', () => {
  it('takes a proposed plan in Persian digits', () => {
    const parsed = bidSchema.parse({
      amount: '۳۰۰',
      message: 'I have done this exact thing many times before.',
      milestones: [{ title: 'Design', amount: '۱۰۰', days: 3 }],
    });
    expect(parsed.amount).toBe(300n);
    expect(parsed.milestones?.[0].amount).toBe('100');
  });
});

describe('the service form', () => {
  const pkg = { tier: 'BASIC', name: 'Basic', description: 'One concept, two revisions.', price: '1000', deliveryDays: 3, revisions: 2 };
  const base = { title: 'I will design a modern logo for your brand', description: 'x'.repeat(150), packages: [pkg] };

  it('accepts a single basic package', () => {
    expect(serviceSchema.safeParse(base).success).toBe(true);
  });

  it('allows unlimited revisions, and not less', () => {
    expect(serviceSchema.safeParse({ ...base, packages: [{ ...pkg, revisions: -1 }] }).success).toBe(true);
    expect(serviceSchema.safeParse({ ...base, packages: [{ ...pkg, revisions: -2 }] }).success).toBe(false);
  });

  it('needs a real title', () => {
    expect(serviceSchema.safeParse({ ...base, title: 'Logo' }).success).toBe(false);
  });
});

describe('orders and timesheets', () => {
  it('defaults an order to no extras', () => {
    expect(orderSchema.parse({ tier: 'STANDARD' })).toMatchObject({ extraIds: [], requirementAnswers: [] });
  });

  it('refuses more minutes than a week holds', () => {
    expect(timesheetSchema.safeParse({ weekStart: '2026-10-03', minutes: 10_081, memo: 'Too many hours.' }).success).toBe(false);
    expect(timesheetSchema.safeParse({ weekStart: '2026-10-03', minutes: 600, memo: 'Built the checkout.' }).success).toBe(true);
  });
});
