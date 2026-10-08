import { describe, expect, it } from 'vitest';
import {
  documentKindsSchema,
  jobBoardSchema,
  jobSchema,
  jobUpdateSchema,
  projectBoardSchema,
  verificationSchema,
} from './marketplace.schema.js';

const valid = {
  kind: 'INDIVIDUAL' as const,
  legalFirstName: 'Ali',
  legalLastName: 'Rezaei',
  // Satisfies the Iranian national-id check digit.
  nationalId: '0084575948',
  phone: '09121234567',
};

describe('documentKindsSchema', () => {
  /**
   * These arrive as a JSON string in a form field, so they never pass through
   * validate(). The route used to assert them into the enum with `as never`,
   * which meant a value the enum does not have travelled to Prisma and came
   * back as a 500 — telling the caller we broke when in fact they sent
   * something we do not recognise.
   */
  it('refuses a kind the enum does not have', () => {
    const result = documentKindsSchema.safeParse(['NATIONAL_ID_CARD', 'BIRTH_CERTIFICATE']);

    expect(result.success).toBe(false);
    if (!result.success) {
      // The index, so the caller can tell which of the files was wrong.
      expect(result.error.errors[0].path).toEqual([1]);
    }
  });

  it('accepts every kind the schema actually declares', () => {
    const all = ['NATIONAL_ID_CARD', 'PASSPORT', 'COMPANY_REGISTRATION', 'AUTHORITY_LETTER', 'OTHER'];

    expect(documentKindsSchema.safeParse(all).success).toBe(true);
  });
});

