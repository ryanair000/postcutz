import Link from "next/link";
import { BarChart3, CreditCard, Images, Settings, Upload, Users } from "lucide-react";
import { Brand } from "@/components/Brand";

export function AdminSidebar() {
  return <aside className="admin-sidebar">
    <Brand />
    <div className="admin-label">Administration</div>
    <nav>
      <Link href="/admin"><BarChart3 size={17} /> Dashboard</Link>
      <Link href="/admin/posters"><Images size={17} /> Posters</Link>
      <Link href="/admin/posters/new"><Upload size={17} /> Upload poster</Link>
      <Link href="/admin/clients"><Users size={17} /> Clients</Link>
      <Link href="/admin/payments"><CreditCard size={17} /> Payments</Link>
      <Link href="/library"><Settings size={17} /> Client portal</Link>
    </nav>
  </aside>;
}
