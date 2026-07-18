import "server-only";
import crypto from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { PORTAL } from "@/lib/portal";

const PAYSTACK_API = "https://api.paystack.co";

function getSecret() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const testKey = secret?.startsWith("sk_test_");
  const approvedLiveKey = secret?.startsWith("sk_live_") && process.env.PAYSTACK_LIVE_ENABLED === "true";
  if (!secret || (!testKey && !approvedLiveKey)) throw new Error("Paystack is not configured correctly.");
  return secret;
}

const transactionSchema = z.object({
  status: z.string(),
  amount: z.number().int().positive(),
  reference: z.string().min(1),
  id: z.union([z.number(), z.string()]),
  currency: z.string()
});

export type PaystackTransaction = z.infer<typeof transactionSchema>;

export async function initializePaystackTransaction(input: {
  email: string;
  amountMinor: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}) {
  const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getSecret()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountMinor,
      currency: "KES",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
      channels: ["mobile_money", "card"]
    }),
    cache: "no-store"
  });
  const payload = await response.json();
  if (!response.ok || !payload.status) throw new Error(payload.message || "Could not start Paystack checkout.");
  return payload.data as { authorization_url: string; access_code: string; reference: string };
}

export async function verifyPaystackTransaction(reference: string) {
  const response = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${getSecret()}` },
    cache: "no-store"
  });
  const payload = await response.json();
  if (!response.ok || !payload.status) throw new Error(payload.message || "Could not verify payment.");
  return transactionSchema.parse(payload.data);
}

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const digest = crypto.createHmac("sha512", getSecret()).update(rawBody).digest("hex");
  if (digest.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function fulfilPayment(input: { reference: string; amountMinor: number; transactionId: string }) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("poster_portal_fulfil_payment_service", {
    p_reference: input.reference,
    p_amount_minor: input.amountMinor,
    p_transaction_id: input.transactionId
  });
  if (error) throw error;
  return data;
}

export async function fulfilVerifiedPayment(transaction: PaystackTransaction) {
  if (transaction.status !== "success" || transaction.currency !== "KES") {
    throw new Error("Payment has not completed successfully.");
  }

  const admin = createAdminClient();
  const { data: payment, error } = await admin
    .from(PORTAL.payments)
    .select("reference, amount_minor, credits, status")
    .eq("reference", transaction.reference)
    .single();

  if (error || !payment) throw new Error("Payment was not found.");
  if (Number(transaction.amount) !== Number(payment.amount_minor)) {
    throw new Error("Payment amount does not match the selected package.");
  }
  if (payment.status === "paid") return { fulfilled: false, credits: Number(payment.credits) };

  const result = await fulfilPayment({
    reference: transaction.reference,
    amountMinor: transaction.amount,
    transactionId: String(transaction.id)
  });
  return { fulfilled: true, credits: Number(payment.credits), result };
}
