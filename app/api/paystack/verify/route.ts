import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fulfilPayment, verifyPaystackTransaction } from "@/lib/paystack";

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference");
  if (!reference) return NextResponse.json({ error: "Payment reference is missing." }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const admin = createAdminClient();
  const { data: payment } = await admin.from("postcutz_payments").select("*").eq("reference", reference).eq("user_id", user.id).single();
  if (!payment) return NextResponse.json({ error: "Payment was not found." }, { status: 404 });
  if (payment.status === "paid") return NextResponse.json({ ok: true, credits: payment.credits });
  const verified = await verifyPaystackTransaction(reference);
  if (verified.status !== "success" || verified.currency !== "KES") return NextResponse.json({ error: "Payment has not completed successfully." }, { status: 400 });
  await fulfilPayment({ reference, amountMinor: verified.amount, transactionId: String(verified.id) });
  return NextResponse.json({ ok: true, credits: payment.credits });
}
