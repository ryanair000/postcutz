import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PORTAL } from "@/lib/portal";

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

  const { data: poster, error } = await supabase
    .from(PORTAL.posters)
    .select("title, slug, original_path, file_name, mime_type")
    .eq("id", id)
    .single();

  if (error || !poster?.original_path) return { error: "The original file is not available yet.", status: 404 } as const;
  await supabase.rpc("poster_portal_record_download", { p_poster_id: id });

  const fileName = poster.file_name || `${poster.slug}.jpg`;
  if (/^https?:\/\//i.test(poster.original_path)) {
    const remote = await fetch(poster.original_path, { cache: "no-store" });
    if (!remote.ok) return { error: "Could not retrieve the poster file.", status: 502 } as const;
    const bytes = await remote.arrayBuffer();
    return {
      bytes,
      fileName,
      contentType: remote.headers.get("content-type") || poster.mime_type || "image/jpeg"
    } as const;
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("poster-originals")
    .createSignedUrl(poster.original_path, 120, { download: fileName });

  if (signError || !signed?.signedUrl) return { error: "Could not prepare the secure download.", status: 500 } as const;
  return { url: signed.signedUrl, fileName } as const;
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await prepare((await params).id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  if ("url" in result && result.url) return NextResponse.json({ url: result.url, file_name: result.fileName });
  return new Response(result.bytes, {
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${result.fileName.replace(/"/g, "")}"`,
      "X-Download-Name": result.fileName,
      "Cache-Control": "private, no-store"
    }
  });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await prepare((await params).id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  if ("url" in result && result.url) return NextResponse.redirect(result.url);
  return new Response(result.bytes, {
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${result.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
