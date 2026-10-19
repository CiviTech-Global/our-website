import { describe, expect, it, vi } from 'vitest';

/**
 * The member home's unread-message figure counts every thread the inbox
 * lists.
 *
 * The inbox (messaging.service listConversations) lists job applications,
 * project bids and book purchase requests. The home's figure once counted
 * only the first two, so a buyer or seller with an unread message about a
 * book saw it in the inbox while the home said there was nothing to read.
 */

const messageCount = vi.fn(async (_args: unknown) => 0);

// Every other query answers empty: this is about the shape of one count.
const anyModel = new Proxy(
  {},
  {
    get: (_, method) =>
      async () => (method === 'count' ? 0 : method === 'findUnique' || method === 'findFirst' ? null : []),
  },
);

vi.mock('../config/database.js', () => ({
  prisma: new Proxy(
    {},
    {
      get: (_, model) =>
        model === 'marketplaceMessage' ? { count: (args: unknown) => messageCount(args) } : anyModel,
    },
  ),
}));

const { getWorkspace } = await import('./workspace.service.js');

describe('the member home', () => {
  it('counts unread messages in every kind of thread, on both sides', async () => {
    await getWorkspace('u1');

    const where = (messageCount.mock.calls[0]![0] as { where: { senderId: unknown; readAt: unknown; OR: unknown[] } })
      .where;
    expect(where.senderId).toEqual({ not: 'u1' });
    expect(where.readAt).toBeNull();
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { application: { applicantId: 'u1' } },
        { application: { job: { authorId: 'u1' } } },
        { bid: { bidderId: 'u1' } },
        { bid: { project: { authorId: 'u1' } } },
        { bookRequest: { buyerId: 'u1' } },
        { bookRequest: { sellerId: 'u1' } },
      ]),
    );
  });
});
