import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";
import { ClientCreditForm } from "./ClientCreditForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Clients" };

export default async function ClientsPage() {
  const admin = createAdminClient();
  const [{ data: profiles }, { data: ledger }, { data: unlocks }] = await Promise.all([
    admin.from("postcutz_profiles").select("*").order("created_at", { ascending: false }),
    admin.from("postcutz_credit_ledger").select("user_id, amount"),
    admin.from("postcutz_unlocks").select("user_id")
  ]);
  const balances = new Map<string, number>(); (ledger || []).forEach((entry) => balances.set(entry.user_id, (balances.get(entry.user_id) || 0) + entry.amount));
  const counts = new Map<string, number>(); (unlocks || []).forEach((entry) => counts.set(entry.user_id, (counts.get(entry.user_id) || 0) + 1));
  return <div><header className="admin-header"><div><span className="eyebrow">Accounts</span><h1>Clients</h1><p>Review balances and grant promotional credits.</p></div></header><section className="admin-panel table-wrap"><table><thead><tr><th>Client</th><th>Balance</th><th>Unlocked</th><th>Joined</th><th>Adjust credits</th></tr></thead><tbody>{(profiles || []).map((profile) => <tr key={profile.id}><td><div><strong>{profile.full_name || "Client"}</strong><small>{profile.email}</small></div></td><td>{balances.get(profile.id) || 0}</td><td>{counts.get(profile.id) || 0}</td><td>{formatDate(profile.created_at)}</td><td><ClientCreditForm userId={profile.id} /></td></tr>)}</tbody></table></section></div>;
}
