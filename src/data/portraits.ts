/**
 * Illustrated portraits: the colour recipes every drawn face in the app is
 * built from, plus the catalogue the learner picks their own avatar out of.
 *
 * Vector recipes rather than image files. Nobody has to license artwork, the
 * same nine numbers render crisply from a 22px name badge to an 84px card, and
 * a new face is an entry in a list rather than six exported PNGs.
 */

import type { AgeBand, Gender } from '@/types';

/** Roughly how old the face should read. Changes proportions, not colours. */
export type PortraitAge = 'adult' | 'young';

export interface PortraitSpec {
  readonly skin: string;
  /** Ears, neck and the nose line - one step darker than `skin`. */
  readonly skinShadow: string;
  readonly hair: string;
  readonly hairStyle: 'long' | 'medium' | 'short';
  readonly clothing: string;
  readonly background: string;
  readonly blush: string;
  /** Defaults to `adult` when omitted. */
  readonly age?: PortraitAge;
}

/** Which face a learner is shown. Derived, never chosen. */
export type AvatarGroupId = 'women' | 'men' | 'girls' | 'boys' | 'neutral' | 'neutralYoung';

export interface AvatarOption {
  readonly group: AvatarGroupId;
  /** Read aloud by screen readers, so it has to describe the picture. */
  readonly label: string;
  readonly spec: PortraitSpec;
}

/**
 * One face per group.
 *
 * There is no picker, so a second variant of any group would be data nothing
 * could ever reach. Adding one means adding a way to choose it at the same
 * time - otherwise it is dead weight that reads like a feature.
 */
export const AVATAR_OPTIONS: Readonly<Record<AvatarGroupId, AvatarOption>> = {
  women: {
    group: 'women',
    label: 'Woman with dark brown hair',
    spec: {
      skin: '#F0C7A4',
      skinShadow: '#DDA87F',
      hair: '#3C2A22',
      hairStyle: 'long',
      clothing: '#675CF5',
      background: '#EDEAFF',
      blush: '#E8917F',
    },
  },
  men: {
    group: 'men',
    label: 'Man with black hair',
    spec: {
      skin: '#DCA679',
      skinShadow: '#BE8557',
      hair: '#1E1815',
      hairStyle: 'short',
      clothing: '#16233F',
      background: '#DFE6F4',
      blush: '#C77A62',
    },
  },
  girls: {
    group: 'girls',
    label: 'Young girl with brown hair',
    spec: {
      skin: '#F7D9BC',
      skinShadow: '#E2B994',
      hair: '#5A3A25',
      hairStyle: 'long',
      clothing: '#E8639B',
      background: '#FCE1EC',
      blush: '#F2A08D',
      age: 'young',
    },
  },
  // Shown when someone would rather not say. Deliberately androgynous: a
  // placeholder, not a guess at what they look like.
  neutral: {
    group: 'neutral',
    label: 'A neutral avatar',
    spec: {
      skin: '#E7BE9B',
      skinShadow: '#CB9E78',
      hair: '#4A4A55',
      hairStyle: 'medium',
      clothing: '#5B6376',
      background: '#E8EAEF',
      blush: '#CE8E76',
    },
  },
  neutralYoung: {
    group: 'neutralYoung',
    label: 'A neutral avatar',
    spec: {
      skin: '#F2D3B5',
      skinShadow: '#DAB38D',
      hair: '#59565F',
      hairStyle: 'medium',
      clothing: '#6B7A8F',
      background: '#EAEDF2',
      blush: '#E79F86',
      age: 'young',
    },
  },
  boys: {
    group: 'boys',
    label: 'Young boy with brown hair',
    spec: {
      skin: '#F4D2B2',
      skinShadow: '#DDB187',
      hair: '#6B4526',
      hairStyle: 'short',
      clothing: '#2563C9',
      background: '#DDE8FB',
      blush: '#EC9C83',
      age: 'young',
    },
  },
};

/**
 * The group matching a learner's answers.
 *
 * Under-18s get the younger faces; everyone else gets the adult ones, so an
 * unstated age never lands anyone on a child avatar. "Rather not say" is a real
 * answer with a real face, not an absence - it maps to the neutral pair rather
 * than leaving the profile showing a bare letter.
 */
export const avatarGroupFor = (gender: Gender, ageBand: AgeBand): AvatarGroupId => {
  const young = ageBand === 'under_18';
  if (gender === 'female') return young ? 'girls' : 'women';
  if (gender === 'male') return young ? 'boys' : 'men';
  return young ? 'neutralYoung' : 'neutral';
};

/** The avatar to draw for a learner. There is always one. */
export const avatarFor = (gender: Gender, ageBand: AgeBand): AvatarOption =>
  AVATAR_OPTIONS[avatarGroupFor(gender, ageBand)];
