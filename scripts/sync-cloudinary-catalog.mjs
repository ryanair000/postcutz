import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const POSTERS = [
  { slug: "brand-showcase", title: "JBCutz Brand Showcase", category: "Brand", description: "A complete JBCutz brand and style showcase.", source: "https://design.canva.ai/D-W_bg3Hb2cuj96", featured: true },
  { slug: "look-sharp-stay-fresh", title: "Look Sharp, Stay Fresh", category: "Services", description: "A complete services and grooming campaign poster.", source: "https://design.canva.ai/xNOqb6dpSzMbHEG", featured: true },
  { slug: "bold-colour-crop", title: "Bold Colour Crop", category: "Colour", description: "Fresh colour with a sharp finish.", source: "https://design.canva.ai/Gs2gfeJaza9xLMh", featured: false },
  { slug: "braids-beard", title: "Braids & Beard", category: "Braids", description: "Detailed braids and a sharp beard finish.", source: "https://design.canva.ai/nGJuxb4UEiXDOR9", featured: false },
  { slug: "cbd-convenience", title: "CBD Convenience", category: "Location", description: "Fresh cut, no stress in the CBD.", source: "https://design.canva.ai/GyPjf4ORO4t67rb", featured: false },
  { slug: "creative-cuts", title: "Creative Cuts", category: "Creative", description: "Styles that stand out.", source: "https://design.canva.ai/d49NJs0gg1mFHAy", featured: false },
  { slug: "jbcutz-experience", title: "The JBCutz Experience", category: "Brand", description: "Professional grooming with a personal touch.", source: "https://design.canva.ai/si68p_LkqP98ODo", featured: true },
  { slug: "open-till-2am", title: "Open Till 2 AM", category: "Opening Hours", description: "Late cuts and sharp results.", source: "https://design.canva.ai/b-VhLErCPU1HLvW", featured: true },
  { slug: "precision-fade", title: "Precision Fade", category: "Haircuts", description: "Clean lines done right.", source: "https://design.canva.ai/5SxQ-lgY7mfuXti", featured: false },
  { slug: "short-hair-big-confidence", title: "Short Hair, Big Confidence", category: "Haircuts", description: "Styled to stand out.", source: "https://design.canva.ai/5fIxaSsCMk9dYjt", featured: false },
  { slug: "signature-shape-up", title: "Signature Shape-Up", category: "Haircuts", description: "Sharp finish and clean confidence.", source: "https://design.canva.ai/GCi2BZbhJdElkys", featured: false },
  { slug: "statement-style", title: "Statement Style", category: "Creative", description: "Sharp design and bold personality.", source: "https://design.canva.ai/TTPtGoKeUcNWeff", featured: false },
  { slug: "textured-fade", title: "Textured Fade", category: "Haircuts", description: "Modern cut and a sharp profile.", source: "https://design.canva.ai/Z7Gc3TXNZVGKK9T", featured: false }
];

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function cloudinaryConfig() {
  const parsed = new URL(required("CLOUDINARY_URL"));
  return {
    apiKey: decodeURIComponent(parsed.username),
    apiSecret: decodeURIComponent(parsed.password),
    cloudName: parsed.hostname
  };
}

async function uploadPoster(source, slug) {
  const { apiKey, apiSecret, cloudName } = cloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = { folder: "postcutz/posters", overwrite: "true", public_id: slug, timestamp };
  const signatureBase = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const signature = createHash("sha1").update(`${signatureBase}${apiSecret}`).digest("hex");
  const form = new FormData();
  form.append("file", source);
  form.append("api_key", apiKey);
  form.append("timestamp", timestamp);
  form.append("folder", params.folder);
  form.append("overwrite", params.overwrite);
  form.append("public_id", params.public_id);
  form.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form
  });
  const payload = await response.json();
  if (!response.ok || !payload.secure_url) {
    throw new Error(payload.error?.message || `Cloudinary upload failed for ${slug}`);
  }
  return payload;
}

async function main() {
  if (process.env.VERCEL_ENV !== "production" && process.env.FORCE_CATALOG_SYNC !== "1") {
    console.log("PostCutz catalog sync skipped outside production.");
    return;
  }

  const supabase = createClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const results = [];
  for (const poster of POSTERS) {
    const uploaded = await uploadPoster(poster.source, poster.slug);
    const record = {
      title: poster.title,
      slug: poster.slug,
      category: poster.category,
      description: poster.description,
      preview_path: uploaded.secure_url,
      original_path: uploaded.secure_url,
      source_type: "storage",
      file_name: `${poster.slug}.${uploaded.format || "jpg"}`,
      mime_type: `image/${uploaded.format || "jpeg"}`,
      width: uploaded.width || null,
      height: uploaded.height || null,
      credit_cost: 1,
      status: "published",
      featured: poster.featured,
      published_at: new Date().toISOString()
    };
    const { error } = await supabase
      .from("poster_portal_posters")
      .upsert(record, { onConflict: "slug" });
    if (error) throw new Error(`${poster.slug}: ${error.message}`);
    results.push(poster.slug);
    console.log(`Synced poster: ${poster.slug}`);
  }

  const allowed = new Set(POSTERS.map((poster) => poster.slug));
  const { data: existing, error: existingError } = await supabase
    .from("poster_portal_posters")
    .select("id, slug")
    .eq("status", "published");
  if (existingError) throw existingError;

  for (const item of existing || []) {
    if (!allowed.has(item.slug)) {
      const { error } = await supabase
        .from("poster_portal_posters")
        .update({ status: "archived" })
        .eq("id", item.id);
      if (error) throw error;
    }
  }

  console.log(`PostCutz catalog sync complete: ${results.length} posters.`);
}

main().catch((error) => {
  console.error("PostCutz catalog sync failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
