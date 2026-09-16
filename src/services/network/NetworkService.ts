import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

/**
 * Connectivity, normalised to one boolean.
 *
 * The distinction that matters is `isInternetReachable`, not `isConnected`: a
 * phone attached to a captive-portal wifi reports "connected" while every
 * request fails. We treat `null` (not yet determined) as online, because
 * blocking the UI on an unknown is worse than letting one request fail.
 */

export interface NetworkStatus {
  readonly isOnline: boolean;
  readonly type: string;
}

const toStatus = (state: NetInfoState): NetworkStatus => ({
  isOnline: state.isConnected === true && state.isInternetReachable !== false,
  type: state.type,
});

let cached: NetworkStatus = { isOnline: true, type: 'unknown' };

export const subscribe = (listener: (status: NetworkStatus) => void): (() => void) =>
  NetInfo.addEventListener((state) => {
    cached = toStatus(state);
    listener(cached);
  });

export const refresh = async (): Promise<NetworkStatus> => {
  const state = await NetInfo.fetch();
  cached = toStatus(state);
  return cached;
};

/** Synchronous best-known value, for guarding a request without awaiting. */
export const isOnline = (): boolean => cached.isOnline;

export const __setStatusForTesting = (status: NetworkStatus): void => {
  cached = status;
};
