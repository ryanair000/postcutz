"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CheckCheck, ChevronRight, Download, Images, ReceiptText, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type AdminNotification = {
  id: string;
  title: string;
  description: string;
  at: string;
  kind: "poster" | "download" | "payment";
  href: string;
};

const labels: Record<string, string> = {
  admin: "Dashboard",
  posters: "Posters",
  new: "Upload poster",
  clients: "Clients",
  payments: "Payments"
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function NotificationIcon({ kind }: { kind: AdminNotification["kind"] }) {
  if (kind === "poster") return <Images size={17} />;
  if (kind === "download") return <Download size={17} />;
  return <ReceiptText size={17} />;
}

export function AdminTopbar({ notifications }: { notifications: AdminNotification[] }) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState(0);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem("postcutz-admin-notifications-seen") || 0);
    setSeenAt(stored);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (open && panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join("/")}`;
      const isId = /^[0-9a-f-]{20,}$/i.test(segment);
      return {
        href,
        label: isId ? "Edit poster" : labels[segment] || segment.replace(/-/g, " "),
        current: index === segments.length - 1
      };
    });
  }, [pathname]);

  const unreadCount = notifications.filter((item) => new Date(item.at).getTime() > seenAt).length;

  function toggleNotifications() {
    setOpen((current) => {
      const next = !current;
      if (next) {
        const now = Date.now();
        setSeenAt(now);
        window.localStorage.setItem("postcutz-admin-notifications-seen", String(now));
      }
      return next;
    });
  }

  return <header className="admin-topbar">
    <div className="admin-topbar-title">
      <span className="admin-topbar-kicker">PostCutz admin</span>
      <nav className="admin-breadcrumbs" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, index) => <span key={crumb.href}>
          {index > 0 && <ChevronRight size={13} aria-hidden="true" />}
          {crumb.current ? <strong aria-current="page">{crumb.label}</strong> : <Link href={crumb.href}>{crumb.label}</Link>}
        </span>)}
      </nav>
    </div>

    <div className="admin-topbar-actions" ref={panelRef}>
      <button
        className="notification-button"
        type="button"
        onClick={toggleNotifications}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unreadCount ? `${unreadCount} unread notifications` : "Open notifications"}
      >
        <Bell size={19} />
        {unreadCount > 0 && <span>{Math.min(unreadCount, 9)}</span>}
      </button>

      {open && <section className="notification-popover" role="dialog" aria-label="Admin notifications">
        <div className="notification-header">
          <div><span className="eyebrow">Updates</span><h2>Notifications</h2></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications"><X size={18} /></button>
        </div>
        {notifications.length ? <div className="notification-list">
          {notifications.map((item) => <Link href={item.href} className="notification-item" key={item.id}>
            <span className={`notification-kind ${item.kind}`}><NotificationIcon kind={item.kind} /></span>
            <span className="notification-copy"><strong>{item.title}</strong><small>{item.description}</small><time>{formatDateTime(item.at)}</time></span>
          </Link>)}
        </div> : <div className="notification-empty"><CheckCheck size={24} /><strong>All caught up</strong><span>New uploads, downloads and payments will appear here.</span></div>}
      </section>}
    </div>
  </header>;
}
