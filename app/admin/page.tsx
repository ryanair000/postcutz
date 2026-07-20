import { CreditCard, Download, Images, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PORTAL, posterPreviewUrl } from "@/lib/portal";
import { formatDate, formatKes } from "@/lib/utils";
import { AdminQuickUpload } from "@/components/AdminQuickUpload";
import { AdminPosterGallery } from "@/components/AdminPosterGallery";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Dashboard" };

type ActivityItem = {
  id: string;
  label: string;
  detail: string;
  at: string;
  type: "poster" | "download" | "payment";
};

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

  const [posters, profiles, payments, downloads, recentPosters, recentDownloads, recentPayments] = await Promise.all([
    admin.from(PORTAL.posters).select("id", { count: "exact", head: true }),
    admin.from(PORTAL.profiles).select("user_id", { count: "exact", head: true }),
    admin.from(PORTAL.payments).select("amount_minor").eq("status", "paid"),
    admin.from(PORTAL.downloads).select("id", { count: "exact", head: true }),
    admin.from(PORTAL.posters).select("id,title,category,credit_cost,status,preview_path,created_at").order("created_at", { ascending: false }).limit(8),
    admin.from(PORTAL.downloads).select("id,downloaded_at").order("downloaded_at", { ascending: false }).limit(5),
    admin.from(PORTAL.payments).select("id,reference,status,credits,created_at").order("created_at", { ascending: false }).limit(5)
  ]);

  const revenue = (payments.data || []).reduce((sum, item) => sum + Number(item.amount_minor || 0), 0) / 100;
  const galleryPosters = (recentPosters.data || []).map((poster) => ({
    ...poster,
    preview_url: posterPreviewUrl(poster.preview_path)
  }));

  const activity: ActivityItem[] = [
    ...(recentPosters.data || []).map((poster) => ({
      id: `poster-${poster.id}`,
      label: poster.status === "published" ? "Poster published" : "Poster saved",
      detail: poster.title,
      at: poster.created_at,
      type: "poster" as const
    })),
    ...(recentDownloads.data || []).map((item) => ({
      id: `download-${item.id}`,
      label: "Poster downloaded",
      detail: "A client downloaded an unlocked original.",
      at: item.downloaded_at,
      type: "download" as const
    })),
    ...(recentPayments.data || []).map((payment) => ({
      id: `payment-${payment.id}`,
      label: payment.status === "paid" ? "Credits purchased" : `Payment ${payment.status}`,
      detail: `${payment.credits} credits · ${payment.reference}`,
      at: payment.created_at,
      type: "payment" as const
    }))
  ].filter((item) => Boolean(item.at)).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 7);

  return <div className="admin-dashboard-page">
    <header className="admin-header dashboard-header">
      <div><span className="eyebrow">Overview</span><h1>PostCutz dashboard</h1><p>Upload a poster once. PostCutz adds the watermark, protects the original and publishes it to the client library.</p></div>
      <a className="button button-secondary" href="https://postcutz.jengasites.com/library" target="_blank" rel="noreferrer">Open client portal</a>
    </header>

    <section className="metric-grid">
      <article><Images /><span>Posters</span><strong>{posters.count || 0}</strong></article>
      <article><Users /><span>Clients</span><strong>{profiles.count || 0}</strong></article>
      <article><Download /><span>Downloads</span><strong>{downloads.count || 0}</strong></article>
      <article><CreditCard /><span>Revenue</span><strong>{formatKes(revenue)}</strong></article>
    </section>

    <AdminQuickUpload />
    <AdminPosterGallery posters={galleryPosters} />

    <div className="dashboard-lower-grid">
      <section className="admin-panel activity-panel">
        <div className="section-heading"><div><span className="eyebrow">Live activity</span><h2>Recent events</h2><p>Uploads, downloads and credit purchases.</p></div></div>
        {activity.length ? <div className="activity-list">{activity.map((item) => <article key={item.id}>
          <span className={`activity-dot ${item.type}`} />
          <div><strong>{item.label}</strong><p>{item.detail}</p></div>
          <time>{formatDate(item.at)}</time>
        </article>)}</div> : <div className="admin-gallery-empty">Activity will appear here.</div>}
      </section>

      <section className="admin-panel portal-status-panel">
        <div className="section-heading"><div><span className="eyebrow">System</span><h2>Portal status</h2></div></div>
        <div className="status-stack">
          <div><span className="status-indicator online" /><div><strong>Automatic watermarking</strong><p>Every uploaded original receives a public WebP preview.</p></div></div>
          <div><span className="status-indicator online" /><div><strong>Private originals</strong><p>Full-resolution files stay in protected Supabase storage.</p></div></div>
          <div><span className={`status-indicator ${livePaymentsReady || testPaymentsReady ? "online" : "pending"}`} /><div><strong>{paymentStatus}</strong><p>{paymentMessage}</p></div></div>
          <div><span className="status-indicator online" /><div><strong>Permanent unlocks</strong><p>A poster only spends one credit once.</p></div></div>
        </div>
      </section>
    </div>
  </div>;
}
