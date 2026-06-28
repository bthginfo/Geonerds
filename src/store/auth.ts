import { create } from "zustand";
import { apiLogin, apiLogout, apiMe, apiSignup, type OnlineUser } from "@/lib/online";

interface AuthState {
  user: OnlineUser | null;
  configured: boolean;
  loaded: boolean;
  refresh: () => Promise<void>;
  login: (name: string, passcode: string) => Promise<string | null>;
  signup: (name: string, passcode: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  configured: false,
  loaded: false,
  refresh: async () => {
    const { configured, user } = await apiMe();
    set({ configured, user, loaded: true });
  },
  login: async (name, passcode) => {
    const { ok, data } = await apiLogin(name, passcode);
    if (ok) {
      set({ user: data.user });
      return null;
    }
    return (data as { error?: string }).error ?? "error";
  },
  signup: async (name, passcode) => {
    const { ok, data } = await apiSignup(name, passcode);
    if (ok) {
      set({ user: data.user });
      return null;
    }
    return (data as { error?: string }).error ?? "error";
  },
  logout: async () => {
    await apiLogout();
    set({ user: null });
  },
}));
