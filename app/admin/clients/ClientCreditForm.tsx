"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

export function ClientCreditForm({ userId }: { userId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const amount = Number(form.get("amount"));
    const reason = String(form.get("reason") || "").trim();
    setBusy(true);
    try {
      const response = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, amount, reason })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Adjustment failed.");
      toast({ title: "Credits updated", description: `${amount > 0 ? "+" : ""}${amount} credits · ${reason}`, variant: "success" });
      formElement.reset();
      router.refresh();
    } catch (error) {
      toast({ title: "Credit adjustment failed", description: error instanceof Error ? error.message : "Please try again.", variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return <form className="inline-credit-form" onSubmit={submit}>
    <input name="amount" type="number" defaultValue="1" required inputMode="numeric" aria-label="Credit amount" />
    <input name="reason" placeholder="Reason" required aria-label="Adjustment reason" />
    <button type="submit" className="icon-button" disabled={busy} aria-label="Apply credit adjustment"><Plus size={16} /></button>
  </form>;
}
