import { NextResponse } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailIsAdmin } from "@/lib/auth";
import { PORTAL } from "@/lib/portal";
import { safeFileName, slugify } from "@/lib/utils";

export const runtime = "nodejs";

const metaSchema = z.object({ title: z.string().min(2).max(100), description: z.string().max(500).optional(), category: z.string().min(2).max(50), credit_cost: z.coerce.number().int().min(1).max(20), status: z.enum(["draft", "published"]) });

function orientedDimensions(metadata: sharp.Metadata) {
  const swapsAxes = metadata.orientation && metadata.orientation >= 5 && metadata.orientation <= 8;
  return {
    width: swapsAxes ? metadata.height : metadata.width,
    height: swapsAxes ? metadata.width : metadata.height
  };
}

async function createWatermarkedPreview(input: Buffer) {
  const resized = await sharp(input)
    .rotate()
    .resize({ width: 1080, height: 1080, fit: "inside", withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });
  const watermark = Buffer.from(`
    <svg width="${resized.info.width}" height="${resized.info.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="none"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
        fill="rgba(255,255,255,0.72)" stroke="rgba(0,0,0,0.36)" stroke-width="2"
        font-family="Arial, sans-serif" font-size="${Math.max(34, Math.round(resized.info.width / 12))}"
        font-weight="700" transform="rotate(-28 ${resized.info.width / 2} ${resized.info.height / 2})">
        JBCUTZ PREVIEW
      </text>
    </svg>`);
  return sharp(resized.data)
    .composite([{ input: watermark }])
    .webp({ quality: 76 })
    .toBuffer();
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !emailIsAdmin(user.email)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const form = await request.formData();
  const parsed = metaSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return NextResponse.json({ error: "Check the poster details." }, { status: 400 });
  const original = form.get("original");
  if (!(original instanceof File)) return NextResponse.json({ error: "A poster file is required." }, { status: 400 });
  if (original.size > 4_000_000) return NextResponse.json({ error: "The poster must be smaller than 4 MB." }, { status: 413 });
  const allowed = ["image/png", "image/jpeg", "image/webp"];
  if (!allowed.includes(original.type)) return NextResponse.json({ error: "Use a PNG, JPG or WebP file." }, { status: 400 });

  const originalBytes = Buffer.from(await original.arrayBuffer());
  let previewOutput: Buffer;
  let originalDimensions: { width: number | undefined; height: number | undefined };
  try {
    const [metadata, generatedPreview] = await Promise.all([
      sharp(originalBytes).metadata(),
      createWatermarkedPreview(originalBytes)
    ]);
    originalDimensions = orientedDimensions(metadata);
    previewOutput = generatedPreview;
  } catch {
    return NextResponse.json({ error: "One of the uploaded files is not a valid image." }, { status: 400 });
  }
  if (!originalDimensions.width || !originalDimensions.height || originalDimensions.width < 1080 || originalDimensions.height < 1080) {
    return NextResponse.json({ error: "The original must be at least 1080 by 1080 pixels." }, { status: 400 });
  }

  const admin = createAdminClient();
  const slug = `${slugify(parsed.data.title)}-${Date.now().toString(36)}`;
  const previewPath = `${slug}/preview.webp`;
  const originalPath = `${slug}/${safeFileName(original.name)}`;
  const [previewUpload, originalUpload] = await Promise.all([
    admin.storage.from(PORTAL.previewBucket).upload(previewPath, previewOutput, { contentType: "image/webp", upsert: false }),
    admin.storage.from(PORTAL.originalBucket).upload(originalPath, originalBytes, { contentType: original.type, upsert: false })
  ]);
  if (previewUpload.error || originalUpload.error) {
    if (!previewUpload.error) await admin.storage.from(PORTAL.previewBucket).remove([previewPath]);
    if (!originalUpload.error) await admin.storage.from(PORTAL.originalBucket).remove([originalPath]);
    return NextResponse.json({ error: previewUpload.error?.message || originalUpload.error?.message || "Upload failed." }, { status: 500 });
  }

  const { data, error } = await admin.from(PORTAL.posters).insert({
    title: parsed.data.title,
    slug,
    description: parsed.data.description || null,
    category: parsed.data.category,
    preview_path: previewPath,
    original_path: originalPath,
    source_type: "storage",
    file_name: original.name,
    mime_type: original.type,
    width: originalDimensions.width,
    height: originalDimensions.height,
    credit_cost: parsed.data.credit_cost,
    status: parsed.data.status,
    published_at: parsed.data.status === "published" ? new Date().toISOString() : null,
    created_by: user.id
  }).select().single();
  if (error) {
    await Promise.all([admin.storage.from(PORTAL.previewBucket).remove([previewPath]), admin.storage.from(PORTAL.originalBucket).remove([originalPath])]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ poster: data }, { status: 201 });
}
