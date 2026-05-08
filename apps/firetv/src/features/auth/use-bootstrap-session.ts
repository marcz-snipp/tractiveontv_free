import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { clearSession } from '@/lib/secure-store';

export function useBootstrapSession(): void {
  const status = useAuthStore((s) => s.status);
  const setStatus = useAuthStore((s) => s.setStatus);

  useEffect(() => {
    if (status !== 'booting') return;
    let cancelled = false;

    void (async () => {
      await clearSession();
      if (!cancelled) setStatus('unauthenticated');
    })();

    return () => {
      cancelled = true;
    };
  }, [setStatus, status]);
}
