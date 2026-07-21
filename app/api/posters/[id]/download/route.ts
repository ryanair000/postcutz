import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PORTAL } from "@/lib/portal";
import { safeFileName } from "@/lib/utils";

async function prepare(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required.", status: 401 } as const;

  const { data: unlock } = await supabase
    .from(PORTAL.unlocks)
    .select("id")
    .eq("user_id", user.id)
    .eq("poster_id", id)
    .maybeSingle();
  if (!unlock) return { error: "Unlock this poster before downloading it.", status: 403 } as const;

  const admin = createAdminClient();
  const { data: poster, error } = await admin
    .from(PORTAL.posters)
    .select("title, slug, original_path, file_name, mime_type")
    .eq("id", id)
    .single();

  if (error || !poster?.original_path) return { error: "The original file is not available yet.", status: 404 } as const;
  if (/^https?:\/\//i.test(poster.original_path)) {
    return { error: "The original file must be stored privately.", status: 500 } as const;
  }

  const fileName = safeFileName(poster.file_name || `${poster.slug}.jpg`);

  const { data: signed, error: signError } = await admin.storage
    .from(PORTAL.originalBucket)
    .createSignedUrl(poster.original_path, 120, { download: fileName });

  if (signError || !signed?.signedUrl) return { error: "Could not prepare the secure download.", status: 500 } as const;
  const { error: recordError } = await supabase.rpc("poster_portal_record_download", { p_poster_id: id });
  if (recordError) return { error: "Could not record the download.", status: 500 } as const;
  return { url: signed.signedUrl, fileName } as const;
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await prepare((await params).id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  if ("url" in result && result.url) {
    return NextResponse.json(
      { url: result.url, file_name: result.fileName },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }
  return NextResponse.json({ error: "Could not prepare the secure download." }, { status: 500 });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await prepare((await params).id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  if ("url" in result && result.url) {
    const response = NextResponse.redirect(result.url);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  return NextResponse.json({ error: "Could not prepare the secure download." }, { status: 500 });
}
