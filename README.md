# PostCutz

Private poster-credit portal for JBCutz. Clients preview watermarked designs, permanently unlock a poster for one credit, and redownload unlocked files for free. Admins upload poster previews/originals, manage publication, review clients, grant credits, and track Paystack payments.

## Included

- Supabase email/password authentication
- Automatic 10-credit welcome grant
- Watermarked poster previews
- Atomic one-credit permanent unlocks
- Private originals with short-lived signed download links
- Free redownloads and download history
- Paystack M-PESA/card credit purchases
- Idempotent payment fulfilment and webhook verification
- Admin poster uploads, client credit adjustments and payment history
- Responsive desktop/mobile interface

## Environment variables

Copy `.env.example` to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
PAYSTACK_SECRET_KEY=sk_test_xxx
ADMIN_EMAILS=your-admin@example.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `PAYSTACK_SECRET_KEY` to the browser.

## Database setup

1. Create or select a Supabase project.
2. Run `supabase/migrations/20260717_postcutz.sql` in the SQL editor or through the Supabase CLI.
3. Ensure Email authentication is enabled.
4. Add your production and local callback URLs under Supabase Auth URL configuration.

## Install and run

```bash
npm install
npm run dev
```

## Paystack setup

1. Add `PAYSTACK_SECRET_KEY` to local/Vercel server environment variables.
2. Configure the webhook URL:

```text
https://YOUR_DOMAIN/api/paystack/webhook
```

3. Use test keys first and confirm a completed payment adds credits exactly once.

## Admin access

Set `ADMIN_EMAILS` to one or more comma-separated email addresses. Admin authorization is checked server-side for all admin pages and APIs.

## Vercel deployment

1. Import this GitHub repository into Vercel.
2. Add all environment variables for Production and Preview.
3. Deploy.
4. Update `NEXT_PUBLIC_SITE_URL` to the production domain.
5. Add the production URL to Supabase Auth redirect URLs.
6. Sign in with an admin email and upload the first poster preview and original.

## Security notes

- Original poster files are never exposed through public storage.
- Download links are signed for two minutes and only generated for authenticated users who unlocked the poster.
- Credit deduction and unlock creation happen atomically in PostgreSQL.
- Paystack webhook signatures and transaction amounts are verified before credits are granted.
- Payment references and ledger references are unique to prevent duplicate fulfilment.
