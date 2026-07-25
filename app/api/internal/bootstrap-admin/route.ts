import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8)
});

function tokenMatches(provided: string | null, expected: string) {
  if (!provided) return false;
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return (
    providedBytes.length === expectedBytes.length &&
    timingSafeEqual(providedBytes, expectedBytes)
  );
}

export async function POST(request: Request) {
  const expectedToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
  if (!expectedToken || !tokenMatches(request.headers.get("x-bootstrap-token"), expectedToken)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const supabase = createAdminClient();
  let existingUserId: string | null = null;

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      return NextResponse.json({ error: "Unable to inspect users." }, { status: 500 });
    }

    existingUserId =
      data.users.find((user) => user.email?.toLowerCase() === email)?.id ?? null;
    if (existingUserId || data.users.length < 1000) break;
  }

  const result = existingUserId
    ? await supabase.auth.admin.updateUserById(existingUserId, {
        password: parsed.data.password,
        email_confirm: true
      })
    : await supabase.auth.admin.createUser({
        email,
        password: parsed.data.password,
        email_confirm: true
      });

  if (result.error || !result.data.user) {
    return NextResponse.json({ error: "Unable to configure user." }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      operation: existingUserId ? "updated" : "created",
      email: result.data.user.email,
      confirmed: Boolean(result.data.user.email_confirmed_at)
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
