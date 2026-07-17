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

The production URL is `https://postcutz.vercel.app`.
