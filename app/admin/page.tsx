import { CreditCard, Download, Images, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PORTAL } from "@/lib/portal";
import { formatKes } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboard() {
  const admin = createAdminClient();
  const paystackKey = process.env.PAYSTACK_SECRET_KEY;
  const testPaymentsReady = paystackKey?.startsWith("sk_test_") === true;
  const livePaymentsReady = paystackKey?.startsWith("sk_live_") === true && process.env.PAYSTACK_LIVE_ENABLED === "true";
  const paymentStatus = livePaymentsReady ? "Paystack live" : testPaymentsReady ? "Paystack test ready" : "Paystack setup pending";
  const paymentMessage = livePaymentsReady
    ? "Approved live M-PESA and card payments top up the wallet."
    : testPaymentsReady
      ? "Test-mode M-PESA and card checkout is ready for verification."
      : "Add a Paystack test secret to enable checkout verification.";
  const [posters, profiles, payments, downloads] = await Promise.all([
    admin.from(PORTAL.posters).select("id", { count: "exact", head: true }),
    admin.from(PORTAL.profiles).select("user_id", { count: "exact", head: true }),
    admin.from(PORTAL.payments).select("amount_minor").eq("status", "paid"),
    admin.from(PORTAL.downloads).select("id", { count: "exact", head: true })
  ]);
  const revenue = (payments.data || []).reduce((sum, item) => sum + Number(item.amount_minor || 0), 0) / 100;
  return <div>
    <header className="admin-header"><div><span className="eyebrow">Overview</span><h1>PostCutz dashboard</h1><p>Manage posters, credits, downloads and Paystack payments.</p></div></header>
    <section className="metric-grid">
      <article><Images /><span>Posters</span><strong>{posters.count || 0}</strong></article>
      <article><Users /><span>Clients</span><strong>{profiles.count || 0}</strong></article>
      <article><Download /><span>Downloads</span><strong>{downloads.count || 0}</strong></article>
      <article><CreditCard /><span>Revenue</span><strong>{formatKes(revenue)}</strong></article>
    </section>
    <section className="admin-panel"><h2>Portal status</h2><div className="checklist-grid"><div><strong>10 welcome credits</strong><p>The JB account is ready and password protected.</p></div><div><strong>Permanent unlocks</strong><p>A poster only spends one credit once.</p></div><div><strong>{paymentStatus}</strong><p>{paymentMessage}</p></div></div></section>
  </div>;
}
