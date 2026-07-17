"use client";

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";

export function ClientCreditForm({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/credits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId, amount: Number(form.get("amount")), reason: form.get("reason") }) });
    setBusy(false); if (response.ok) location.reload(); else alert((await response.json()).error || "Adjustment failed.");
  }
  return <form className="inline-credit-form" onSubmit={submit}><input name="amount" type="number" defaultValue="1" required /><input name="reason" placeholder="Reason" required /><button className="icon-button" disabled={busy} title="Apply adjustment"><Plus size={16} /></button></form>;
}
