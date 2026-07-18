import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { data, error } = await supabase.rpc("poster_portal_unlock", { p_poster_id: id });
  if (error) {
    const message = error.message.includes("insufficient") ? "You need more credits to unlock this poster." : error.message;
    return NextResponse.json({ error: message }, { status: error.message.includes("insufficient") ? 402 : 400 });
  }
  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json(result || { already_unlocked: false, balance: 0 });
}
