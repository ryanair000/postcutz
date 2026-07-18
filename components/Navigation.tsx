import Link from "next/link";
import { BookOpen, Download, LogOut, PlusCircle, Shield } from "lucide-react";
import { Brand } from "@/components/Brand";
import { CreditBadge } from "@/components/CreditBadge";
import { emailIsAdmin } from "@/lib/auth";

const portalLinks = [
  { href: "/library", label: "Posters", icon: BookOpen },
  { href: "/downloads", label: "Downloads", icon: Download },
  { href: "/credits", label: "Credits", icon: PlusCircle }
] as const;

export function Navigation({ credits, email }: { credits: number; email?: string | null }) {
  const isAdmin = emailIsAdmin(email);
  return <>
    <header className="site-header">
      <div className="site-header-inner">
        <Brand />
        <nav className="site-nav" aria-label="Main navigation">
          {portalLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href}><Icon size={17} /> {label}</Link>)}
          {isAdmin && <Link href="/admin"><Shield size={17} /> Admin</Link>}
        </nav>
        <div className="site-actions">
          <CreditBadge credits={credits} />
          <form action="/auth/signout" method="post">
            <button className="icon-button" title="Sign out" aria-label="Sign out"><LogOut size={19} /></button>
          </form>
        </div>
      </div>
    </header>

    <nav className="mobile-nav" aria-label="Mobile navigation">
      {portalLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href}><Icon size={20} /><span>{label}</span></Link>)}
      {isAdmin && <Link href="/admin"><Shield size={20} /><span>Admin</span></Link>}
    </nav>
  </>;
}
