import { NextResponse } from "next/server";
import { fulfilVerifiedPayment, verifyPaystackSignature, verifyPaystackTransaction } from "@/lib/paystack";

export async function POST(request: Request) {
  const rawBody = await request.text();
  let validSignature = false;
  try {
    validSignature = verifyPaystackSignature(rawBody, request.headers.get("x-paystack-signature"));
  } catch {
    return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
  }
  if (!validSignature) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }
  let event: { event?: string; data?: { reference?: unknown } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (event.event === "charge.success" && typeof event.data?.reference === "string") {
    const verified = await verifyPaystackTransaction(event.data.reference);
    if (verified.reference !== event.data.reference) {
      return NextResponse.json({ error: "Payment reference mismatch." }, { status: 400 });
    }
    await fulfilVerifiedPayment(verified);
  }
  return NextResponse.json({ received: true });
}
