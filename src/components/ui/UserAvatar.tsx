import React from 'react';

import { avatarFor } from '@/data/portraits';
import { useTheme } from '@/theme';
import type { UserProfile } from '@/types';
import { Avatar } from './Avatar';

export interface UserAvatarProps {
  readonly profile: UserProfile;
  readonly size: number;
}

/**
 * The learner's own avatar, wherever it appears.
 *
 * One component so the derivation lives in exactly one place. There is always
 * a face: "rather not say" maps to a deliberately neutral one rather than
 * leaving a bare letter, and the initial survives only as a render fallback.
 */
export function UserAvatar({ profile, size }: UserAvatarProps): React.JSX.Element {
  const theme = useTheme();
  const option = avatarFor(profile.gender, profile.ageBand);

  return (
    <Avatar
      initial={profile.name.trim().charAt(0) || 'Y'}
      portrait={option.spec}
      size={size}
      backgroundColor={theme.colors.primarySoftStrong}
      textColor={theme.colors.primaryStrong}
      label={`Your avatar: ${option.label}`}
    />
  );
}
