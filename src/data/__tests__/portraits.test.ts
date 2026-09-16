import { PERSONALITY_LIST } from '@/data/personalities';
import { AVATAR_OPTIONS, avatarFor, avatarGroupFor, type PortraitSpec } from '@/data/portraits';
import { AGE_BANDS, GENDERS } from '@/types';

/** Two faces are "the same picture" when every colour and shape input matches. */
const fingerprint = (spec: PortraitSpec): string =>
  [
    spec.skin,
    spec.skinShadow,
    spec.hair,
    spec.hairStyle,
    spec.clothing,
    spec.background,
    spec.blush,
    spec.age ?? 'adult',
  ].join('|');

describe('the avatar catalogue', () => {
  it('keys every option by its own group', () => {
    for (const [key, option] of Object.entries(AVATAR_OPTIONS)) {
      expect(option.group).toBe(key);
    }
  });

  it('draws every younger face with young proportions', () => {
    expect(AVATAR_OPTIONS.girls.spec.age).toBe('young');
    expect(AVATAR_OPTIONS.boys.spec.age).toBe('young');
    expect(AVATAR_OPTIONS.neutralYoung.spec.age).toBe('young');
  });

  it('draws every adult face with adult proportions', () => {
    expect(AVATAR_OPTIONS.women.spec.age).toBeUndefined();
    expect(AVATAR_OPTIONS.men.spec.age).toBeUndefined();
    expect(AVATAR_OPTIONS.neutral.spec.age).toBeUndefined();
  });
});

describe('avatarGroupFor', () => {
  it('sends under-18s to the younger faces', () => {
    expect(avatarGroupFor('female', 'under_18')).toBe('girls');
    expect(avatarGroupFor('male', 'under_18')).toBe('boys');
  });

  it('sends everyone else to the adult faces', () => {
    expect(avatarGroupFor('female', '30_44')).toBe('women');
    expect(avatarGroupFor('male', '45_plus')).toBe('men');
  });

  it('gives "prefer not to say" a neutral face rather than nothing', () => {
    expect(avatarGroupFor('unspecified', '18_29')).toBe('neutral');
    expect(avatarGroupFor('unspecified', 'unspecified')).toBe('neutral');
  });

  it('keeps the neutral face age-appropriate for under-18s', () => {
    expect(avatarGroupFor('unspecified', 'under_18')).toBe('neutralYoung');
  });

  it('treats an unstated age as adult rather than guessing younger', () => {
    expect(avatarGroupFor('female', 'unspecified')).toBe('women');
    expect(avatarGroupFor('male', 'unspecified')).toBe('men');
  });
});

describe('avatarFor', () => {
  it('always returns a face, for every answer the UI can produce', () => {
    for (const gender of GENDERS) {
      for (const ageBand of AGE_BANDS) {
        expect(avatarFor(gender, ageBand).spec).toBeDefined();
      }
    }
  });

  it('never puts an adult on a child avatar', () => {
    for (const gender of GENDERS) {
      for (const ageBand of AGE_BANDS.filter((band) => band !== 'under_18')) {
        expect(avatarFor(gender, ageBand).spec.age).toBeUndefined();
      }
    }
  });
});

describe('partners and learners never share a face', () => {
  // The learner avatars were originally seeded from the partner palettes, which
  // meant a woman talking to Aya saw the identical drawing on both sides of the
  // transcript. Nothing structural stops that recurring, so it is pinned here.
  it('gives every partner a portrait no learner avatar can match', () => {
    const learnerFaces = new Set(
      Object.values(AVATAR_OPTIONS).map((option) => fingerprint(option.spec)),
    );
    for (const personality of PERSONALITY_LIST) {
      expect(learnerFaces.has(fingerprint(personality.portrait))).toBe(false);
    }
  });

  it('gives the partners distinct portraits from each other', () => {
    const faces = PERSONALITY_LIST.map((personality) => fingerprint(personality.portrait));
    expect(new Set(faces).size).toBe(faces.length);
  });

  it('gives the learner avatars distinct portraits from each other', () => {
    const faces = Object.values(AVATAR_OPTIONS).map((option) => fingerprint(option.spec));
    expect(new Set(faces).size).toBe(faces.length);
  });
});
