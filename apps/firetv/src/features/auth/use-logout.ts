import { useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { clearSession as clearStoredSession } from '@/lib/secure-store';
import { queryClient } from '@/lib/query-client';

export function useLogout() {
  const clearSession = useAuthStore((s) => s.clearSession);

  return useCallback(async () => {
    await clearStoredSession();
    queryClient.clear();
    clearSession();
  }, [clearSession]);
}
