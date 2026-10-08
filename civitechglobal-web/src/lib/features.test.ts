import { describe, expect, it } from 'vitest';
import { features } from './features';

/**
 * The client half of the TradeMaster gate.
 *
 * Weaker than the server's on purpose — anybody can edit what a browser
 * believes, so this keeps routes out of the route table rather than protecting
 * anything. Still worth a test: if it defaulted on, a production build would
 * register routes to a module whose every endpoint answers 404, and a visitor
 * would see a broken page instead of no page.
 *
 * `import.meta.env.PROD` is false under vitest, so the development default is
 * what is observable here. The production behaviour is asserted by the build
 * check in the same commit: the bundle must not contain the route paths.
 */
describe('client feature flags', () => {
  it('has TradeMaster on outside a production build', () => {
    expect(features.tradeMaster).toBe(true);
  });

  it('has the purchase path off even outside production', () => {
    // The module is a catalogue for now. Unlike the module flag there is no
    // environment where this defaults on — a basket that appears in
    // development and not in production is a demo that misleads.
    expect(features.tradeMasterOrders).toBe(false);
  });

  it('exposes flags as a frozen-shaped constant object', () => {
    // A mutable flag object invites somebody to flip it at runtime to "test
    // something", which then ships.
    expect(Object.keys(features)).toEqual(['tradeMaster', 'tradeMasterOrders', 'jobsV2', 'projectsV2', 'booksV2', 'demoData']);
  });

  it('has the demo panel on outside a production build', () => {
    // `import.meta.env.PROD` is false under vitest, so this is the development
    // answer. This flag only hides the navigation link; that the page is absent
    // from a production bundle is a property of App.tsx, checked against dist.
    expect(features.demoData).toBe(true);
  });
});
