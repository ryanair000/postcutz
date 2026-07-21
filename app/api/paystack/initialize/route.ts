import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { initializePaystackTransaction } from "@/lib/paystack";
import { PORTAL } from "@/lib/portal";
import { currentPackageAmountKes } from "@/lib/pricing";

const schema = z.object({ package_id: z.string().uuid() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Select a valid credit package." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Sign in again before paying." }, { status: 401 });

  const admin = createAdminClient();
  const { data: pkg } = await admin.from(PORTAL.packages).select("*").eq("id", parsed.data.package_id).eq("active", true).single();
  if (!pkg) return NextResponse.json({ error: "Credit package was not found." }, { status: 404 });

  const reference = `PC-${Date.now()}-${crypto.randomBytes(5).toString("hex")}`;
  const amountMinor = currentPackageAmountKes(pkg.amount_kes) * 100;
  const { error: paymentError } = await admin.from(PORTAL.payments).insert({
    user_id: user.id,
    reference,
    amount_minor: amountMinor,
    credits: pkg.credits,
    status: "pending"
  });
  if (paymentError) return NextResponse.json({ error: "Could not create payment record." }, { status: 500 });

  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const checkout = await initializePaystackTransaction({
      email: user.email,
      amountMinor,
      reference,
      callbackUrl: `${origin.replace(/\/$/, "")}/payment/callback?reference=${encodeURIComponent(reference)}`,
      metadata: { user_id: user.id, credits: pkg.credits, product: "PostCutz credits" }
    });
    return NextResponse.json({ authorization_url: checkout.authorization_url, reference });
  } catch (error) {
    await admin.from(PORTAL.payments).update({ status: "failed" }).eq("reference", reference);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not start payment." }, { status: 503 });
  }
}
