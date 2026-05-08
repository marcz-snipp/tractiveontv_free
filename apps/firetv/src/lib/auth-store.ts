import { create } from 'zustand';
import type { AuthSession } from '@tot/shared';

export type AuthStatus = 'booting' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  session: AuthSession | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
  setStatus: (status: AuthStatus) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'booting',
  session: null,
  setSession: (session) => set({ session, status: 'authenticated' }),
  clearSession: () => set({ session: null, status: 'unauthenticated' }),
  setStatus: (status) => set({ status }),
}));

export const selectSession = (state: AuthState): AuthSession | null => state.session;
export const selectStatus = (state: AuthState): AuthStatus => state.status;
