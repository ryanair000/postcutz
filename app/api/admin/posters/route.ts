import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import sharp, { type Metadata } from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailIsAdmin } from "@/lib/auth";
import { PORTAL } from "@/lib/portal";
import { buildPosterWatermarkSvg } from "@/lib/poster-watermark";
import { safeFileName, slugify } from "@/lib/utils";

export const runtime = "nodejs";

const metaSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  category: z.string().min(2).max(50),
  credit_cost: z.coerce.number().int().min(1).max(20),
  status: z.enum(["draft", "published"])
});

function orientedDimensions(metadata: Metadata) {
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

  const width = resized.info.width;
  const height = resized.info.height;
  const watermark = buildPosterWatermarkSvg(width, height);

  return sharp(resized.data)
    .composite([{ input: watermark }])
    .webp({ quality: 80 })
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
    return NextResponse.json({ error: "The uploaded file is not a valid image." }, { status: 400 });
  }

  if (!originalDimensions.width || !originalDimensions.height || originalDimensions.width < 1080 || originalDimensions.height < 1080) {
    return NextResponse.json({ error: "The original must be at least 1080 by 1080 pixels." }, { status: 400 });
  }

  const admin = createAdminClient();
  const slug = `${slugify(parsed.data.title)}-${Date.now().toString(36)}`;
  const previewPath = `${slug}/preview.webp`;
  const cleanOriginalName = safeFileName(original.name);
  const originalPath = `${slug}/${cleanOriginalName}`;

  const [previewUpload, originalUpload] = await Promise.all([
    admin.storage.from(PORTAL.previewBucket).upload(previewPath, previewOutput, { contentType: "image/webp", upsert: false }),
    admin.storage.from(PORTAL.originalBucket).upload(originalPath, originalBytes, { contentType: original.type, upsert: false })
  ]);

  if (previewUpload.error || originalUpload.error) {
    if (!previewUpload.error) await admin.storage.from(PORTAL.previewBucket).remove([previewPath]);
    if (!originalUpload.error) await admin.storage.from(PORTAL.originalBucket).remove([originalPath]);
    return NextResponse.json({ error: previewUpload.error?.message || originalUpload.error?.message || "Upload failed." }, { status: 500 });
  }

  const isPublished = parsed.data.status === "published";
  const featured = form.get("featured") === "true" || form.get("featured") === "on";
  const { data, error } = await admin.from(PORTAL.posters).insert({
    title: parsed.data.title,
    slug,
    description: parsed.data.description || null,
    category: parsed.data.category,
    preview_path: previewPath,
    original_path: originalPath,
    source_type: "storage",
    file_name: cleanOriginalName,
    mime_type: original.type,
    width: originalDimensions.width,
    height: originalDimensions.height,
    credit_cost: parsed.data.credit_cost,
    status: parsed.data.status,
    featured,
    published_at: isPublished ? new Date().toISOString() : null,
    created_by: user.id
  }).select().single();

  if (error) {
    await Promise.all([
      admin.storage.from(PORTAL.previewBucket).remove([previewPath]),
      admin.storage.from(PORTAL.originalBucket).remove([originalPath])
    ]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: publicPreview } = admin.storage.from(PORTAL.previewBucket).getPublicUrl(previewPath);
  revalidatePath("/admin");
  revalidatePath("/admin/posters");
  revalidatePath("/library");

  return NextResponse.json({
    poster: {
      ...data,
      preview_url: publicPreview.publicUrl
    }
  }, { status: 201 });
}

