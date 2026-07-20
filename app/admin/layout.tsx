import "../../styles/admin-dashboard.css";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminTopbar, type AdminNotification } from "@/components/AdminTopbar";
import { ToastProvider } from "@/components/ToastProvider";
import { requireAdmin } from "@/lib/auth";
import { PORTAL } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const admin = createAdminClient();
  const [posters, downloads, payments] = await Promise.all([
    admin.from(PORTAL.posters).select("id,title,status,created_at").order("created_at", { ascending: false }).limit(4),
    admin.from(PORTAL.downloads).select("id,downloaded_at").order("downloaded_at", { ascending: false }).limit(4),
    admin.from(PORTAL.payments).select("id,reference,status,credits,created_at").order("created_at", { ascending: false }).limit(4)
  ]);

  const notifications: AdminNotification[] = [
    ...(posters.data || []).map((poster) => ({
      id: `poster-${poster.id}`,
      title: poster.status === "published" ? "Poster published" : "Poster updated",
      description: poster.title,
      at: poster.created_at,
      kind: "poster" as const,
      href: `/admin/posters/${poster.id}`
    })),
    ...(downloads.data || []).map((download) => ({
      id: `download-${download.id}`,
      title: "Poster downloaded",
      description: "A client downloaded an unlocked original.",
      at: download.downloaded_at,
      kind: "download" as const,
      href: "/admin"
    })),
    ...(payments.data || []).map((payment) => ({
      id: `payment-${payment.id}`,
      title: payment.status === "paid" ? "Credits purchased" : `Payment ${payment.status}`,
      description: `${payment.credits} credits · ${payment.reference}`,
      at: payment.created_at,
      kind: "payment" as const,
      href: "/admin/payments"
    }))
  ].filter((item) => Boolean(item.at))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 9);

  return <ToastProvider>
    <a className="skip-link" href="#admin-content">Skip to admin content</a>
    <div className="admin-shell">
      <AdminSidebar />
      <div className="admin-workspace">
        <AdminTopbar notifications={notifications} />
        <main id="admin-content" className="admin-main" tabIndex={-1}>{children}</main>
      </div>
    </div>
  </ToastProvider>;
}
