'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const supabase = createClientComponentClient();
  const router = useRouter();
  const search = useSearchParams();
  const redirectTo = search.get('redirect') || '/';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo:
            typeof window !== 'undefined'
              ? `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`
              : undefined,
        },
      });
      if (error) throw error;
      setMsg('Magic link sent. Please check your email.');
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <main className="wrap">
        <section className="card">
          <div className="brand">
            <div className="logo">LP</div>
            <h1>Sign in</h1>
            <p className="muted">Access your Lead Pocket workspace</p>
          </div>

          <form onSubmit={onSubmit} className="form">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input"
              autoComplete="email"
            />

            <button type="submit" className="button primary" disabled={busy}>
              {busy ? 'Sending…' : 'Email me a magic link'}
            </button>
          </form>

          <div className="divider">
            <span>or</span>
          </div>

          <a href="/api/auth/signin" className="button ghost">
            Continue with NextAuth
          </a>

          {msg && <p className="note success">{msg}</p>}
          {err && <p className="note error">{err}</p>}

          <p className="fineprint">
            Trouble signing in? <a href="/">Go home</a>
          </p>
        </section>
      </main>

      <style jsx>{`
        :global(html, body) {
          height: 100%;
        }
        .wrap {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: #0b1020; /* dark background */
          color: #e5e7eb;
        }
        .card {
          width: 100%;
          max-width: 420px;
          padding: 24px;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.85); /* slate-900-ish with blur look */
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }
        .brand {
          text-align: center;
          margin-bottom: 16px;
        }
        .logo {
          width: 48px;
          height: 48px;
          margin: 0 auto 8px;
          border-radius: 12px;
          background: rgba(37, 99, 235, 0.15);
          color: #60a5fa;
          display: grid;
          place-items: center;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        h1 {
          margin: 0 0 4px;
          font-size: 22px;
          font-weight: 700;
          line-height: 1.2;
        }
        .muted {
          margin: 0;
          font-size: 13px;
          color: #94a3b8;
        }
        .form {
          display: grid;
          gap: 8px;
          margin-top: 16px;
        }
        .label {
          font-size: 13px;
          color: #cbd5e1;
        }
        .input {
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid #334155;
          background: #0f172a;
          color: #e5e7eb;
          outline: none;
          transition: box-shadow 0.15s ease, border-color 0.15s ease;
        }
        .input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
        }
        .button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 40px;
          padding: 0 14px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
        }
        .button[disabled] {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .primary {
          background: #2563eb;
          color: white;
        }
        .primary:hover {
          background: #1d4ed8;
        }
        .ghost {
          background: transparent;
          color: #e5e7eb;
          border-color: #334155;
          width: 100%;
        }
        .ghost:hover {
          background: #111827;
        }
        .divider {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 10px;
          margin: 14px 0;
          color: #94a3b8;
          font-size: 12px;
        }
        .divider::before,
        .divider::after {
          content: '';
          height: 1px;
          background: #334155;
          display: block;
        }
        .note {
          margin-top: 10px;
          font-size: 13px;
          line-height: 1.3;
        }
        .success {
          color: #86efac;
        }
        .error {
          color: #fca5a5;
        }
        .fineprint {
          margin: 16px 0 0;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
        }
        .fineprint a {
          color: #93c5fd;
        }
      `}</style>
    </>
  );
}
