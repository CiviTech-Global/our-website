import { afterEach, describe, expect, it, vi } from 'vitest';
import { activeDriver, driverByName, sandboxDriver } from './index.js';
import { AppError } from '../../middleware/errorHandler.js';

/**
 * Choosing a driver.
 *
 * The case worth defending is a deployment that means to take real money and
 * names a gateway that does not exist. Falling back to the sandbox there would
 * mark every order paid for free, and it would look like it was working.
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('the payment driver registry', () => {
  it('defaults to the sandbox when the variable is unset', () => {
    vi.stubEnv('PAYMENT_DRIVER', undefined);
    expect(activeDriver().name).toBe('sandbox');
  });

  it('defaults to the sandbox when the variable is declared but empty', () => {
    // A deploy that renders the variable with no value hands us an empty
    // string, which `??` would accept and then fail to resolve. This caught
    // exactly that.
    vi.stubEnv('PAYMENT_DRIVER', '');
    expect(activeDriver().name).toBe('sandbox');
  });

  it('defaults to the sandbox when the variable is only whitespace', () => {
    vi.stubEnv('PAYMENT_DRIVER', '   ');
    expect(activeDriver().name).toBe('sandbox');
  });

  it('throws rather than falling back when the named driver is unknown', () => {
    // If this ever silently returned the sandbox, a production deployment with
    // PAYMENT_DRIVER=zarinpall would take no money and report success.
    vi.stubEnv('PAYMENT_DRIVER', 'zarinpall');
    expect(() => activeDriver()).toThrow(AppError);
    expect(() => activeDriver()).toThrow(/Unknown payment driver/);
  });

  it('ignores case and surrounding space, since this comes from a hand-written file', () => {
    vi.stubEnv('PAYMENT_DRIVER', '  SandBox  ');
    expect(activeDriver().name).toBe('sandbox');
  });

  it('resolves a stored intent by the driver that created it', () => {
    // Verification has to go back to the same gateway that issued the
    // reference, not to whichever one the deployment now prefers.
    expect(driverByName('sandbox')).toBe(sandboxDriver);
  });

  it('throws for a stored intent naming a driver that no longer exists', () => {
    // Happens when a gateway is removed while old rows remain. A throw is
    // right: the alternative is verifying somebody's real payment against the
    // wrong gateway.
    expect(() => driverByName('gone')).toThrow(/Unknown payment driver/);
  });
});
