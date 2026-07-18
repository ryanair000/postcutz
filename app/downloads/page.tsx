import { Download } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { EmptyState } from "@/components/EmptyState";
import { requireUser } from "@/lib/auth";
import { PORTAL, posterPreviewUrl } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Downloads" };

export default async function DownloadsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: balance }, { data: unlocks }] = await Promise.all([
    supabase.rpc("poster_portal_balance", { p_user_id: user.id }),
    supabase.from(PORTAL.unlocks).select("id, poster_id, unlocked_at, downloads_count").eq("user_id", user.id).order("unlocked_at", { ascending: false })
  ]);
  const posterIds = (unlocks || []).map((unlock) => unlock.poster_id);
  const admin = createAdminClient();
  const { data: posters } = posterIds.length
    ? await admin.from(PORTAL.posters).select("*").in("id", posterIds)
    : { data: [] };
  const postersById = new Map((posters || []).map((poster) => [poster.id, poster]));

  return <div className="app-shell">
    <Navigation credits={Number(balance || 0)} email={user.email} />
    <main className="content-page">
      <section className="page-title"><span className="eyebrow"><Download size={14} /> Permanent access</span><h1>My Downloads</h1><p>Every unlocked poster stays here for free redownloads.</p></section>
      {unlocks?.length ? <div className="download-list">{unlocks.map((unlock: any) => {
        const poster = postersById.get(unlock.poster_id);
        if (!poster) return null;
        return <article className="download-row" key={unlock.id}>
          <img src={posterPreviewUrl(poster.preview_path)} alt={poster.title} />
          <div className="download-copy"><span className="eyebrow">{poster.category}</span><h3>{poster.title}</h3><p>Unlocked {formatDate(unlock.unlocked_at)} · {Number(unlock.downloads_count || 0)} download{Number(unlock.downloads_count || 0) === 1 ? "" : "s"}</p></div>
          <a className="button button-primary" href={`/api/posters/${poster.id}/download`}><Download size={17} /> Download again</a>
        </article>;
      })}</div> : <EmptyState title="No unlocked posters yet" text="Open the poster library and unlock your first design." />}
    </main>
  </div>;
}
