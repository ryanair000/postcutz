import { createAdminClient } from "@/lib/supabase/admin";
import { PORTAL } from "@/lib/portal";
import { formatDate, formatKes } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const admin = createAdminClient();
  const [{ data: payments }, { data: profiles }] = await Promise.all([
    admin.from(PORTAL.payments).select("*").order("created_at", { ascending: false }),
    admin.from(PORTAL.profiles).select("user_id,email,display_name")
  ]);
  const users = new Map((profiles || []).map((profile) => [profile.user_id, profile]));
  return <div><header className="admin-header"><div><span className="eyebrow">Billing</span><h1>Payments</h1><p>Paystack references and credit fulfilment status.</p></div></header><section className="admin-panel table-wrap"><table><thead><tr><th>Reference</th><th>Client</th><th>Credits</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>{(payments || []).map((payment) => { const profile = users.get(payment.user_id); return <tr key={payment.id}><td><code>{payment.reference}</code></td><td>{profile?.display_name || profile?.email || "Client"}</td><td>{payment.credits}</td><td>{formatKes(Number(payment.amount_minor) / 100)}</td><td><span className={`status-badge ${payment.status}`}>{payment.status}</span></td><td>{formatDate(payment.created_at)}</td></tr>; })}</tbody></table></section></div>;
}
