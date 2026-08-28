import crypto from 'node:crypto';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_REQUIREMENTS = {
  lowercase: /[a-z]/,
  uppercase: /[A-Z]/,
  digit: /[0-9]/,
  special: /[^A-Za-z0-9]/,
};

export const PASSWORD_COMPLEXITY_MESSAGE =
  'Password must be 12-128 characters and include at least one uppercase letter, one lowercase letter, one number, and one special character';

export function isPasswordStrong(password: string): boolean {
  if (!password || password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return false;
  }
  return Object.values(PASSWORD_REQUIREMENTS).every((regex) => regex.test(password));
}

export function assertPasswordStrong(password: string, label = 'Password'): void {
  if (!isPasswordStrong(password)) {
    throw new Error(`${label} ${PASSWORD_COMPLEXITY_MESSAGE.toLowerCase()}`);
  }
}

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SPECIALS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const ALL_CHARS = LOWERCASE + UPPERCASE + DIGITS + SPECIALS;

function randomChar(charset: string): string {
  return charset[crypto.randomInt(charset.length)] as string;
}

function shuffle(input: string): string {
  const chars = input.split('');
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j] as string, chars[i] as string];
  }
  return chars.join('');
}

/** Generates a random password guaranteed to satisfy the password policy. */
export function generateSecurePassword(length = 20): string {
  if (length < PASSWORD_MIN_LENGTH || length > PASSWORD_MAX_LENGTH) {
    throw new Error(`Generated password length must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH}`);
  }

  let password = randomChar(LOWERCASE) + randomChar(UPPERCASE) + randomChar(DIGITS) + randomChar(SPECIALS);
  for (let i = 4; i < length; i++) {
    password += randomChar(ALL_CHARS);
  }

  return shuffle(password);
}
