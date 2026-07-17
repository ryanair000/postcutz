import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailIsAdmin } from "@/lib/auth";

const schema = z.object({ status: z.enum(["draft", "published", "archived"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !emailIsAdmin(user.email)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid poster status." }, { status: 400 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("postcutz_posters").update({ status: parsed.data.status, published_at: parsed.data.status === "published" ? new Date().toISOString() : null }).eq("id", (await params).id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ poster: data });
}
