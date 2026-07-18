# PostCutz

Private JBCutz poster-credit portal.

## Production access

The client uses a single password-only login. The hidden Supabase account is created by the deployment administrator and receives 10 welcome credits. Email registration is intentionally disabled in the user interface.

## Features

- Password-only JBCutz login
- 10 welcome credits
- Free watermarked previews
- One-credit permanent poster unlocks
- Secure downloads and free redownloads
- Paystack M-PESA/card credit purchases
- Admin poster, client, credit and payment management
- Responsive mobile bottom navigation and large touch targets

## Environment

Configure these values in Vercel without committing them:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYSTACK_SECRET_KEY`
- `ADMIN_EMAILS`
- `NEXT_PUBLIC_SITE_URL`

The production URL is `https://postcutz-live.vercel.app`.

`PAYSTACK_SECRET_KEY` must remain a test key until the owner explicitly approves live payments.
Set `PAYSTACK_LIVE_ENABLED=true` only alongside that approval. The webhook endpoint is
`https://postcutz-live.vercel.app/api/paystack/webhook`.

The repository contains normal readable source and has no build-time archive extraction step.
Admin poster uploads keep originals in the private `poster-originals` bucket and generate a
compressed, watermarked WebP preview for the public `poster-previews` bucket. Originals must be
at least 1080 by 1080 pixels and no larger than 4 MB.
