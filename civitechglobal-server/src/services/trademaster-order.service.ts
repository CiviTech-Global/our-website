import type { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { toPage } from '../utils/page.js';
import { generateTrackingCode } from './insurance-request.service.js';
import { PUBLIC_LISTING_WHERE } from './moderation.js';
import { notifySafely } from './notifications.service.js';
import { activeDriver, driverByName } from './payment/index.js';

/**
 * Orders.
 *
 * Checkout takes a basket and produces one order per shop, because that is what
 * an order is here: an agreement with one seller, who packs it, posts it and is
 * paid for it. See the schema note above `Order`.
 *
 * Two things in this file are worth reading before changing anything.
 *
 * STOCK IS HELD AT CHECKOUT, not at payment. A buyer who reaches the payment
 * page has the goods reserved; abandoning it releases them again when the order
 * is cancelled. The alternative — decrementing on payment — oversells, because
 * two buyers can both be at a gateway for the last item. Holding early can
 * strand stock behind abandoned orders instead, which is a smaller problem and a
 * visible one.
 *
 * THE DECREMENT IS CONDITIONAL. `updateMany` with `stock: { gte: quantity }`
 * and a check that exactly one row changed is what makes this safe under
 * concurrency: two transactions racing for the last item cannot both succeed,
 * because the second one matches no rows. Reading the stock and then writing
 * `stock - quantity` would let both through and take the column negative.
 */

/** What a buyer sends. Prices are never taken from here — see priceOf. */
export interface BasketLine {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface DeliveryInput {
  recipientName: string;
  recipientPhone: string;
  province: string;
  city: string;
  address: string
  postalCode?: string;
  buyerNote?: string;
}

/** The most of one line a single order may contain. */
const MAX_QUANTITY = 100;
/** The most distinct lines a basket may carry. */
const MAX_LINES = 50;

/**
 * Which transitions are allowed, and to whom.
 *
 * A table rather than a chain of ifs spread over five functions: the illegal
 * moves are the ones worth being unable to write, and they are only obvious
 * when the legal ones are in one place. `buyer` and `seller` are the two roles
 * that matter; staff act through the dispute tooling, not by moving an order
 * sideways.
 */
export const TRANSITIONS: Record<OrderStatus, Partial<Record<OrderStatus, Array<'buyer' | 'seller'>>>> = {
  PENDING: { AWAITING_PAYMENT: ['buyer'], CANCELLED: ['buyer', 'seller'] },
  AWAITING_PAYMENT: { PAID: [], CANCELLED: ['buyer', 'seller'] },
  // PAID has no buyer cancel: once money has moved, calling it off is a refund,
  // which is a different operation with a different effect on the books.
  PAID: { CONFIRMED: ['seller'], REFUNDED: ['seller'] },
  CONFIRMED: { SHIPPED: ['seller'], REFUNDED: ['seller'] },
  SHIPPED: { DELIVERED: ['buyer', 'seller'], REFUNDED: ['seller'] },
  DELIVERED: {},
  CANCELLED: {},
  REFUNDED: {},
};

export function assertTransition(from: OrderStatus, to: OrderStatus, actor: 'buyer' | 'seller'): void {
  const allowed = TRANSITIONS[from][to];
  if (!allowed) {
    throw new AppError('این تغییر وضعیت برای این سفارش ممکن نیست.', 409);
  }
  if (!allowed.includes(actor)) {
    throw new AppError('این کار از سوی شما ممکن نیست.', 403);
  }
}

/** Statuses whose stock is still held, and must be returned when they end. */
const HOLDS_STOCK: OrderStatus[] = ['PENDING', 'AWAITING_PAYMENT', 'PAID', 'CONFIRMED', 'SHIPPED'];

function trimmed(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

/**
 * Turn a basket into orders.
 *
 * One transaction for the whole basket: a buyer who orders from three shops
 * either gets three orders or none. Partially succeeding would leave them
 * having paid attention to a checkout that half happened, with stock held for
 * goods they were never told they had bought.
 */
export async function checkout(userId: string, lines: BasketLine[], delivery: DeliveryInput) {
  if (lines.length === 0) throw new AppError('سبد خرید خالی است.', 400);
  if (lines.length > MAX_LINES) throw new AppError('تعداد اقلام سبد خرید بیش از حد مجاز است.', 400);

  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QUANTITY) {
      throw new AppError('تعداد واردشده معتبر نیست.', 400);
    }
  }

  // Two lines for the same product and variant are merged rather than refused:
  // a basket that accumulated the same item twice is a UI detail, not an error
  // the buyer should have to fix.
  const merged = new Map<string, BasketLine>();
  for (const line of lines) {
    const key = `${line.productId}:${line.variantId ?? ''}`;
    const existing = merged.get(key);
    merged.set(
      key,
      existing ? { ...existing, quantity: existing.quantity + line.quantity } : { ...line }
    );
  }

  return prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: {
        id: { in: [...new Set([...merged.values()].map((line) => line.productId))] },
        ...PUBLIC_LISTING_WHERE,
        business: PUBLIC_LISTING_WHERE,
      },
      select: {
        id: true,
        title: true,
        price: true,
        currency: true,
        stock: true,
        businessId: true,
        business: { select: { id: true, name: true, ownerId: true } },
        variants: { select: { id: true, label: true, price: true, stock: true } },
      },
    });

    const byId = new Map(products.map((product) => [product.id, product]));

    // Group by shop before touching stock, so an order is only created once
    // every line in it is known to be available.
    const byShop = new Map<string, Array<{ line: BasketLine; product: (typeof products)[number] }>>();

    for (const line of merged.values()) {
      const product = byId.get(line.productId);
      // Covers unpublished, closed, and a shop that has been closed under it —
      // the query above filters all three, so a missing row means "not for
      // sale" rather than "does not exist", and the message says so.
      if (!product) throw new AppError('یکی از کالاهای سبد خرید دیگر در دسترس نیست.', 409);

      if (line.variantId && !product.variants.some((v) => v.id === line.variantId)) {
        throw new AppError('گزینهٔ انتخاب‌شده برای یکی از کالاها معتبر نیست.', 409);
      }
      // A product with variants must be ordered by variant: taking it without
      // one would decrement the product's own stock, which is ignored while
      // variants exist, and oversell every option at once.
      if (!line.variantId && product.variants.length > 0) {
        throw new AppError('برای یکی از کالاها باید یک گزینه انتخاب شود.', 400);
      }

      const group = byShop.get(product.businessId) ?? [];
      group.push({ line, product });
      byShop.set(product.businessId, group);
    }

    const created: Array<{ id: string; code: string; total: bigint; shopName: string }> = [];

    for (const [businessId, group] of byShop) {
      const items: Prisma.OrderItemCreateManyOrderInput[] = [];
      let subtotal = 0n;

      for (const { line, product } of group) {
        const variant = line.variantId
          ? product.variants.find((candidate) => candidate.id === line.variantId)
          : undefined;

        // The price comes from the database, never from the request. A client
        // that sends its own price is either stale or lying, and both end the
        // same way.
        const unitPrice = variant?.price ?? product.price;
        const lineTotal = unitPrice * BigInt(line.quantity);
        subtotal += lineTotal;

        await holdStock(tx, {
          productId: product.id,
          variantId: variant?.id,
          quantity: line.quantity,
        });

        items.push({
          productId: product.id,
          variantId: variant?.id,
          titleAtPurchase: product.title,
          variantAtPurchase: variant?.label,
          unitPrice,
          quantity: line.quantity,
          lineTotal,
        });
      }

      const order = await tx.order.create({
        data: {
          code: generateTrackingCode(),
          buyerId: userId,
          businessId,
          status: 'PENDING',
          subtotal,
          // Shipping is the seller's to set when they confirm — it depends on
          // where it is going and how. The total follows it.
          shipping: 0n,
          total: subtotal,
          currency: group[0].product.currency,
          recipientName: delivery.recipientName.trim(),
          recipientPhone: delivery.recipientPhone.trim(),
          province: delivery.province.trim(),
          city: delivery.city.trim(),
          address: delivery.address.trim(),
          postalCode: trimmed(delivery.postalCode),
          buyerNote: trimmed(delivery.buyerNote),
          items: { createMany: { data: items } },
        },
        select: { id: true, code: true, total: true },
      });

      created.push({ ...order, shopName: group[0].product.business.name });

      notifySafely(group[0].product.business.ownerId, {
        type: 'order.placed',
        title: 'سفارش تازه',
        body: order.code,
        link: `/dashboard/shops/orders/${order.id}`,
      });
    }

    return created;
  });
}

