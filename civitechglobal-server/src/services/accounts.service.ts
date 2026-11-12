import type { AccountKind, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { hashPassword } from '../utils/password.js';
import { emailLookupHash } from './auth.service.js';
import { freeSlug } from './company.service.js';
import { sendSmsSafely } from './sms/dispatch.js';
import { greetingName } from './sms/templates.js';
import { normalizeIranMobile } from '../utils/persian.js';

/**
 * Member accounts staff open on somebody's behalf, and companies.
 *
 * The desk meets an expert or a company in person, opens the account, and
 * hands over the credentials. Such an account is vouched for by staff rather
 * than verified by documents (see assertVerified), its email is taken as
 * confirmed — staff typed it, nobody claimed it — and it is an ordinary
 * member: never staff, never any permission.
 */

export interface MemberAccountInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
  phone?: string;
}

type Tx = Prisma.TransactionClient;

async function assertFree(tx: Tx, input: { email: string; username?: string }) {
  const existing = await tx.user.findFirst({ where: { emailHash: emailLookupHash(input.email) }, select: { id: true } });
  if (existing) throw new AppError('حسابی با این ایمیل از پیش وجود دارد.', 409);
  if (input.username) {
    const taken = await tx.user.findUnique({ where: { username: input.username }, select: { id: true } });
    if (taken) throw new AppError('این نام کاربری گرفته شده است.', 409);
  }
}

/** Creates a member account inside the caller's transaction. */
export async function createMemberAccount(
  tx: Tx,
  input: MemberAccountInput & { accountKind: AccountKind },
  vouchedBy: string | null,
) {
  const email = input.email.trim().toLowerCase();
  const username = input.username?.trim().toLowerCase() || undefined;
  await assertFree(tx, { email, username });

  return tx.user.create({
    data: {
      email,
      emailHash: emailLookupHash(email),
      password: await hashPassword(input.password),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      username: username ?? null,
      phone: normalizeIranMobile(input.phone ?? '') ?? (input.phone?.trim() || null),
      role: 'USER',
      accountKind: input.accountKind,
      ...(vouchedBy
        ? {
            staffVouchedAt: new Date(),
            staffVouchedById: vouchedBy,
            emailVerified: true,
            // Staff typed it in front of its owner: as good as a code.
            ...(normalizeIranMobile(input.phone ?? '') ? { phoneVerifiedAt: new Date() } : {}),
          }
        : {}),
    },
    select: { id: true, email: true, username: true, phone: true, firstName: true, lastName: true, accountKind: true },
  });
}

/**
 * Tells the owner of a staff-opened account it is ready, once the account is
 * committed. The username only: the password was handed over in person and
 * is never texted. No username, no text — an email address in an SMS reads as
 * a link and is refused anyway.
 */
export function announceStaffAccount(user: { id: string; firstName: string; phone: string | null }): void {
  const name = greetingName(user.firstName);
  if (!name || !user.phone) return;
  sendSmsSafely('account', { phone: user.phone, userId: user.id }, { token: name });
}

export interface CompanyAccountInput {
  /** The person who operates the account for the company. */
  account: MemberAccountInput;
  companyName: string;
  /** «شناسهٔ ملی», eleven digits. */
  nationalId: string;
}

export function normalizeCompanyNationalId(value: string): string {
  const digits = value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/\D/g, '');
  if (!/^\d{11}$/.test(digits)) throw new AppError('شناسهٔ ملی شرکت باید ۱۱ رقم باشد.', 400);
  return digits;
}

/**
 * A company account and its company page, together.
 *
 * Used by staff (vouchedBy set) and by self-registration (vouchedBy null —
 * the company then verifies with its registration documents like anyone
 * else).
 */
export async function createCompanyAccount(input: CompanyAccountInput, vouchedBy: string | null) {
  const nationalId = normalizeCompanyNationalId(input.nationalId);
  const name = input.companyName.trim();
  if (name.length < 2) throw new AppError('نام شرکت الزامی است.', 400);

  const taken = await prisma.company.findUnique({ where: { nationalId }, select: { id: true } });
  if (taken) throw new AppError('شرکتی با این شناسهٔ ملی از پیش ثبت شده است.', 409);
  const slug = await freeSlug(name);

  const created = await prisma.$transaction(async (tx) => {
    const user = await createMemberAccount(tx, { ...input.account, accountKind: 'COMPANY' }, vouchedBy);
    const company = await tx.company.create({
      data: { ownerId: user.id, name, nationalId, slug },
      select: { id: true, slug: true, name: true },
    });
    return { user, company };
  });
  if (vouchedBy) announceStaffAccount(created.user);
  return created;
}

/** Staff list of member accounts the desk opened, newest first. */
export async function listVouchedAccounts(query: { page: number; pageSize: number }) {
  const where: Prisma.UserWhereInput = { staffVouchedAt: { not: null }, deletedAt: null };
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { staffVouchedAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        accountKind: true,
        staffVouchedAt: true,
        company: { select: { id: true, name: true, slug: true } },
        expertProfile: { select: { id: true, slug: true, fullName: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page: query.page, pageSize: query.pageSize };
}
