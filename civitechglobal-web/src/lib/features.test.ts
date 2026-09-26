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

  it('exposes flags as a frozen-shaped constant object', () => {
    // A mutable flag object invites somebody to flip it at runtime to "test
    // something", which then ships.
    expect(Object.keys(features)).toEqual(['tradeMaster']);
  });
});
