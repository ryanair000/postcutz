import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { emailIsAdmin } from "@/lib/auth";

const schema = z.object({ user_id: z.string().uuid(), amount: z.number().int().min(-1000).max(1000).refine((value) => value !== 0), reason: z.string().min(2).max(200) });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !emailIsAdmin(user.email)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Check the adjustment details." }, { status: 400 });
  const { data, error } = await supabase.rpc("poster_portal_adjust_credits", { p_user_id: parsed.data.user_id, p_amount: parsed.data.amount, p_reason: parsed.data.reason });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, balance: data });
}
