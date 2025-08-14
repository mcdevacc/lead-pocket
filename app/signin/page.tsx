'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const supabase = createClientComponentClient();
  const router = useRouter();
  const search = useSearchParams();
  const redirectTo = search.get('redirect') || '/';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push(redirectTo);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || 'Invalid email or password');
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
            <p className="muted">Use your email and password.</p>
          </div>

          <form onSubmit={onSubmit} className="form">
            <label className="label" htmlFor="email">Email</label>
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

            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input"
              autoComplete="current-password"
            />

            <button type="submit" className="button primary" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {err && <p className="note error">{err}</p>}

          <p className="fineprint">
            Don’t have an account? <a href="/signup">Create one</a>
          </p>
        </section>
      </main>

      <style jsx>{`
        :global(html, body) { height: 100%; }
        .wrap {
          min-height: 100vh; display: grid; place-items: center; padding: 24px;
          background: #0b1020; color: #e5e7eb;
        }
        .card {
          width: 100%; max-width: 420px; padding: 24px; border-radius: 16px;
          background: rgba(15,23,42,.85); box-shadow: 0 10px 30px rgba(0,0,0,.25);
          border: 1px solid rgba(255,255,255,.07);
        }
        .brand { text-align: center; margin-bottom: 16px; }
        .logo {
          width: 48px; height: 48px; margin: 0 auto 8px; border-radius: 12px;
          background: rgba(37,99,235,.15); color: #60a5fa;
          display: grid; place-items: center; font-weight: 700;
        }
        h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; line-height: 1.2; }
        .muted { margin: 0; font-size: 13px; color: #94a3b8; }
        .form { display: grid; gap: 10px; margin-top: 16px; }
        .label { font-size: 13px; color: #cbd5e1; }
        .input {
          padding: 10px 12px; border-radius: 10px; border: 1px solid #334155;
          background: #0f172a; color: #e5e7eb; outline: none;
          transition: box-shadow .15s, border-color .15s;
        }
        .input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.25); }
        .button {
          display: inline-flex; align-items: center; justify-content: center;
          height: 40px; padding: 0 14px; border-radius: 10px; font-weight: 600;
          font-size: 14px; border: 1px solid transparent; cursor: pointer;
          transition: background .15s, border-color .15s, opacity .15s; width: 100%;
        }
        .button[disabled] { opacity: .6; cursor: not-allowed; }
        .primary { background: #2563eb; color: white; }
        .primary:hover { background: #1d4ed8; }
        .note { margin-top: 12px; font-size: 13px; }
        .error { color: #fca5a5; }
        .fineprint { margin-top: 16px; text-align: center; font-size: 12px; color: #94a3b8; }
        .fineprint a { color: #93c5fd; }
      `}</style>
    </>
  );
}
