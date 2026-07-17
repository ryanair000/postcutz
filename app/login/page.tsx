"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Images, LockKeyhole, WalletCards } from "lucide-react";
import { Brand } from "@/components/Brand";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage("");
    const supabase = createClient();
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    setBusy(false);
    if (result.error) return setMessage(result.error.message);
    if (mode === "signup" && !result.data.session) return setMessage("Check your email to confirm your account. Your 10 welcome credits will be ready after confirmation.");
    location.href = "/library";
  }

  return <main className="login-page">
    <section className="login-brand-panel">
      <Brand />
      <div className="login-copy">
        <span className="pill">Private client portal</span>
        <h1>Your JBCutz posters, ready when you are.</h1>
        <p>Preview every design, unlock the posters you need, and redownload them anytime.</p>
        <ul>
          <li><Images size={18} /><span><strong>Preview before you spend</strong><small>Browse every poster at no charge.</small></span></li>
          <li><WalletCards size={18} /><span><strong>10 welcome credits</strong><small>One credit unlocks one poster permanently.</small></span></li>
          <li><LockKeyhole size={18} /><span><strong>Secure downloads</strong><small>Original files stay private until unlocked.</small></span></li>
        </ul>
      </div>
      <div className="login-footer">Designed for JBCutz • Lyric House, CBD</div>
    </section>
    <section className="login-form-panel">
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">{mode === "login" ? "Welcome back" : "Create your account"}</span>
        <h2>{mode === "login" ? "Sign in to PostCutz" : "Claim your 10 free credits"}</h2>
        <p>{mode === "login" ? "Access your private poster library and downloads." : "Create your secure client account in a few seconds."}</p>
        <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required autoComplete="email" /></label>
        <label>Password<div className="password-field"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required autoComplete={mode === "login" ? "current-password" : "new-password"} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
        {message && <div className={`auth-message ${message.startsWith("Check") ? "success" : ""}`}>{message.startsWith("Check") && <CheckCircle2 size={17} />}{message}</div>}
        <button className="button button-primary button-wide" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}<ArrowRight size={18} /></button>
        <button type="button" className="text-button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}</button>
      </form>
    </section>
  </main>;
}
