'use client';
// S1 — Onboarding / login: phone-first OTP per the SRS (FR-ACC-01).
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const { sendOtp, verifyOtp } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('+256');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const request = async () => {
    setErr(''); setMsg(''); setBusy(true);
    try { await sendOtp(phone); setStep('otp'); setMsg('OTP sent. Check your messages.'); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    setErr(''); setBusy(true);
    try { await verifyOtp(code); router.push('/account'); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-sm space-y-4 py-8">
      <div className="text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-market-600 text-2xl text-white" aria-hidden>🛒</div>
        <h1 className="text-xl font-black">DeryMarket</h1>
        <p className="text-sm text-neutral-500">One account. Every way to trade.</p>
      </div>

      {step === 'phone' ? (
        <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
          <label className="text-sm font-semibold">Phone number</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="+256 7xx xxx xxx"
            className="w-full rounded-lg border border-neutral-300 p-2.5 text-lg" />
          <button onClick={request} disabled={busy || phone.length < 10}
            className="w-full rounded-full bg-market-600 py-3 font-bold text-white disabled:bg-neutral-300">
            {busy ? 'Sending…' : 'Send OTP'}
          </button>
          <p className="text-[11px] text-neutral-500">Emulator tip: with the auth emulator on, any phone number + any 6-digit code works in dev.</p>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
          <label className="text-sm font-semibold">Enter the 6-digit code sent to {phone}</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="••••••"
            className="w-full rounded-lg border border-neutral-300 p-2.5 text-center text-2xl tracking-[0.5em]" />
          <button onClick={verify} disabled={busy || code.length < 6}
            className="w-full rounded-full bg-market-600 py-3 font-bold text-white disabled:bg-neutral-300">
            {busy ? 'Verifying…' : 'Verify'}
          </button>
          <button onClick={() => setStep('phone')} className="w-full text-xs text-market-600 underline">Wrong number? Go back</button>
        </div>
      )}
      {msg && <p className="text-center text-sm font-semibold text-market-600">{msg}</p>}
      {err && <p className="rounded-lg bg-red-50 p-2 text-center text-sm text-red-600">{err}</p>}
      <div id="recaptcha-container" />
    </div>
  );
}
