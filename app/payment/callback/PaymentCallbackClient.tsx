"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";

export function PaymentCallbackClient({ reference }: { reference: string }) {
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your payment securely…");

  useEffect(() => {
    if (!reference) { setState("error"); setMessage("Payment reference is missing."); return; }
    fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`)
      .then(async (response) => ({ ok: response.ok, payload: await response.json() }))
      .then(({ ok, payload }) => {
        if (!ok) throw new Error(payload.error || "Payment verification failed.");
        setState("success"); setMessage(`${payload.credits} credits have been added to your wallet.`);
      })
      .catch((error) => { setState("error"); setMessage(error.message || "Payment verification failed."); });
  }, [reference]);

  return <main className="status-page"><section className="status-card">
    <div className={`status-icon ${state}`}>{state === "loading" ? <LoaderCircle className="spin" /> : state === "success" ? <CheckCircle2 /> : <XCircle />}</div>
    <span className="eyebrow">Payment status</span><h1>{state === "loading" ? "One moment…" : state === "success" ? "Credits added" : "Payment needs attention"}</h1><p>{message}</p>
    <div className="status-actions"><Link className="button button-primary" href={state === "success" ? "/library" : "/credits"}>{state === "success" ? "Browse posters" : "Return to credits"}</Link><Link className="button button-secondary" href="/downloads">My downloads</Link></div>
  </section></main>;
}
