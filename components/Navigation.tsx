import Link from "next/link";
import { BookOpen, Download, LogOut, PlusCircle, Shield } from "lucide-react";
import { Brand } from "@/components/Brand";
import { CreditBadge } from "@/components/CreditBadge";
import { emailIsAdmin } from "@/lib/auth";

export function Navigation({ credits, email }: { credits: number; email?: string | null }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Brand />
        <nav className="site-nav" aria-label="Main navigation">
          <Link href="/library"><BookOpen size={17} /> Posters</Link>
          <Link href="/downloads"><Download size={17} /> Downloads</Link>
          <Link href="/credits"><PlusCircle size={17} /> Buy credits</Link>
          {emailIsAdmin(email) && <Link href="/admin"><Shield size={17} /> Admin</Link>}
        </nav>
        <div className="site-actions">
          <CreditBadge credits={credits} />
          <form action="/auth/signout" method="post">
            <button className="icon-button" title="Sign out" aria-label="Sign out"><LogOut size={18} /></button>
          </form>
        </div>
      </div>
    </header>
  );
}
