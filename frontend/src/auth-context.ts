import { createContext, useContext } from 'react';

export type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

export type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: false,
  setUser: () => undefined,
  logout: async () => undefined,
});

export function useAuth() {
  return useContext(AuthContext);
}
