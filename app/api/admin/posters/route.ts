import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailIsAdmin } from "@/lib/auth";
import { PORTAL } from "@/lib/portal";
import { safeFileName, slugify } from "@/lib/utils";

export const runtime = "nodejs";

const metaSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  category: z.string().min(2).max(50),
  credit_cost: z.coerce.number().int().min(1).max(20),
  status: z.enum(["draft", "published"])
});

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

  const width = resized.info.width;
  const height = resized.info.height;
  const fontSize = Math.max(30, Math.round(width / 19));
  const rows = [0.04, 0.24, 0.44, 0.64, 0.84, 1.04];
  const columns = [0.04, 0.5, 0.96];
  const repeatedMarks = rows.flatMap((row) => columns.map((column) =>
    `<text x="${Math.round(width * column)}" y="${Math.round(height * row)}" text-anchor="middle" dominant-baseline="middle">POSTCUTZ PREVIEW</text>`
  )).join("");
  const centerFontSize = Math.max(30, Math.round(width / 24));
  const footerHeight = Math.max(64, Math.round(height * 0.075));

  const watermark = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <g fill="rgba(255,255,255,0.50)" stroke="rgba(0,0,0,0.75)" stroke-width="2.4"
        paint-order="stroke" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="900"
        transform="rotate(-28 ${width / 2} ${height / 2})">
        ${repeatedMarks}
      </g>
      <rect x="${Math.round(width * 0.17)}" y="${Math.round(height * 0.44)}"
        width="${Math.round(width * 0.66)}" height="${Math.round(height * 0.12)}"
        rx="${Math.max(14, Math.round(height * 0.025))}" fill="rgba(16,17,15,0.80)"
        stroke="rgba(255,255,255,0.72)" stroke-width="2"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
        fill="#ffffff" font-family="Arial, sans-serif" font-size="${centerFontSize}"
        font-weight="900" letter-spacing="3">POSTCUTZ PREVIEW</text>
      <rect x="0" y="${Math.max(0, height - footerHeight)}" width="${width}" height="${footerHeight}"
        fill="rgba(16,17,15,0.94)"/>
      <text x="24" y="${height - Math.round(footerHeight * 0.36)}" fill="#ffffff"
        font-family="Arial, sans-serif" font-size="20" font-weight="900" letter-spacing="1.4">
        PREVIEW ONLY · UNLOCK TO DOWNLOAD
      </text>
      <circle cx="${width - 40}" cy="${height - footerHeight / 2}" r="20" fill="#d9ff42"/>
      <text x="${width - 40}" y="${height - footerHeight / 2 + 6}" text-anchor="middle"
        fill="#10110f" font-family="Arial, sans-serif" font-size="16" font-weight="900">JB</text>
    </svg>`);

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