/**
 * Take the quantity out of stock, or fail.
 *
 * The `gte` in the where clause is the concurrency guard; see the note at the
 * top of this file. `count === 0` means somebody else got there first, which is
 * a 409 rather than a 500 — nothing is broken, the item just went.
 */
async function holdStock(
  tx: Prisma.TransactionClient,
  input: { productId: string; variantId?: string; quantity: number }
): Promise<void> {
  const { count } = input.variantId
    ? await tx.productVariant.updateMany({
        where: { id: input.variantId, stock: { gte: input.quantity } },
        data: { stock: { decrement: input.quantity } },
      })
    : await tx.product.updateMany({
        where: { id: input.productId, stock: { gte: input.quantity } },
        data: { stock: { decrement: input.quantity } },
      });

  if (count === 0) throw new AppError('موجودی یکی از کالاهای سبد خرید کافی نیست.', 409);
}

/** Put it back, for a cancellation or a refund. */
async function releaseStock(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { productId: true, variantId: true, quantity: true },
  });

  for (const item of items) {
    if (item.variantId) {
      await tx.productVariant.updateMany({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
    } else if (item.productId) {
      await tx.product.updateMany({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
    // A null productId means the seller deleted it. There is nothing to put
    // the stock back into, and the line stays on the order as a record.
  }
}

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------

/**
 * Begin paying for an order.
 *
 * Returns where to send the buyer. The order moves to AWAITING_PAYMENT, which
 * is a statement about the buyer's whereabouts rather than about money.
 */
export async function startPayment(userId: string, orderId: string, returnUrl: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, buyerId: userId },
    select: { id: true, code: true, status: true, total: true, currency: true },
  });
  if (!order) throw new AppError('این سفارش پیدا نشد.', 404);

  if (order.status !== 'PENDING' && order.status !== 'AWAITING_PAYMENT') {
    throw new AppError('این سفارش در وضعیت پرداخت نیست.', 409);
  }

  const driver = activeDriver();
  const started = await driver.start({
    orderCode: order.code,
    amount: order.total,
    currency: order.currency,
    returnUrl,
    description: order.code,
  });

  await prisma.$transaction([
    prisma.paymentIntent.create({
      data: {
        orderId: order.id,
        driver: driver.name,
        status: started.status,
        amount: order.total,
        currency: order.currency,
        reference: started.reference,
        redirectUrl: started.redirectUrl,
      },
    }),
    prisma.order.update({
      where: { id: order.id },
      data: { status: 'AWAITING_PAYMENT' },
    }),
  ]);

  return { redirectUrl: started.redirectUrl, reference: started.reference };
}

/**
 * Ask the gateway whether the money arrived, and record what it says.
 *
 * Called from the buyer's return and safe to call repeatedly: an intent that is
 * already SUCCEEDED short-circuits, so a refreshed return page cannot pay an
 * order twice or move it out of a state the seller has since advanced.
 */
export async function confirmPayment(reference: string, buyerId?: string) {
  const intent = await prisma.paymentIntent.findFirst({
    // Scoped to the buyer when one is given, which the return route always
    // does. Verifying somebody else's reference would only ever record what
    // the gateway already believes, so it is not a way to pay for a stranger's
    // order — but it is a way to learn that an order exists and what happened
    // to it, and that is nobody else's business.
    where: { reference, ...(buyerId ? { order: { buyerId } } : {}) },
    select: {
      id: true,
      driver: true,
      status: true,
      orderId: true,
      order: { select: { id: true, code: true, status: true, businessId: true, buyerId: true } },
    },
  });
  if (!intent) throw new AppError('این پرداخت پیدا نشد.', 404);

  if (intent.status === 'SUCCEEDED') {
    return { status: intent.status, orderId: intent.orderId };
  }

  const result = await driverByName(intent.driver).verify(reference);

  await prisma.paymentIntent.update({
    where: { id: intent.id },
    data: {
      status: result.status,
      failureReason: result.failureReason,
      settledAt: result.status === 'SUCCEEDED' ? new Date() : null,
    },
  });

  if (result.status === 'SUCCEEDED' && intent.order.status === 'AWAITING_PAYMENT') {
    await prisma.order.update({
      where: { id: intent.order.id },
      data: { status: 'PAID', paidAt: new Date() },
    });

    notifySafely(intent.order.buyerId, {
      type: 'order.paid',
      title: 'پرداخت انجام شد',
      body: intent.order.code,
      link: `/dashboard/orders/${intent.order.id}`,
    });
  }

  return { status: result.status, orderId: intent.orderId };
}

// ---------------------------------------------------------------------------
// The lifecycle
// ---------------------------------------------------------------------------

interface MoveInput {
  note?: string;
  shipping?: bigint;
  trackingCarrier?: string;
  trackingCode?: string;
}

/**
 * Move an order, as the buyer or the seller.
 *
 * One function rather than six, because every move shares the same three
 * questions — may this person touch this order, is this transition legal, and
 * does the stock need returning — and answering them in six places is how they
 * come to disagree.
 */
export async function moveOrder(
  userId: string,
  orderId: string,
  to: OrderStatus,
  input: MoveInput = {}
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: orderId,
        // Either side of the order, and nobody else. A seller reaches it
        // through owning the shop.
        OR: [{ buyerId: userId }, { business: { ownerId: userId } }],
      },
      select: {
        id: true,
        code: true,
        status: true,
        buyerId: true,
        subtotal: true,
        business: { select: { ownerId: true } },
      },
    });
    if (!order) throw new AppError('این سفارش پیدا نشد.', 404);

    const actor = order.buyerId === userId ? 'buyer' : 'seller';
    assertTransition(order.status, to, actor);

    const patch: Prisma.OrderUpdateInput = { status: to };

    if (to === 'CONFIRMED') {
      // Shipping is set here and nowhere else, so the total is only ever
      // written alongside the number it depends on.
      const shipping = input.shipping ?? 0n;
      if (shipping < 0n) throw new AppError('هزینهٔ ارسال نمی‌تواند منفی باشد.', 400);
      patch.shipping = shipping;
      patch.total = order.subtotal + shipping;
      patch.confirmedAt = new Date();
    }

    if (to === 'SHIPPED') {
      patch.shippedAt = new Date();
      patch.trackingCarrier = trimmed(input.trackingCarrier);
      patch.trackingCode = trimmed(input.trackingCode);
    }

    if (to === 'DELIVERED') patch.deliveredAt = new Date();

    if (to === 'CANCELLED' || to === 'REFUNDED') {
      patch.cancelledAt = new Date();
      patch.cancelReason = trimmed(input.note);
      // Only if it was still held. Cancelling something already cancelled
      // cannot happen — the transition table forbids it — but returning stock
      // twice would be silent and permanent, so the condition is explicit.
      if (HOLDS_STOCK.includes(order.status)) await releaseStock(tx, order.id);
    }

    const updated = await tx.order.update({
      where: { id: order.id },
      data: patch,
      select: { id: true, code: true, status: true, total: true, shipping: true },
    });

    // The other side hears about it, whoever moved it.
    notifySafely(actor === 'buyer' ? order.business.ownerId : order.buyerId, {
      type: 'order.moved',
      title: 'وضعیت سفارش تغییر کرد',
      body: `${order.code} — ${to}`,
      link: `/dashboard/orders/${order.id}`,
    });

    return updated;
  });
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

