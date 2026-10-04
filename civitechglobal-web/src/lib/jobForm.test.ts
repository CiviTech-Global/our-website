import { describe, expect, it } from 'vitest';
import { EMPTY_EXTRAS, extrasPayload } from './jobForm';
import { fill, groupCategories } from './jobFormat';
import type { JobCategory } from '@/types/jobs';

describe('extrasPayload', () => {
  it('clears emptied fields on an edit and leaves them out on a new posting', () => {
    expect(extrasPayload(EMPTY_EXTRAS, null)).toMatchObject({
      jobCategoryId: null,
      seniority: null,
      minExperienceYears: null,
      fieldOfStudy: null,
      ageMin: null,
    });
    expect(extrasPayload(EMPTY_EXTRAS, undefined).jobCategoryId).toBeUndefined();
  });

  it('reads numbers typed in Persian digits', () => {
    const payload = extrasPayload({ ...EMPTY_EXTRAS, minExperienceYears: '۳', ageMin: '۲۵', ageMax: '۴۰' }, undefined);
    expect(payload).toMatchObject({ minExperienceYears: 3, ageMin: 25, ageMax: 40 });
  });

  it('drops something that is not a whole number rather than sending it', () => {
    expect(extrasPayload({ ...EMPTY_EXTRAS, minExperienceYears: '2.5' }, null).minExperienceYears).toBeNull();
  });
});

describe('groupCategories', () => {
  const category = (id: string, parentId: string | null): JobCategory => ({
    id,
    slug: id,
    name: id,
    nameEn: id,
    parentId,
    position: 0,
    _count: { jobs: 0 },
  });

  it('puts each child under its parent and drops orphans', () => {
    const groups = groupCategories([category('it', null), category('web', 'it'), category('lost', 'gone')]);
    expect(groups).toHaveLength(1);
    expect(groups[0].children.map((child) => child.id)).toEqual(['web']);
  });
});

describe('fill', () => {
  it('fills named slots and leaves unknown ones as written', () => {
    expect(fill('{a} of {b} {c}', { a: 1, b: '2' })).toBe('1 of 2 {c}');
  });
});
