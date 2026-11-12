import { describe, expect, it } from 'vitest';
import { SMS_TEMPLATES, SmsLinkError, SmsTokenError, assertNoLink, assertTokens, greetingName, type SmsKind } from './templates.js';

/**
 * The template list is what gets submitted to Kavenegar, so its rules are
 * checked here rather than discovered as a rejection in the panel: names
 * Kavenegar accepts, no links anywhere, and every placeholder a text uses is
 * one the gateway fills.
 */

const kinds = Object.keys(SMS_TEMPLATES) as SmsKind[];

describe('the SMS templates', () => {
  it.each(kinds)('%s has a name Kavenegar accepts', (kind) => {
    expect(SMS_TEMPLATES[kind].name).toMatch(/^[A-Za-z][A-Za-z0-9]*$/);
  });

  it('gives every template its own name', () => {
    const names = kinds.map((kind) => SMS_TEMPLATES[kind].name);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(kinds)('%s contains no link', (kind) => {
    expect(() => assertNoLink(kind, { token: 'X' })).not.toThrow();
  });

  it.each(kinds)('%s uses only placeholders it documents, and %%token always', (kind) => {
    const { text, tokens } = SMS_TEMPLATES[kind];
    expect(text).toContain('%token');
    for (const used of text.match(/%token\d*/g) ?? []) {
      expect(Object.keys(tokens)).toContain(used.slice(1));
    }
  });
});

describe('the link guard', () => {
  it.each([
    'https://rayantamaddonjahangostar.ir',
    'http://x',
    'www.example',
    'rayantamaddonjahangostar.ir',
    'example.com/a',
    't.me/channel',
    'SITE.IR',
  ])('refuses %s in a token', (value) => {
    expect(() => assertNoLink('received', { token: 'AB12CD34', token2: value })).toThrow(SmsLinkError);
  });

  it.each(['AB12CD34', '14', 'آبان', 'acme.hr'])('lets %s through', (value) => {
    // acme.hr has a dot but no domain ending, so it is not a link; the token
    // rule below is what keeps it out of a text.
    expect(() => assertNoLink('account', { token: value })).not.toThrow();
  });

});

describe('the token rule', () => {
  it.each(['AB12CD34', '123456', '14', '30', 'آبان', 'بیمه', 'تأیید', 'محمد'])('accepts %s', (value) => {
    expect(() => assertTokens('received', { token: value })).not.toThrow();
  });

  it.each(['1405/08/25', '14:30', 'two words', 'acme.hr', 'a-b', 'نرم‌افزار', ''])('refuses %j', (value) => {
    expect(() => assertTokens('received', { token: value })).toThrow(SmsTokenError);
  });

  it('greets by the first word of a name, letters only', () => {
    expect(greetingName('  محمد رضا ')).toBe('محمد');
    expect(greetingName('Ali.')).toBe('Ali');
    expect(greetingName('123')).toBeNull();
  });
});
