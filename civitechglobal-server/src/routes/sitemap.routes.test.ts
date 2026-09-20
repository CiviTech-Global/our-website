import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

/**
 * The dynamic sitemap against a database we control: every listing that
 * should appear appears, everything that should not (unpublished, inactive,
 * closed) stays out, and the XML carries its own content type.
 */

const findMany = vi.fn();

vi.mock('../config/database.js', () => ({
  prisma: {
    insuranceProduct: { findMany: (...args: unknown[]) => findMany(...args) },
    jobPost: { findMany: (...args: unknown[]) => findMany(...args) },
    freelanceProject: { findMany: (...args: unknown[]) => findMany(...args) },
    bookListing: { findMany: (...args: unknown[]) => findMany(...args) },
  },
}));

// The route table is what wires the mocked prisma in; import after the mock.
const { createApp } = await import('../app.js');

const app = createApp();

describe('GET /api/sitemap/extras.xml', () => {
  it('lists active products and open published listings only', async () => {
    findMany
      .mockResolvedValueOnce([{ slug: 'third-party-auto', updatedAt: new Date('2026-08-06') }])
      .mockResolvedValueOnce([{ code: 'JOB-1', updatedAt: new Date('2026-08-01') }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ code: 'BOOK-9', updatedAt: new Date('2026-07-20') }]);

    const response = await request(app).get('/api/sitemap/extras.xml');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/xml');
    expect(response.text).toContain('<loc>https://rayantamaddonjahangostar.ir/insurance/third-party-auto</loc>');
    expect(response.text).toContain('<loc>https://rayantamaddonjahangostar.ir/jobs/JOB-1</loc>');
    expect(response.text).toContain('<loc>https://rayantamaddonjahangostar.ir/books/BOOK-9</loc>');
    // fa-IR self-reference and x-default on every URL.
    expect(response.text).toContain('hreflang="fa-IR"');
    expect(response.text).toContain('hreflang="x-default"');
    // CLOSED listings never reach the route: the query itself filters them;
    // here we assert nothing the query excluded leaks in via shaping.
    expect(response.text).not.toContain('undefined');
  });

  it('serves an empty-but-valid urlset when nothing is open', async () => {
    findMany.mockResolvedValue([]);

    const response = await request(app).get('/api/sitemap/extras.xml');

    expect(response.status).toBe(200);
    expect(response.text).toContain('<urlset');
    expect(response.text.match(/<url>/g) ?? []).toHaveLength(0);
  });
});

describe('what counts as visible', () => {
  it('asks the database for the same rows the public pages show', async () => {
    // The mock is shared with the cases above; only this run's calls count.
    findMany.mockClear();
    findMany.mockResolvedValue([]);

    await request(app).get('/api/sitemap/extras.xml').expect(200);

    // Three listing queries, each filtered the way the public detail routes
    // filter. "OPEN with a published date" is not enough on its own: a listing
    // pulled after publication keeps both and would be advertised here while
    // its own page answers 404.
    const listingQueries = findMany.mock.calls
      .map(([args]) => (args as { where: Record<string, unknown> }).where)
      .filter((where) => 'state' in where);

    expect(listingQueries).toHaveLength(3);
    for (const where of listingQueries) {
      expect(where).toMatchObject({
        moderationStatus: 'APPROVED',
        state: 'OPEN',
        publishedAt: { not: null },
      });
    }
  });
});
