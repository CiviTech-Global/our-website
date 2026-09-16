import { describe, expect, it } from 'vitest';
import { resumeSubmissionSchema } from './resume.schema.js';

const person = { fullName: 'Sara Ahmadi', email: 'sara@example.com', phone: '09121234567' };

describe('resume submission: tracks', () => {
  it('treats a submission with no track as a job CV', () => {
    // The job form predates tracks and sends none. It must keep working
    // unchanged, and land in the pile it always did.
    const parsed = resumeSubmissionSchema.parse(person);
    expect(parsed.track).toBe('JOB');
  });

  it('does not ask a job applicant the programme questions', () => {
    expect(resumeSubmissionSchema.safeParse({ ...person, track: 'JOB' }).success).toBe(true);
  });

  it.each(['VOLUNTEER', 'INTERNSHIP'])('requires discipline and hours for %s', (track) => {
    const result = resumeSubmissionSchema.safeParse({ ...person, track });
    expect(result.success).toBe(false);

    const paths = result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
    // A placement cannot be planned without these two. Everything else is
    // optional, so somebody undecided on duration is not turned away.
    expect(paths).toEqual(expect.arrayContaining(['discipline', 'hoursPerWeek']));
  });

  it('accepts a complete internship application', () => {
    const parsed = resumeSubmissionSchema.parse({
      ...person,
      track: 'INTERNSHIP',
      discipline: 'BACKEND',
      hoursPerWeek: 20,
      availableFrom: '2026-10-01T00:00:00.000Z',
      durationMonths: 6,
      arrangement: 'REMOTE',
      university: 'University of Tehran',
      skills: ['TypeScript', 'PostgreSQL'],
      githubUrl: 'https://github.com/sara',
    });

    expect(parsed.availableFrom).toBeInstanceOf(Date);
    expect(parsed.skills).toEqual(['TypeScript', 'PostgreSQL']);
  });

  it('refuses a week longer than a full-time one', () => {
    const result = resumeSubmissionSchema.safeParse({
      ...person,
      track: 'VOLUNTEER',
      discipline: 'FRONTEND',
      hoursPerWeek: 100,
    });
    expect(result.success).toBe(false);
  });

  it('refuses a track it does not know', () => {
    expect(resumeSubmissionSchema.safeParse({ ...person, track: 'CONTRACTOR' }).success).toBe(false);
  });
});