describe('verificationSchema', () => {
  /**
   * Strict on purpose. zod strips unknown keys by default, so a client sending
   * `address` where this expects `addressLine` had the field quietly discarded
   * and a reviewer saw a blank where somebody had typed their home address.
   * Losing identity details in silence is worse than refusing the request.
   */
  it('refuses a key it does not recognise rather than discarding it', () => {
    const result = verificationSchema.safeParse({ ...valid, address: 'somewhere' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('address');
    }
  });

  it('accepts the address under the name it actually uses', () => {
    const result = verificationSchema.safeParse({
      ...valid,
      addressLine: 'somewhere',
      province: 'Tehran',
      city: 'Tehran',
    });

    expect(result.success).toBe(true);
  });

  /** AccountKind has two values. A third was offered in the UI for a while. */
  it('refuses an account kind that does not exist', () => {
    expect(verificationSchema.safeParse({ ...valid, kind: 'COMPANY_REPRESENTATIVE' }).success).toBe(
      false
    );
  });

  it('makes a company say which company it is', () => {
    const nameless = verificationSchema.safeParse({ ...valid, kind: 'COMPANY' });
    expect(nameless.success).toBe(false);

    const named = verificationSchema.safeParse({
      ...valid,
      kind: 'COMPANY',
      companyName: 'Rayan Tamaddon',
      companyRegistrationNo: '12345',
    });
    expect(named.success).toBe(true);
  });
});

describe('jobBoardSchema', () => {
  it('defaults the sort to newest and leaves money undefined', () => {
    const parsed = jobBoardSchema.parse({});

    expect(parsed.sort).toBe('newest');
    expect(parsed.salaryMin).toBeUndefined();
    expect(parsed.salaryMax).toBeUndefined();
    expect(parsed.skills).toBeUndefined();
  });

  it('coerces salary bounds to BigInt from digit strings', () => {
    const parsed = jobBoardSchema.parse({ salaryMin: '10000000', salaryMax: '50000000' });

    expect(parsed.salaryMin).toBe(BigInt(10_000_000));
    expect(parsed.salaryMax).toBe(BigInt(50_000_000));
  });

  it('refuses a salary that is not a plain digit string', () => {
    expect(jobBoardSchema.safeParse({ salaryMin: '10,000,000' }).success).toBe(false);
    expect(jobBoardSchema.safeParse({ salaryMin: '-5' }).success).toBe(false);
    expect(jobBoardSchema.safeParse({ salaryMin: '12.5' }).success).toBe(false);
  });

  it('refuses a sort it does not know', () => {
    expect(jobBoardSchema.safeParse({ sort: 'titleAz' }).success).toBe(false);
  });

  it('splits the comma skills list, trims, drops empties and caps at ten', () => {
    const parsed = jobBoardSchema.parse({ skills: ' react, ,  node ,react,extra1,extra2,extra3,extra4,extra5,extra6,extra7,extra8,extra9,extra10 ' });

    expect(parsed.skills).toEqual(['react', 'node', 'extra1', 'extra2', 'extra3', 'extra4', 'extra5', 'extra6', 'extra7', 'extra8']);
  });

  it('turns an all-empty skills string into an empty list', () => {
    expect(jobBoardSchema.parse({ skills: ' , , ' }).skills).toEqual([]);
  });
});

describe('projectBoardSchema', () => {
  it('coerces budget bounds to BigInt and defaults the sort', () => {
    const parsed = projectBoardSchema.parse({ budgetMin: '20000000' });

    expect(parsed.budgetMin).toBe(BigInt(20_000_000));
    expect(parsed.sort).toBe('newest');
  });

  it('refuses a budget bound that is not digits', () => {
    expect(projectBoardSchema.safeParse({ budgetMax: 'about five million' }).success).toBe(false);
  });

  it('refuses a sort it does not know', () => {
    expect(projectBoardSchema.safeParse({ sort: 'salaryAsc' }).success).toBe(false);
  });
});

describe('jobSchema and jobUpdateSchema', () => {
  const posting = {
    title: 'Backend developer',
    description: 'A'.repeat(60),
    employmentType: 'FULL_TIME',
    workArrangement: 'ONSITE',
  };

  it('reads a salary typed in Persian digits', () => {
    const parsed = jobSchema.parse({ ...posting, salaryMin: '۲۵۰۰۰۰۰۰' });
    expect(parsed.salaryMin).toBe(BigInt(25_000_000));
  });

  it('refuses a salary range that runs backwards', () => {
    const result = jobSchema.safeParse({ ...posting, salaryMin: '50000000', salaryMax: '10000000' });
    expect(result.success).toBe(false);
  });

  it('refuses a new posting whose deadline has passed', () => {
    expect(jobSchema.safeParse({ ...posting, closesAt: '2020-01-01' }).success).toBe(false);
  });

  it('hires one person unless told otherwise', () => {
    expect(jobSchema.parse(posting).openings).toBe(1);
  });

  it('turns an emptied field into null on an edit, and leaves an absent one out', () => {
    const parsed = jobUpdateSchema.parse({ city: '', province: null, salaryMin: '  ' });
    expect(parsed).toEqual({ city: null, province: null, salaryMin: null });
  });

  it('does not invent defaults on an edit', () => {
    expect(jobUpdateSchema.parse({ title: 'Backend developer' })).toEqual({ title: 'Backend developer' });
  });
});

describe('postings beyond Iran', () => {
  const posting = {
    title: 'Backend developer',
    description: 'A'.repeat(60),
    employmentType: 'FULL_TIME',
    workArrangement: 'REMOTE',
  };

  it('is in Iran, in toman, per month, unless it says otherwise', () => {
    const parsed = jobSchema.parse(posting);
    expect(parsed).toMatchObject({ country: 'IR', currency: 'IRT', salaryPeriod: 'MONTH', remoteWorldwide: false });
  });

  it('takes a country and currency in either case', () => {
    const parsed = jobSchema.parse({ ...posting, country: 'de', currency: 'eur', salaryPeriod: 'YEAR' });
    expect(parsed).toMatchObject({ country: 'DE', currency: 'EUR', salaryPeriod: 'YEAR' });
  });

  it('refuses a country or currency that does not exist', () => {
    expect(jobSchema.safeParse({ ...posting, country: 'XX' }).success).toBe(false);
    expect(jobSchema.safeParse({ ...posting, currency: 'DOGE' }).success).toBe(false);
  });

  it('filters the board by country', () => {
    expect(jobBoardSchema.parse({ country: 'tr' }).country).toBe('TR');
  });
});
