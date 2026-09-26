import { describe, expect, it } from 'vitest';
import type { OrderStatus } from '@prisma/client';
import { TRANSITIONS, assertTransition } from './trademaster-order.service.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * The order lifecycle, as a table.
 *
 * These tests are about what is *impossible*, which is the part of an order
 * system worth defending: a seller must not be able to mark something delivered
 * that was never shipped, a buyer must not be able to cancel after paying, and
 * a terminal order must not move at all. Each of those is one line in
 * TRANSITIONS, and each would be invisible in an integration test that only
 * walked the happy path.
 */

const ALL: OrderStatus[] = [
  'PENDING',
  'AWAITING_PAYMENT',
  'PAID',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];

function allows(from: OrderStatus, to: OrderStatus, actor: 'buyer' | 'seller'): boolean {
  try {
    assertTransition(from, to, actor);
    return true;
  } catch (error) {
    if (error instanceof AppError) return false;
    throw error;
  }
}

describe('the order transition table', () => {
  it('covers every status, so a new one cannot be forgotten', () => {
    // Record<OrderStatus, …> already forces this at compile time. Asserted
    // again here because a future `as` or a partial type would quietly remove
    // that guarantee, and the failure would be an order stuck forever.
    expect(Object.keys(TRANSITIONS).sort()).toEqual([...ALL].sort());
  });

  it('lets nobody move a terminal order anywhere', () => {
    for (const terminal of ['DELIVERED', 'CANCELLED', 'REFUNDED'] as OrderStatus[]) {
      expect(TRANSITIONS[terminal]).toEqual({});
      for (const to of ALL) {
        expect(allows(terminal, to, 'buyer'), `${terminal} -> ${to} as buyer`).toBe(false);
        expect(allows(terminal, to, 'seller'), `${terminal} -> ${to} as seller`).toBe(false);
      }
    }
  });

  it('refuses to skip shipping on the way to delivered', () => {
    // The move somebody reaches for when a parcel has plainly arrived and they
    // forgot to press ship. Allowing it would leave an order that was delivered
    // without ever having a tracking number.
    expect(allows('PAID', 'DELIVERED', 'seller')).toBe(false);
    expect(allows('CONFIRMED', 'DELIVERED', 'seller')).toBe(false);
    expect(allows('SHIPPED', 'DELIVERED', 'seller')).toBe(true);
  });

  it('stops a buyer cancelling once money has moved', () => {
    // After payment, calling it off is a refund, which has a different effect
    // on the books and is the seller's to perform.
    expect(allows('PAID', 'CANCELLED', 'buyer')).toBe(false);
    expect(allows('PAID', 'REFUNDED', 'buyer')).toBe(false);
    expect(allows('PAID', 'REFUNDED', 'seller')).toBe(true);
  });

  it('lets either side cancel before payment', () => {
    for (const from of ['PENDING', 'AWAITING_PAYMENT'] as OrderStatus[]) {
      expect(allows(from, 'CANCELLED', 'buyer')).toBe(true);
      expect(allows(from, 'CANCELLED', 'seller')).toBe(true);
    }
  });

  it('lets neither side declare an order paid', () => {
    // PAID is reached only by confirmPayment, after the gateway says so. A
    // transition either party could perform would be a free order.
    expect(allows('AWAITING_PAYMENT', 'PAID', 'buyer')).toBe(false);
    expect(allows('AWAITING_PAYMENT', 'PAID', 'seller')).toBe(false);
    expect(TRANSITIONS.AWAITING_PAYMENT.PAID).toEqual([]);
  });

  it('keeps confirming and shipping with the seller', () => {
    expect(allows('PAID', 'CONFIRMED', 'buyer')).toBe(false);
    expect(allows('PAID', 'CONFIRMED', 'seller')).toBe(true);
    expect(allows('CONFIRMED', 'SHIPPED', 'buyer')).toBe(false);
    expect(allows('CONFIRMED', 'SHIPPED', 'seller')).toBe(true);
  });

  it('lets a buyer confirm receipt', () => {
    // Both sides can: the buyer because they are the one who knows, the seller
    // because a buyer who never presses it would otherwise strand the order.
    expect(allows('SHIPPED', 'DELIVERED', 'buyer')).toBe(true);
  });

  it('answers 403 for a legal move by the wrong person, 409 for an illegal one', () => {
    // The distinction matters to the client: one is "you cannot do that", the
    // other is "that cannot be done", and they need different messages.
    expect(() => assertTransition('PAID', 'CONFIRMED', 'buyer')).toThrow(
      expect.objectContaining({ statusCode: 403 })
    );
    expect(() => assertTransition('PAID', 'SHIPPED', 'seller')).toThrow(
      expect.objectContaining({ statusCode: 409 })
    );
  });

  it('never allows a status to transition to itself', () => {
    // A no-op move would write a fresh timestamp over a real one and send a
    // second notification for nothing.
    for (const status of ALL) {
      expect(TRANSITIONS[status][status], `${status} -> ${status}`).toBeUndefined();
    }
  });
});
