# PostCutz

Private JBCutz poster-credit portal.

## Production access

The client uses a single password-only login at `/login`. The hidden Supabase client account is created by the deployment administrator and receives 10 welcome credits. Email registration is intentionally disabled in the user interface.

Administrators sign in separately at `/admin-login` with an approved email in `ADMIN_EMAILS`. The fixed JBCutz client account is explicitly blocked from administrator authorization, and the client portal does not display admin navigation.

## Features

- Password-only JBCutz login
- Separate administrator login and protected admin routes
- 10 welcome credits
- Free watermarked previews
- One-credit permanent poster unlocks
- Secure downloads and free redownloads
- Paystack M-PESA/card credit purchases
- Admin poster, client, credit and payment management
- Responsive mobile bottom navigation and large touch targets
- Reusable validated batch poster ingestion

## Environment

Configure these values in Vercel without committing them:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYSTACK_SECRET_KEY`
- `ADMIN_EMAILS`
- `NEXT_PUBLIC_SITE_URL`

The production URLs are `https://postcutz-live.vercel.app` and `https://postcutz.jengasites.com`.

`PAYSTACK_SECRET_KEY` must remain a test key until the owner explicitly approves live payments.
Set `PAYSTACK_LIVE_ENABLED=true` only alongside that approval. The webhook endpoint is
`https://postcutz-live.vercel.app/api/paystack/webhook`.

The repository contains normal readable source and has no build-time archive extraction step.
Admin poster uploads keep originals in the private `poster-originals` bucket and generate a
compressed, watermarked WebP preview for the public `poster-previews` bucket. Originals must be
at least 1080 by 1080 pixels and no larger than 4 MB.

## Add one poster

Use the authenticated admin page:

```text
/admin/posters/new
```

Upload one JPG, PNG or WebP original. The server validates its dimensions and size, generates the watermarked preview, uploads the original privately, and creates the poster record.

## Add a batch of posters

The reusable playbook is:

```text
skills/postcutz-poster-ingestion/SKILL.md
```

Copy `poster-batches/manifest.example.json` into a temporary batch folder and place the images under that same folder. Batch media is ignored by Git.

Validate before writing anything:

```bash
npm run posters:validate -- --manifest poster-batches/<batch-name>/manifest.json
```

Apply an approved batch using server-side Supabase credentials:

```bash
npm run posters:ingest -- --manifest poster-batches/<batch-name>/manifest.json
```

Existing slugs are protected. Replacement requires explicit confirmation and the `--replace` flag:

```bash
npm run posters:ingest -- --manifest poster-batches/<batch-name>/manifest.json --replace
```

The importer validates every image before uploading, creates a watermarked public preview, stores the original privately, inserts or updates `poster_portal_posters`, and cleans up superseded storage objects after a successful replacement.

## Development checks

```bash
npm install
npm run typecheck
npm run build
```