function orderSelect() {
  return {
    id: true,
    code: true,
    status: true,
    subtotal: true,
    shipping: true,
    total: true,
    currency: true,
    recipientName: true,
    recipientPhone: true,
    province: true,
    city: true,
    address: true,
    postalCode: true,
    buyerNote: true,
    cancelReason: true,
    trackingCarrier: true,
    trackingCode: true,
    paidAt: true,
    confirmedAt: true,
    shippedAt: true,
    deliveredAt: true,
    cancelledAt: true,
    createdAt: true,
    items: {
      select: {
        id: true,
        productId: true,
        titleAtPurchase: true,
        variantAtPurchase: true,
        unitPrice: true,
        quantity: true,
        lineTotal: true,
      },
    },
  } satisfies Prisma.OrderSelect;
}

export async function listBuyerOrders(userId: string, query: { page: number; pageSize: number }) {
  const where: Prisma.OrderWhereInput = { buyerId: userId };

  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: { ...orderSelect(), business: { select: { slug: true, name: true } } },
    }),
    prisma.order.count({ where }),
  ]);

  return toPage(rows, total, query.page, query.pageSize);
}

export async function listShopOrders(
  userId: string,
  shopId: string,
  query: { status?: OrderStatus; page: number; pageSize: number }
) {
  const shop = await prisma.business.findFirst({
    where: { id: shopId, ownerId: userId },
    select: { id: true },
  });
  if (!shop) throw new AppError('این فروشگاه پیدا نشد.', 404);

  const where: Prisma.OrderWhereInput = {
    businessId: shop.id,
    ...(query.status ? { status: query.status } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        ...orderSelect(),
        buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return toPage(rows, total, query.page, query.pageSize);
}

export async function getOrder(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, OR: [{ buyerId: userId }, { business: { ownerId: userId } }] },
    select: {
      ...orderSelect(),
      business: { select: { id: true, slug: true, name: true, phone: true, email: true } },
      buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
      payments: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          driver: true,
          status: true,
          amount: true,
          failureReason: true,
          settledAt: true,
          createdAt: true,
        },
      },
    },
  });
  if (!order) throw new AppError('این سفارش پیدا نشد.', 404);
  return order;
}
