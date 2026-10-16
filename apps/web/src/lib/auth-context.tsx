'use client';
// S1 - phone-first identity via Firebase Auth (OTP), per the SRS.
import { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber, signOut, type User } from 'firebase/auth';
import { fbApp } from './firebase';

const auth = typeof window !== 'undefined' ? getAuth(fbApp()) : null;

type AuthCtx = {
  user: User | null;
  ready: boolean;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);
export const useAuth = () => useContext(Ctx);

let confirmation: { confirm: (code: string) => Promise<unknown> } | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => { setUser(u); setReady(true); });
  }, []);

  const sendOtp = async (phone: string) => {
    if (!auth) throw new Error('Auth unavailable');
    const recaptcha = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
    confirmation = await signInWithPhoneNumber(auth, phone, recaptcha);
  };

  const verifyOtp = async (code: string) => {
    if (!confirmation) throw new Error('Request an OTP first');
    await confirmation.confirm(code);
  };

  const logout = async () => { if (auth) await signOut(auth); };

  return <Ctx.Provider value={{ user, ready, sendOtp, verifyOtp, logout }}>{children}</Ctx.Provider>;
}
