import { getApp } from '@react-native-firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
} from '@react-native-firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type AuthStatus = 'signing-in' | 'signed-in' | 'error';

export type AuthState = {
  uid: string | null;
  status: AuthStatus;
  error: string | null;
};

const AuthContext = createContext<AuthState>({
  uid: null,
  status: 'signing-in',
  error: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    uid: null,
    status: 'signing-in',
    error: null,
  });

  useEffect(() => {
    const auth = getAuth(getApp());
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setState({ uid: user.uid, status: 'signed-in', error: null });
      }
    });
    signInAnonymously(auth).catch((e) => {
      const msg = e instanceof Error ? e.message : String(e);
      setState((s) => ({ ...s, status: 'error', error: msg }));
    });
    return unsub;
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
