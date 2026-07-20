"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, Images, LockKeyhole, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/Brand";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(payload.error || "Admin sign-in failed. Try again.");
        return;
      }

      window.location.href = "/admin";
    } catch {
      setMessage("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="login-page admin-login-page">
    <section className="login-brand-panel">
      <Brand />
      <div className="login-copy">
        <span className="pill">PostCutz administration</span>
        <h1>Manage the poster library securely.</h1>
        <p>This area is separate from the JBCutz client portal and is available only to approved administrator accounts.</p>
        <ul>
          <li><Images size={18} /><span><strong>Poster management</strong><small>Upload, publish, edit and archive poster files.</small></span></li>
          <li><ShieldCheck size={18} /><span><strong>Admin-only access</strong><small>Client credentials cannot open the dashboard.</small></span></li>
          <li><LockKeyhole size={18} /><span><strong>Protected operations</strong><small>Admin pages and APIs verify the account server-side.</small></span></li>
        </ul>
      </div>
      <div className="login-footer">PostCutz secure administration</div>
    </section>

    <section className="login-form-panel">
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">Administrator access</span>
        <h2>Admin sign in</h2>
        <p>Use an approved administrator email and its password.</p>

        <label>Email address
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            inputMode="email"
            required
          />
        </label>

        <label>Password
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              autoComplete="current-password"
              aria-describedby={message ? "admin-login-error" : undefined}
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </label>

        {message && <div id="admin-login-error" className="auth-message" role="alert">{message}</div>}

        <button className="button button-primary button-wide login-submit" disabled={busy}>
          {busy ? "Signing in…" : "Open admin dashboard"}
          <ArrowRight size={19} />
        </button>

        <Link className="text-button" href="/login">Go to client login</Link>
      </form>
    </section>
  </main>;
}
