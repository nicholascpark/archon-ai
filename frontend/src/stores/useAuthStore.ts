import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import api from "@/lib/api";

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  setToken: (token: string) => void;
  clearError: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: false,
      error: null,
      _hasHydrated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.login(email, password) as { access_token: string };
          set({ token: response.access_token, isLoading: false });
          await get().fetchUser();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Login failed",
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (email: string, username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          await api.register(email, username, password);
          // After registration, login automatically
          await get().login(email, password);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Registration failed",
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        set({ token: null, user: null, error: null });
      },

      fetchUser: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const user = await api.getMe(token) as User;
          set({ user });
        } catch (error) {
          console.error("Failed to fetch user:", error);
          // Don't clear token on fetch error - might just be network issue
          // Token will be cleared on logout or 401 response
        }
      },

      setToken: (token: string) => {
        set({ token });
      },

      clearError: () => {
        set({ error: null });
      },

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ token: state.token }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
