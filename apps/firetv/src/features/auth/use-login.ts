import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api-client';
import { clearCredentials, saveCredentials } from '@/lib/secure-store';
import { prefs } from '@/lib/storage';
import { queryClient } from '@/lib/query-client';
import { loginRequest } from './api';

export interface LoginInput {
  email: string;
  password: string;
  rememberMe: boolean;
}

export type LoginErrorKind = 'invalidCredentials' | 'rateLimited' | 'network' | 'generic';

function classifyError(error: unknown): LoginErrorKind {
  if (error instanceof ApiError) {
    if (error.isUnauthorized) return 'invalidCredentials';
    if (error.isRateLimited) return 'rateLimited';
    return 'generic';
  }
  if (error instanceof TypeError) return 'network';
  return 'generic';
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const session = await loginRequest({ email: input.email, password: input.password });
      if (input.rememberMe) {
        await saveCredentials({ email: input.email, password: input.password });
      } else {
        await clearCredentials();
      }
      prefs.setRememberMe(input.rememberMe);
      return session;
    },
    onSuccess: (session) => {
      setSession(session);
    },
    onError: () => {
      queryClient.clear();
    },
  });
}

export { classifyError as classifyLoginError };
