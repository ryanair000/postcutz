import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const PAYSTACK_API = "https://api.paystack.co";

function getSecret() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("Paystack is not configured.");
  return secret;
}

export async function initializePaystackTransaction(input: {
  email: string;
  amountMinor: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}) {
  const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecret()}`,
      "Content-Type": "application/json"
    },
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
  return payload.data as {
    status: string;
    amount: number;
    reference: string;
    id: number;
    currency: string;
  };
}

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const digest = crypto.createHmac("sha512", getSecret()).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function fulfilPayment(input: {
  reference: string;
  amountMinor: number;
  transactionId: string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("postcutz_fulfil_payment", {
    p_reference: input.reference,
    p_amount_minor: input.amountMinor,
    p_transaction_id: input.transactionId
  });
  if (error) throw error;
  return data;
}
