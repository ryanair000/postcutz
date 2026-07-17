import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data, error } = await supabase.rpc("postcutz_unlock", { p_poster_id: id });
  if (error) {
    const status = error.message.includes("Insufficient") ? 402 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json(result);
}
