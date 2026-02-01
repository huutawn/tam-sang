import { create } from 'zustand';
import { UserPayload } from '@/lib/auth-utils';

interface AuthState {
  user: UserPayload | null;
  isAuthenticated: boolean;
  setUser: (user: UserPayload | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
