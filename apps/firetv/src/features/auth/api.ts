import { apiFetch } from '@/lib/api-client';
import type { AuthSession } from '@tot/shared';

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  userId: string;
  accessToken: string;
  expiresAt: number;
}

export async function loginRequest(payload: LoginPayload): Promise<AuthSession> {
  const data = await apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: payload,
  });
  return {
    userId: data.userId,
    accessToken: data.accessToken,
    expiresAt: data.expiresAt,
  };
}
