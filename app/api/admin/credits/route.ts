import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailIsAdmin } from "@/lib/auth";

const schema = z.object({ user_id: z.string().uuid(), amount: z.number().int().min(-1000).max(1000).refine((value) => value !== 0), reason: z.string().min(2).max(200) });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !emailIsAdmin(user.email)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Check the adjustment details." }, { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin.from("postcutz_credit_ledger").insert({ user_id: parsed.data.user_id, amount: parsed.data.amount, source: "admin_adjustment", reference: crypto.randomUUID(), note: parsed.data.reason, created_by: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
