"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CreditCard,
  ExternalLink,
  Images,
  LogOut,
  MoreHorizontal,
  Upload,
  Users,
  X
} from "lucide-react";
import { Brand } from "@/components/Brand";

const desktopLinks = [
  { href: "/admin", label: "Dashboard", icon: BarChart3, exact: true },
  { href: "/admin/posters", label: "Posters", icon: Images },
  { href: "/admin/posters/new", label: "Upload poster", icon: Upload, exact: true },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/library", label: "Client portal", icon: ExternalLink, external: true }
];

function activePath(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  if (href === "/admin/posters" && pathname === "/admin/posters/new") return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  return <>
    <aside className="admin-sidebar">
      <Brand />
      <div className="admin-label">Administration</div>
      <nav className="admin-desktop-nav" aria-label="Administration">
        {desktopLinks.map(({ href, label, icon: Icon, exact, external }) => {
          const active = activePath(pathname, href, exact);
          return <Link
            href={href}
            key={href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
            target={external ? "_blank" : undefined}
            rel={external ? "noreferrer" : undefined}
          ><Icon size={18} /> {label}</Link>;
        })}
      </nav>
    </aside>

    <nav className="admin-mobile-nav" aria-label="Admin mobile navigation">
      <Link href="/admin" className={activePath(pathname, "/admin", true) ? "active" : undefined} aria-current={activePath(pathname, "/admin", true) ? "page" : undefined}><BarChart3 /><span>Home</span></Link>
      <Link href="/admin/posters" className={activePath(pathname, "/admin/posters") ? "active" : undefined} aria-current={activePath(pathname, "/admin/posters") ? "page" : undefined}><Images /><span>Posters</span></Link>
      <Link href="/admin/posters/new" className={`admin-mobile-upload ${activePath(pathname, "/admin/posters/new", true) ? "active" : ""}`} aria-current={activePath(pathname, "/admin/posters/new", true) ? "page" : undefined}><Upload /><span>Upload</span></Link>
      <Link href="/admin/clients" className={activePath(pathname, "/admin/clients") ? "active" : undefined} aria-current={activePath(pathname, "/admin/clients") ? "page" : undefined}><Users /><span>Clients</span></Link>
      <button type="button" className={moreOpen ? "active" : undefined} onClick={() => setMoreOpen(true)} aria-expanded={moreOpen}><MoreHorizontal /><span>More</span></button>
    </nav>

    {moreOpen && <>
      <button className="admin-mobile-sheet-backdrop" type="button" onClick={() => setMoreOpen(false)} aria-label="Close admin menu" />
      <section className="admin-mobile-sheet" role="dialog" aria-modal="true" aria-label="More admin actions">
        <header><div><span className="eyebrow">More</span><h2>Admin actions</h2></div><button type="button" onClick={() => setMoreOpen(false)} aria-label="Close menu"><X /></button></header>
        <div className="admin-mobile-sheet-links">
          <Link href="/admin/payments"><CreditCard /><span><strong>Payments</strong><small>Review Paystack activity</small></span></Link>
          <Link href="/library"><ExternalLink /><span><strong>Client portal</strong><small>Open the poster library</small></span></Link>
          <Link href="/auth/signout"><LogOut /><span><strong>Sign out</strong><small>End this admin session</small></span></Link>
        </div>
      </section>
    </>}
  </>;
}
