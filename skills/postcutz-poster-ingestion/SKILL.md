---
name: postcutz-poster-ingestion
description: Safely add or replace JBCutz poster images in PostCutz using watermarked public previews, private originals, Supabase storage, validation, and production verification.
---

# PostCutz Poster Ingestion

Use this skill whenever the user provides one or more new poster images for the PostCutz website, asks to refresh existing poster artwork, or requests a repeatable poster-upload workflow.

## Goal

Turn a batch of original poster images into valid PostCutz records while preserving these rules:

- Originals stay private in the `poster-originals` Supabase bucket.
- Public previews are generated automatically, compressed to WebP, and marked `JBCUTZ PREVIEW`.
- The database table is `poster_portal_posters`.
- One poster normally costs one credit unless the user explicitly sets another value.
- Existing slugs are never replaced silently.
- New batches default to `draft` unless the user explicitly requests immediate publishing.
- Poster images and secrets are never committed to GitHub.

## Required inputs

For every image, collect or infer:

- Original image file
- Title
- Category
- Short description
- Credit cost, default `1`
- Status, default `draft`
- Featured status, default `false`
- Optional stable slug

When titles or categories are unclear, prepare a proposed manifest and ask only for the missing decisions. Do not invent promotional claims that are not visible in the image or supplied by the user.

## Image requirements

- Accepted formats: JPG, JPEG, PNG, WebP
- Maximum file size: 4 MB
- Minimum dimensions: 1080 × 1080 pixels
- Keep the highest-quality original provided by the user
- Do not stretch, crop, redraw, or alter the original unless the user explicitly requests an image edit

## Batch folder format

Create a temporary local folder that is ignored by Git:

```text
poster-batches/<batch-name>/
├── manifest.json
└── images/
    ├── first-poster.jpg
    └── second-poster.png
```

Create `manifest.json` using `poster-batches/manifest.example.json` as the template. Image paths must remain inside the batch folder.

## Workflow

1. Review the current `main` branch and live deployment before changing data.
2. Confirm the production database uses `poster_portal_posters`, `poster-previews`, and `poster-originals`.
3. Copy the user-provided images into a temporary ignored batch folder.
4. Prepare the manifest. Prefer stable, descriptive slugs.
5. Run the mandatory dry run:

```bash
npm run posters:validate -- --manifest poster-batches/<batch-name>/manifest.json
```

6. Fix every validation error before uploading. Never bypass size, format, dimension, or duplicate-slug checks.
7. Show the user the planned titles, categories, statuses, and replacement decisions.
8. Apply only after the batch is approved:

```bash
npm run posters:ingest -- --manifest poster-batches/<batch-name>/manifest.json
```

9. To replace existing slugs, require explicit approval and use:

```bash
npm run posters:ingest -- --manifest poster-batches/<batch-name>/manifest.json --replace
```

10. Verify the Supabase row count, poster metadata, public preview URLs, and private original object paths.
11. Verify the live library after deployment or revalidation. Check desktop and mobile presentation.
12. Report exactly which posters were added, replaced, left as drafts, or published.

## One-off upload alternative

For a single poster, the existing admin page at `/admin/posters/new` is acceptable. It already accepts one high-resolution original, creates a watermarked preview, uploads the original privately, and inserts the database row.

Use the batch importer for multiple images, repeatable updates, or work performed through Codex.

## Safety checks

Before completion, confirm:

- No original image exists in a public GitHub path.
- No service-role or Paystack secret appears in commits, logs, manifests, or chat output.
- Public previews load without authentication.
- Private originals do not have public URLs.
- Every new database row has the intended slug, category, credit cost, status, dimensions, and storage paths.
- Re-running without `--replace` cannot overwrite existing posters.
- Replacing a poster creates new storage objects before updating the row and cleans up older storage objects afterward.
- The live Vercel deployment has no new runtime errors.

## Completion report

Return a compact report containing:

- Batch name
- Added posters
- Replaced posters
- Draft posters
- Published posters
- Validation result
- Production deployment result
- Any item that still requires user approval
