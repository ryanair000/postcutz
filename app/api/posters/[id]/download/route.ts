import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function prepare(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required.", status: 401 } as const;
  const { data: unlock } = await supabase.from("postcutz_unlocks").select("id").eq("user_id", user.id).eq("poster_id", id).maybeSingle();
  if (!unlock) return { error: "Unlock this poster before downloading it.", status: 403 } as const;
  const admin = createAdminClient();
  const { data: poster, error } = await admin.from("postcutz_posters").select("title, slug, original_path, file_name").eq("id", id).single();
  if (error || !poster?.original_path) return { error: "The original file is not available yet.", status: 404 } as const;
  const { data: signed, error: signError } = await admin.storage.from("postcutz-originals").createSignedUrl(poster.original_path, 120, { download: poster.file_name || `${poster.slug}.png` });
  if (signError || !signed?.signedUrl) return { error: "Could not prepare the secure download.", status: 500 } as const;
  await supabase.rpc("postcutz_record_download", { p_poster_id: id });
  return { url: signed.signedUrl, file_name: poster.file_name || `${poster.slug}.png` } as const;
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await prepare((await params).id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const result = await prepare((await context.params).id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.redirect(result.url);
}
