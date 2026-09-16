import { useEffect, useState } from 'react';

import { refresh, subscribe, type NetworkStatus } from '@/services/network/NetworkService';

/** Live connectivity, used to show the offline banner and disable AI actions. */
export const useNetworkStatus = (): NetworkStatus => {
  const [status, setStatus] = useState<NetworkStatus>({ isOnline: true, type: 'unknown' });

  useEffect(() => {
    let active = true;
    void refresh().then((initial) => {
      if (active) setStatus(initial);
    });
    const unsubscribe = subscribe((next) => {
      if (active) setStatus(next);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return status;
};
