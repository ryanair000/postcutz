import { NextResponse } from "next/server";
import { z } from "zod";
import { emailIsAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200)
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid email address and password." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address and password." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return NextResponse.json({ error: "Incorrect admin email or password." }, { status: 401 });
  }

  if (!emailIsAdmin(data.user.email)) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "This account does not have administrator access." }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
