"use client";

import { useState } from "react";
import { Check, CreditCard, LoaderCircle, Smartphone } from "lucide-react";
import type { CreditPackage } from "@/lib/types";
import { formatKes } from "@/lib/utils";

export function CreditPackages({ packages, balance }: { packages: CreditPackage[]; balance: number }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function checkout(packageId: string) {
    setBusy(packageId); setError("");
    try {
      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: packageId })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not start checkout.");
      location.href = payload.authorization_url;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not start checkout.");
      setBusy(null);
    }
  }

  return <main className="content-page">
    <section className="credits-hero"><div><span className="eyebrow">Credit wallet</span><h1>Top up when you need more.</h1><p>One credit unlocks one poster permanently. Credits never expire.</p></div><div className="balance-orb"><small>Your balance</small><strong>{balance}</strong><span>credits</span></div></section>
    {error && <div className="notice error">{error}</div>}
    <section className="package-grid">{packages.map((pkg, index) => <article className={`package-card ${index === 2 ? "recommended" : ""}`} key={pkg.id}>
      {index === 2 && <span className="package-ribbon">Most popular</span>}
      <small>{pkg.name}</small><strong>{pkg.credits}</strong><span>credits</span><h3>{formatKes(pkg.amount_kes)}</h3><p>KSh 100 per poster unlock</p>
      <ul><li><Check size={16} /> Credits never expire</li><li><Check size={16} /> Permanent poster access</li><li><Check size={16} /> Free redownloads</li></ul>
      <button className="button button-primary button-wide" onClick={() => checkout(pkg.id)} disabled={Boolean(busy)}>{busy === pkg.id ? <LoaderCircle className="spin" size={18} /> : <CreditCard size={18} />} {busy === pkg.id ? "Opening Paystack…" : "Buy credits"}</button>
    </article>)}</section>
    <section className="payment-trust"><Smartphone size={22} /><div><strong>Pay securely with Paystack</strong><p>M-PESA and card payments are supported. Credits are added automatically after successful verification.</p></div></section>
  </main>;
}
