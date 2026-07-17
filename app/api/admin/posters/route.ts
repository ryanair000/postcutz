import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailIsAdmin } from "@/lib/auth";
import { safeFileName, slugify } from "@/lib/utils";

export const runtime = "nodejs";

const metaSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  category: z.string().min(2).max(50),
  credit_cost: z.coerce.number().int().min(1).max(20),
  status: z.enum(["draft", "published"])
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !emailIsAdmin(user.email)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const form = await request.formData();
  const parsed = metaSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return NextResponse.json({ error: "Check the poster details." }, { status: 400 });
  const preview = form.get("preview");
  const original = form.get("original");
  if (!(preview instanceof File) || !(original instanceof File)) return NextResponse.json({ error: "Both poster files are required." }, { status: 400 });
  if (preview.size > 8_000_000 || original.size > 20_000_000) return NextResponse.json({ error: "Poster files are too large." }, { status: 413 });
  const allowed = ["image/png", "image/jpeg", "image/webp"];
  if (!allowed.includes(preview.type) || !allowed.includes(original.type)) return NextResponse.json({ error: "Use PNG, JPG or WebP files." }, { status: 400 });

  const admin = createAdminClient();
  const slug = `${slugify(parsed.data.title)}-${Date.now().toString(36)}`;
  const previewPath = `${slug}/preview-${safeFileName(preview.name)}`;
  const originalPath = `${slug}/${safeFileName(original.name)}`;
  const [previewUpload, originalUpload] = await Promise.all([
    admin.storage.from("postcutz-previews").upload(previewPath, Buffer.from(await preview.arrayBuffer()), { contentType: preview.type, upsert: false }),
    admin.storage.from("postcutz-originals").upload(originalPath, Buffer.from(await original.arrayBuffer()), { contentType: original.type, upsert: false })
  ]);
  if (previewUpload.error || originalUpload.error) {
    if (!previewUpload.error) await admin.storage.from("postcutz-previews").remove([previewPath]);
    if (!originalUpload.error) await admin.storage.from("postcutz-originals").remove([originalPath]);
    return NextResponse.json({ error: previewUpload.error?.message || originalUpload.error?.message || "Upload failed." }, { status: 500 });
  }

  const { data, error } = await admin.from("postcutz_posters").insert({
    title: parsed.data.title,
    slug,
    description: parsed.data.description || null,
    category: parsed.data.category,
    preview_path: previewPath,
    original_path: originalPath,
    file_name: original.name,
    mime_type: original.type,
    credit_cost: parsed.data.credit_cost,
    status: parsed.data.status,
    published_at: parsed.data.status === "published" ? new Date().toISOString() : null,
    created_by: user.id
  }).select().single();
  if (error) {
    await Promise.all([admin.storage.from("postcutz-previews").remove([previewPath]), admin.storage.from("postcutz-originals").remove([originalPath])]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ poster: data }, { status: 201 });
}
