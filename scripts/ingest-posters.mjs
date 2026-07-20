#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, relative, resolve } from "node:path";
import process from "node:process";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const TABLE = "poster_portal_posters";
const PREVIEW_BUCKET = "poster-previews";
const ORIGINAL_BUCKET = "poster-originals";
const MAX_FILE_BYTES = 4_000_000;
const MIN_DIMENSION = 1080;
const ALLOWED_EXTENSIONS = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"]
]);

function usage() {
  console.log(`PostCutz poster batch importer

Usage:
  npm run posters:validate -- --manifest poster-batches/<batch>/manifest.json
  npm run posters:ingest -- --manifest poster-batches/<batch>/manifest.json [--replace]

Options:
  --manifest <path>  Required manifest JSON path.
  --apply            Perform uploads and database writes. Added automatically by posters:ingest.
  --replace          Replace an existing poster with the same slug.
  --help             Show this help.

The default mode is a dry run. Originals are never committed to GitHub.`);
}

function parseArgs(argv) {
  const parsed = { manifest: "", apply: false, replace: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--manifest") parsed.manifest = argv[++index] || "";
    else if (value === "--apply") parsed.apply = true;
    else if (value === "--replace") parsed.replace = true;
    else if (value === "--help" || value === "-h") parsed.help = true;
    else throw new Error(`Unknown argument: ${value}`);
  }
  return parsed;
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanFileName(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function orientedDimensions(metadata) {
  const swapsAxes = metadata.orientation && metadata.orientation >= 5 && metadata.orientation <= 8;
  return {
    width: swapsAxes ? metadata.height : metadata.width,
    height: swapsAxes ? metadata.width : metadata.height
  };
}

async function createWatermarkedPreview(input) {
  const resized = await sharp(input)
    .rotate()
    .resize({ width: 1080, height: 1080, fit: "inside", withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });

  const fontSize = Math.max(34, Math.round(resized.info.width / 12));
  const watermark = Buffer.from(`
    <svg width="${resized.info.width}" height="${resized.info.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="none"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
        fill="rgba(255,255,255,0.72)" stroke="rgba(0,0,0,0.36)" stroke-width="2"
        font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700"
        transform="rotate(-28 ${resized.info.width / 2} ${resized.info.height / 2})">
        JBCUTZ PREVIEW
      </text>
    </svg>`);

  return sharp(resized.data)
    .composite([{ input: watermark }])
    .webp({ quality: 76 })
    .toBuffer();
}

function requireString(value, label, index) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Poster ${index + 1}: ${label} is required.`);
  }
  return value.trim();
}

function validateStatus(value, index) {
  if (value !== "draft" && value !== "published") {
    throw new Error(`Poster ${index + 1}: status must be draft or published.`);
  }
  return value;
}

async function preparePoster(entry, defaults, manifestDirectory, index) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error(`Poster ${index + 1}: each poster must be an object.`);
  }

  const title = requireString(entry.title, "title", index);
  const file = requireString(entry.file, "file", index);
  const sourcePath = resolve(manifestDirectory, file);
  const relativePath = relative(manifestDirectory, sourcePath);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`Poster ${index + 1}: image files must stay inside the batch folder.`);
  }

  const extension = extname(sourcePath).toLowerCase();
  const mimeType = ALLOWED_EXTENSIONS.get(extension);
  if (!mimeType) throw new Error(`Poster ${index + 1}: use JPG, PNG or WebP.`);

  const info = await stat(sourcePath).catch(() => null);
  if (!info?.isFile()) throw new Error(`Poster ${index + 1}: file not found: ${file}`);
  if (info.size > MAX_FILE_BYTES) throw new Error(`Poster ${index + 1}: file exceeds 4 MB.`);

  const originalBytes = await readFile(sourcePath);
  let metadata;
  try {
    metadata = await sharp(originalBytes).metadata();
  } catch {
    throw new Error(`Poster ${index + 1}: file is not a valid image.`);
  }
  const dimensions = orientedDimensions(metadata);
  if (!dimensions.width || !dimensions.height || dimensions.width < MIN_DIMENSION || dimensions.height < MIN_DIMENSION) {
    throw new Error(`Poster ${index + 1}: image must be at least 1080×1080 pixels.`);
  }

  const slug = slugify(entry.slug || title);
  if (!slug) throw new Error(`Poster ${index + 1}: could not generate a valid slug.`);

  const creditCost = Number(entry.credit_cost ?? defaults.credit_cost ?? 1);
  if (!Number.isInteger(creditCost) || creditCost < 1 || creditCost > 20) {
    throw new Error(`Poster ${index + 1}: credit_cost must be an integer from 1 to 20.`);
  }

  const status = validateStatus(entry.status ?? defaults.status ?? "draft", index);
  const category = requireString(entry.category ?? defaults.category ?? "Brand", "category", index);
  const description = typeof entry.description === "string" ? entry.description.trim() : "";
  if (description.length > 500) throw new Error(`Poster ${index + 1}: description exceeds 500 characters.`);

  return {
    title,
    slug,
    description: description || null,
    category,
    creditCost,
    status,
    featured: Boolean(entry.featured ?? defaults.featured ?? false),
    sourcePath,
    sourceFileName: basename(sourcePath),
    extension,
    mimeType,
    width: dimensions.width,
    height: dimensions.height,
    originalBytes
  };
}

function makeVersion() {
  return `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
}

function isStoragePath(value) {
  return typeof value === "string" && value.length > 0 && !value.startsWith("http://") && !value.startsWith("https://") && !value.startsWith("/");
}

async function removeOldStorage(admin, existing, nextPreviewPath, nextOriginalPath) {
  const tasks = [];
  if (isStoragePath(existing?.preview_path) && existing.preview_path !== nextPreviewPath) {
    tasks.push(admin.storage.from(PREVIEW_BUCKET).remove([existing.preview_path]));
  }
  if (isStoragePath(existing?.original_path) && existing.original_path !== nextOriginalPath) {
    tasks.push(admin.storage.from(ORIGINAL_BUCKET).remove([existing.original_path]));
  }
  if (tasks.length) await Promise.allSettled(tasks);
}

async function uploadPoster(admin, poster, existing) {
  const version = makeVersion();
  const previewPath = `${poster.slug}/${version}-preview.webp`;
  const originalPath = `${poster.slug}/${version}-original${poster.extension}`;
  const previewBytes = await createWatermarkedPreview(poster.originalBytes);

  const previewUpload = await admin.storage.from(PREVIEW_BUCKET).upload(previewPath, previewBytes, {
    contentType: "image/webp",
    upsert: false
  });
  if (previewUpload.error) throw new Error(`${poster.slug}: ${previewUpload.error.message}`);

  const originalUpload = await admin.storage.from(ORIGINAL_BUCKET).upload(originalPath, poster.originalBytes, {
    contentType: poster.mimeType,
    upsert: false
  });
  if (originalUpload.error) {
    await admin.storage.from(PREVIEW_BUCKET).remove([previewPath]);
    throw new Error(`${poster.slug}: ${originalUpload.error.message}`);
  }

  const now = new Date().toISOString();
  const record = {
    title: poster.title,
    slug: poster.slug,
    description: poster.description,
    category: poster.category,
    preview_path: previewPath,
    original_path: originalPath,
    source_type: "storage",
    file_name: cleanFileName(poster.sourceFileName),
    mime_type: poster.mimeType,
    width: poster.width,
    height: poster.height,
    credit_cost: poster.creditCost,
    status: poster.status,
    featured: poster.featured,
    published_at: poster.status === "published" ? now : null
  };

  const result = existing
    ? await admin.from(TABLE).update(record).eq("id", existing.id).select("id, slug").single()
    : await admin.from(TABLE).insert(record).select("id, slug").single();

  if (result.error) {
    await Promise.allSettled([
      admin.storage.from(PREVIEW_BUCKET).remove([previewPath]),
      admin.storage.from(ORIGINAL_BUCKET).remove([originalPath])
    ]);
    throw new Error(`${poster.slug}: ${result.error.message}`);
  }

  await removeOldStorage(admin, existing, previewPath, originalPath);
  return result.data;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  if (!args.manifest) throw new Error("--manifest is required.");

  const manifestPath = resolve(args.manifest);
  const manifestDirectory = dirname(manifestPath);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!manifest || typeof manifest !== "object" || !Array.isArray(manifest.posters) || manifest.posters.length === 0) {
    throw new Error("Manifest must contain a non-empty posters array.");
  }

  const defaults = manifest.defaults && typeof manifest.defaults === "object" ? manifest.defaults : {};
  const posters = [];
  const seenSlugs = new Set();
  for (let index = 0; index < manifest.posters.length; index += 1) {
    const poster = await preparePoster(manifest.posters[index], defaults, manifestDirectory, index);
    if (seenSlugs.has(poster.slug)) throw new Error(`Duplicate slug in manifest: ${poster.slug}`);
    seenSlugs.add(poster.slug);
    posters.push(poster);
  }

  console.table(posters.map((poster) => ({
    slug: poster.slug,
    title: poster.title,
    category: poster.category,
    status: poster.status,
    credits: poster.creditCost,
    dimensions: `${poster.width}×${poster.height}`,
    file: poster.sourceFileName
  })));

  if (!args.apply) {
    console.log(`Dry run passed for ${posters.length} poster${posters.length === 1 ? "" : "s"}. No files or database rows were changed.`);
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --apply.");
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: existingRows, error: lookupError } = await admin
    .from(TABLE)
    .select("id, slug, preview_path, original_path")
    .in("slug", posters.map((poster) => poster.slug));
  if (lookupError) throw lookupError;

  const existingBySlug = new Map((existingRows || []).map((row) => [row.slug, row]));
  const collisions = posters.filter((poster) => existingBySlug.has(poster.slug));
  if (collisions.length && !args.replace) {
    throw new Error(`Existing slug${collisions.length === 1 ? "" : "s"}: ${collisions.map((poster) => poster.slug).join(", ")}. Re-run with --replace only after confirming replacement.`);
  }

  let completed = 0;
  for (const poster of posters) {
    const existing = existingBySlug.get(poster.slug);
    await uploadPoster(admin, poster, existing);
    completed += 1;
    console.log(`${existing ? "Replaced" : "Added"}: ${poster.slug}`);
  }
  console.log(`PostCutz ingestion complete: ${completed}/${posters.length} posters.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
