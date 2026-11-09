import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from './auth.schema.js';
import { profileLink, profileSchema } from './marketplace.schema.js';
import { memberAccountSchema } from './accounts.schema.js';

/**
 * The inputs this change added: professional links that must point where they
 * say, sign-in by username, and registering as a company.
 */

describe('professional links', () => {
  const github = profileLink('github.com', 'bad');

  it('accepts the site itself and its subdomains', () => {
    expect(github.safeParse('https://github.com/someone').success).toBe(true);
    expect(github.safeParse('https://www.github.com/someone').success).toBe(true);
    expect(github.safeParse('https://gist.github.com/someone').success).toBe(true);
  });

  it('refuses a link that only looks like it', () => {
    // A "GitHub" link under the GitHub icon that lands somewhere else is the
    // whole risk this check exists for.
    expect(github.safeParse('https://github.com.evil.example/someone').success).toBe(false);
    expect(github.safeParse('https://notgithub.com/someone').success).toBe(false);
    expect(github.safeParse('javascript:alert(1)').success).toBe(false);
  });

  it('lets a member clear a link with an empty string', () => {
    expect(profileSchema.parse({ githubUrl: '', linkedinUrl: '' })).toMatchObject({ githubUrl: '', linkedinUrl: '' });
    expect(profileSchema.safeParse({ linkedinUrl: 'https://github.com/x' }).success).toBe(false);
  });
});

describe('signing in', () => {
  it('takes an email address or a username', () => {
    expect(loginSchema.parse({ email: 'Ada@Example.com', password: 'x' }).email).toBe('ada@example.com');
    expect(loginSchema.parse({ email: 'acme.hr', password: 'x' }).email).toBe('acme.hr');
  });
});

describe('registering', () => {
  const person = {
    email: 'ada@example.com',
    password: 'Str0ng!Passw0rd',
    firstName: 'Ada',
    lastName: 'Lovelace',
  };

  it('is a person by default', () => {
    expect(registerSchema.parse(person).accountKind).toBe('INDIVIDUAL');
  });

  it('asks a company for its name and an eleven-digit national id', () => {
    expect(registerSchema.safeParse({ ...person, accountKind: 'COMPANY' }).success).toBe(false);
    expect(
      registerSchema.safeParse({ ...person, accountKind: 'COMPANY', companyName: 'Acme', companyNationalId: '1234' }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ ...person, accountKind: 'COMPANY', companyName: 'Acme', companyNationalId: '۱۰۱۰۰۱۲۳۴۵۶' })
        .success,
    ).toBe(true);
  });
});

describe('accounts staff open', () => {
  it('hold the same password rules as self-registration', () => {
    const base = { email: 'x@example.com', firstName: 'A', lastName: 'B' };
    expect(memberAccountSchema.safeParse({ ...base, password: 'short' }).success).toBe(false);
    expect(memberAccountSchema.safeParse({ ...base, password: 'Str0ng!Passw0rd' }).success).toBe(true);
  });

  it('keep usernames to what a profile URL can carry', () => {
    const base = { email: 'x@example.com', firstName: 'A', lastName: 'B', password: 'Str0ng!Passw0rd' };
    expect(memberAccountSchema.parse({ ...base, username: 'Acme.HR' }).username).toBe('acme.hr');
    expect(memberAccountSchema.safeParse({ ...base, username: 'a b' }).success).toBe(false);
  });
});
