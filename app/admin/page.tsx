import { CreditCard, Download, Images, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKes } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboard() {
  const admin = createAdminClient();
  const [posters, profiles, payments, downloads] = await Promise.all([
    admin.from("postcutz_posters").select("id", { count: "exact", head: true }),
    admin.from("postcutz_profiles").select("id", { count: "exact", head: true }),
    admin.from("postcutz_payments").select("paid_amount_minor").eq("status", "paid"),
    admin.from("postcutz_downloads").select("id", { count: "exact", head: true })
  ]);
  const revenue = (payments.data || []).reduce((sum, item) => sum + Number(item.paid_amount_minor || 0), 0) / 100;
  return <div>
    <header className="admin-header"><div><span className="eyebrow">Overview</span><h1>PostCutz dashboard</h1><p>Manage posters, clients, credits and payments.</p></div></header>
    <section className="metric-grid">
      <article><Images /><span>Posters</span><strong>{posters.count || 0}</strong></article>
      <article><Users /><span>Clients</span><strong>{profiles.count || 0}</strong></article>
      <article><Download /><span>Downloads</span><strong>{downloads.count || 0}</strong></article>
      <article><CreditCard /><span>Revenue</span><strong>{formatKes(revenue)}</strong></article>
    </section>
    <section className="admin-panel"><h2>Launch checklist</h2><div className="checklist-grid"><div><strong>1. Add posters</strong><p>Upload a watermarked preview and the private original file.</p></div><div><strong>2. Invite JB</strong><p>JB creates an account and receives 10 welcome credits automatically.</p></div><div><strong>3. Configure Paystack</strong><p>Add PAYSTACK_SECRET_KEY in Vercel and point the webhook to /api/paystack/webhook.</p></div></div></section>
  </div>;
}
