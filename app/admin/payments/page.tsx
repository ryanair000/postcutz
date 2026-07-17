import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, formatKes } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const admin = createAdminClient();
  const { data: payments } = await admin.from("postcutz_payments").select("*, profile:postcutz_profiles(email, full_name)").order("created_at", { ascending: false });
  return <div><header className="admin-header"><div><span className="eyebrow">Billing</span><h1>Payments</h1><p>Paystack references and credit fulfilment status.</p></div></header><section className="admin-panel table-wrap"><table><thead><tr><th>Reference</th><th>Client</th><th>Credits</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>{(payments || []).map((payment: any) => { const profile = Array.isArray(payment.profile) ? payment.profile[0] : payment.profile; return <tr key={payment.id}><td><code>{payment.reference}</code></td><td>{profile?.full_name || profile?.email || "Client"}</td><td>{payment.credits}</td><td>{formatKes(Number(payment.expected_amount_minor) / 100)}</td><td><span className={`status-badge ${payment.status}`}>{payment.status}</span></td><td>{formatDate(payment.created_at)}</td></tr>; })}</tbody></table></section></div>;
}
