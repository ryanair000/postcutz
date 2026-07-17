import { Download } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { EmptyState } from "@/components/EmptyState";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "My Downloads" };

export default async function DownloadsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: balance }, { data: unlocks }] = await Promise.all([
    supabase.rpc("postcutz_balance"),
    supabase.from("postcutz_unlocks").select("id, unlocked_at, downloads_count, poster:postcutz_posters(*)").eq("user_id", user.id).order("unlocked_at", { ascending: false })
  ]);

  return <div className="app-shell">
    <Navigation credits={Number(balance || 0)} email={user.email} />
    <main className="content-page">
      <section className="page-title"><span className="eyebrow"><Download size={14} /> Permanent access</span><h1>My Downloads</h1><p>Every poster you unlock stays here for free redownloads.</p></section>
      {unlocks?.length ? <div className="download-list">{unlocks.map((unlock: any) => {
        const poster = Array.isArray(unlock.poster) ? unlock.poster[0] : unlock.poster;
        const preview = poster.preview_path.startsWith("http") ? poster.preview_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/postcutz-previews/${poster.preview_path}`;
        return <article className="download-row" key={unlock.id}>
          <img src={preview} alt={poster.title} />
          <div className="download-copy"><span className="eyebrow">{poster.category}</span><h3>{poster.title}</h3><p>Unlocked {formatDate(unlock.unlocked_at)} · {unlock.downloads_count} download{unlock.downloads_count === 1 ? "" : "s"}</p></div>
          <a className="button button-primary" href={`/api/posters/${poster.id}/download`}><Download size={17} /> Download again</a>
        </article>;
      })}</div> : <EmptyState title="No unlocked posters yet" text="Open the poster library and unlock your first design." />}
    </main>
  </div>;
}
