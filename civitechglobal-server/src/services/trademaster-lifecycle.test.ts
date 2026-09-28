import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A listing's life after it is written: sent, withdrawn, corrected, closed,
 * reopened.
 *
 * Two things are pinned here. Closing a shop must not touch its products —
 * every public query filters on the shop as well, so the cascade bought no
 * privacy and destroyed the only record of which products the seller had taken
 * down by hand. And neither reopen may touch the moderation status, because
 * that is the review desk's half of the decision and a seller must not be able
 * to publish something by closing and reopening it.
 */

const mocks = vi.hoisted(() => ({
  prisma: {
    business: {
      findFirst: vi.fn(),
      update: vi.fn(async () => ({ id: 's1', code: 'SH1', state: 'OPEN' })),
    },
    product: {
      findFirst: vi.fn(),
      update: vi.fn(async () => ({ id: 'p1', code: 'PR1', state: 'OPEN' })),
      updateMany: vi.fn(),
    },
    productVariant: {
      findFirst: vi.fn(),
      update: vi.fn(async () => ({ id: 'v1', label: 'L', sku: null, price: null, stock: 0 })),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../config/database.js', () => ({ prisma: mocks.prisma }));

const { closeShop, reopenShop, withdrawShop } = await import('./trademaster-shop.service.js');
const { closeProduct, reopenProduct, updateVariant, withdrawProduct } = await import(
  './trademaster-product.service.js'
);

const SHOP = { id: 's1', code: 'SH1', slug: 'shop', moderationStatus: 'APPROVED', state: 'OPEN' };
const PRODUCT = {
  id: 'p1',
  code: 'PR1',
  businessId: 's1',
  moderationStatus: 'APPROVED',
  state: 'OPEN',
  business: { moderationStatus: 'APPROVED', state: 'OPEN' },
  _count: { images: 1, variants: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('closing a shop', () => {
  it('leaves its products alone', async () => {
    mocks.prisma.business.findFirst.mockResolvedValue(SHOP);

    await closeShop('u1', 's1');

    // The shop's own state is the whole change. A cascade here would close
    // products the seller never closed, and reopening could not tell them
    // apart from the ones they did.
    expect(mocks.prisma.business.update.mock.calls[0][0].data).toEqual({ state: 'CLOSED' });
    expect(mocks.prisma.product.updateMany).not.toHaveBeenCalled();
  });

  it('is a 404 for a shop somebody else owns', async () => {
    mocks.prisma.business.findFirst.mockResolvedValue(null);

    await expect(closeShop('u1', 's1')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('reopening a shop', () => {
  it('restores the state and nothing else', async () => {
    mocks.prisma.business.findFirst.mockResolvedValue({ ...SHOP, state: 'CLOSED' });

    await reopenShop('u1', 's1');

    // Not `toMatchObject`: the assertion is that moderationStatus is absent,
    // so a seller cannot publish an unapproved shop by closing and reopening.
    expect(mocks.prisma.business.update.mock.calls[0][0].data).toEqual({ state: 'OPEN' });
  });

  it('refuses a shop that is not closed', async () => {
    mocks.prisma.business.findFirst.mockResolvedValue({ ...SHOP, state: 'EXPIRED' });

    await expect(reopenShop('u1', 's1')).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.prisma.business.update).not.toHaveBeenCalled();
  });

  it('is a 404 for a shop somebody else owns', async () => {
    mocks.prisma.business.findFirst.mockResolvedValue(null);

    await expect(reopenShop('u1', 's1')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('closing and reopening a product', () => {
  it('closes it', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue(PRODUCT);

    await closeProduct('u1', 'p1');

    expect(mocks.prisma.product.update.mock.calls[0][0].data).toEqual({ state: 'CLOSED' });
  });

  it('reopens it without touching its moderation status', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue({ ...PRODUCT, state: 'CLOSED' });

    await reopenProduct('u1', 'p1');

    expect(mocks.prisma.product.update.mock.calls[0][0].data).toEqual({ state: 'OPEN' });
  });

  it('refuses a product that is not closed, so a stray click cannot revive an expired one', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue({ ...PRODUCT, state: 'EXPIRED' });

    await expect(reopenProduct('u1', 'p1')).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.prisma.product.update).not.toHaveBeenCalled();
  });

  it('is a 404 for a product somebody else owns', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue(null);

    await expect(reopenProduct('u1', 'p1')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('pulling a listing back to a draft', () => {
  it('unpublishes an approved product so it can be edited', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue(PRODUCT);

    await withdrawProduct('u1', 'p1');

    // The reviewer's note goes with it: it was about the version being
    // replaced, and leaving it would have the seller answering old feedback.
    expect(mocks.prisma.product.update.mock.calls[0][0].data).toEqual({
      moderationStatus: 'DRAFT',
      reviewNote: null,
    });
  });

  it('leaves publishedAt alone, because it records that this was once public', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue(PRODUCT);

    await withdrawProduct('u1', 'p1');

    expect(mocks.prisma.product.update.mock.calls[0][0].data).not.toHaveProperty('publishedAt');
  });

  it('accepts one still waiting in the queue', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue({ ...PRODUCT, moderationStatus: 'PENDING_REVIEW' });

    await expect(withdrawProduct('u1', 'p1')).resolves.toBeDefined();
  });

  it('refuses a rejected one, which would otherwise loop back into the queue unchanged', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue({ ...PRODUCT, moderationStatus: 'REJECTED' });

    await expect(withdrawProduct('u1', 'p1')).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.prisma.product.update).not.toHaveBeenCalled();
  });

  it('refuses one that is already a draft', async () => {
    mocks.prisma.product.findFirst.mockResolvedValue({ ...PRODUCT, moderationStatus: 'DRAFT' });

    await expect(withdrawProduct('u1', 'p1')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('does the same for a shop, and leaves its products alone', async () => {
    mocks.prisma.business.findFirst.mockResolvedValue(SHOP);

    await withdrawShop('u1', 's1');

    expect(mocks.prisma.business.update.mock.calls[0][0].data).toEqual({
      moderationStatus: 'DRAFT',
      reviewNote: null,
    });
    // They are unreachable while the shop is a draft anyway, and sending them
    // all back to the queue would put a pile on the desk every time a seller
    // fixed a spelling mistake in their own address.
    expect(mocks.prisma.product.updateMany).not.toHaveBeenCalled();
  });
});

describe('correcting one option of a product', () => {
  const VARIANT = { id: 'v1', product: { moderationStatus: 'DRAFT' } };

  it('changing the label does not clear the price', async () => {
    mocks.prisma.productVariant.findFirst.mockResolvedValue(VARIANT);

    await updateVariant('u1', 'v1', { label: 'Large' });

    // The bug this guards: price absent meaning "leave it" is only correct if
    // the key is absent from the update too.
    expect(mocks.prisma.productVariant.update.mock.calls[0][0].data).toEqual({ label: 'Large' });
  });

  it('an explicit null removes the price override', async () => {
    mocks.prisma.productVariant.findFirst.mockResolvedValue(VARIANT);

    await updateVariant('u1', 'v1', { price: null });

    // Without this there was no way back from a price once set: the form
    // could raise it and never undo it.
    expect(mocks.prisma.productVariant.update.mock.calls[0][0].data).toEqual({ price: null });
  });

  it('is refused once the product has gone to the desk', async () => {
    mocks.prisma.productVariant.findFirst.mockResolvedValue({
      id: 'v1',
      product: { moderationStatus: 'APPROVED' },
    });

    await expect(updateVariant('u1', 'v1', { label: 'Large' })).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});
