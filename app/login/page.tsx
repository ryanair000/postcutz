"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, Images, LockKeyhole, WalletCards } from "lucide-react";
import { Brand } from "@/components/Brand";
import { createClient } from "@/lib/supabase/client";
import { JB_LOGIN_EMAIL } from "@/lib/portal";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: JB_LOGIN_EMAIL,
      password
    });

    setBusy(false);
    if (error) {
      setMessage("Incorrect password. Check it and try again.");
      return;
    }
    location.href = "/library";
  }

  return <main className="login-page password-only-login">
    <section className="login-brand-panel">
      <Brand />
      <div className="login-copy">
        <span className="pill">Private JBCutz portal</span>
        <h1>Your posters, ready when you are.</h1>
        <p>Preview every design, unlock the posters you need, and download them again at any time.</p>
        <ul>
          <li><Images size={18} /><span><strong>Preview first</strong><small>Browse every design before using a credit.</small></span></li>
          <li><WalletCards size={18} /><span><strong>10 free credits</strong><small>One credit permanently unlocks one poster.</small></span></li>
          <li><LockKeyhole size={18} /><span><strong>Private access</strong><small>Only the JBCutz password opens this library.</small></span></li>
        </ul>
      </div>
      <div className="login-footer">JBCutz • Lyric House, CBD</div>
    </section>

    <section className="login-form-panel">
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">JBCutz access</span>
        <h2>Enter your password</h2>
        <p>No email address or account creation is required.</p>
        <label>Password
          <div className="password-field">
            <input
              autoFocus
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              autoComplete="current-password"
              aria-describedby={message ? "login-error" : undefined}
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </label>
        {message && <div id="login-error" className="auth-message" role="alert">{message}</div>}
        <button className="button button-primary button-wide login-submit" disabled={busy}>
          {busy ? "Opening library…" : "Open poster library"}
          <ArrowRight size={19} />
        </button>
      </form>
    </section>
  </main>;
}
