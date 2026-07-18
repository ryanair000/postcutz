import { Navigation } from "@/components/Navigation";
import { requireUser } from "@/lib/auth";
import { PORTAL } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import { CreditPackages } from "./CreditPackages";

export const dynamic = "force-dynamic";
export const metadata = { title: "Buy Credits" };

export default async function CreditsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: balance }, { data: packages }] = await Promise.all([
    supabase.rpc("poster_portal_balance", { p_user_id: user.id }),
    supabase.from(PORTAL.packages).select("*").eq("active", true).order("credits")
  ]);
  return <div className="app-shell">
    <Navigation credits={Number(balance || 0)} email={user.email} />
    <CreditPackages packages={packages || []} balance={Number(balance || 0)} />
  </div>;
}
