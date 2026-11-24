import { describe, expect, it } from 'vitest';
import { slugToTagCode, tagCodeToSlug } from '../src/utils/tagCodes.js';
import { CONTEXT_TAG_CODES } from '../src/schemas/suggestions.schema.js';

const SLUG_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/; // CHECK của tag.slug trong DB (DB10)

describe('tag code <-> slug mapping', () => {
  it.each([
    ['TROI_MUA', 'troi-mua'],
    ['LUOI_NAU', 'luoi-nau'],
    ['CUOI_THANG', 'cuoi-thang'],
    ['NAU_CHO_4', 'nau-cho-4'],
    ['AN_NHE', 'an-nhe']
  ])('maps %s to %s and back', (code, slug) => {
    expect(tagCodeToSlug(code)).toBe(slug);
    expect(slugToTagCode(slug)).toBe(code);
  });

  it('turns every chip code into a slug the DB CHECK accepts, and round-trips', () => {
    for (const code of CONTEXT_TAG_CODES) {
      const slug = tagCodeToSlug(code);
      expect(slug).toMatch(SLUG_FORMAT);
      expect(slugToTagCode(slug)).toBe(code);
    }
  });

  it('maps slugs that are not chips too', () => {
    expect(slugToTagCode('bua-sang')).toBe('BUA_SANG');
  });
});
