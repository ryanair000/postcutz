import { NextResponse } from "next/server";
import { fulfilPayment, verifyPaystackSignature } from "@/lib/paystack";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyPaystackSignature(rawBody, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }
  const event = JSON.parse(rawBody);
  if (event.event === "charge.success") {
    const data = event.data;
    await fulfilPayment({ reference: data.reference, amountMinor: data.amount, transactionId: String(data.id) });
  }
  return NextResponse.json({ received: true });
}
