# PostCutz Repository Instructions

## Core checks

Before changing the app, review `README.md`, `lib/portal.ts`, the relevant API route, and the latest production deployment.

Run these checks for code changes:

```bash
npm install
npm run typecheck
npm run build
```

Never commit `.env` files, Supabase service-role keys, Paystack keys, or private poster originals.

## Poster image work

For any task involving new or replacement poster images, read and follow:

```text
skills/postcutz-poster-ingestion/SKILL.md
```

Use the batch manifest and importer for multiple posters. Always run the dry validation command before `--apply`. Existing slugs require explicit replacement approval.

The production portal uses:

- Table: `poster_portal_posters`
- Public preview bucket: `poster-previews`
- Private original bucket: `poster-originals`
- Live site: `https://postcutz-live.vercel.app`

Do not put private originals in `public/`, GitHub, a public Supabase bucket, or a public temporary host.

## Production behavior

- A poster unlock spends credits only once.
- Redownloads remain free.
- Archiving a poster must not remove access for users who already unlocked it.
- Paystack secrets remain server-side and live payments require explicit owner approval.
