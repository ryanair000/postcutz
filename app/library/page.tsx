import { Navigation } from "@/components/Navigation";
import { requireUser } from "@/lib/auth";
import { CLIENT_POSTER_COLUMNS, PORTAL, posterPreviewUrl } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ClientPoster } from "@/lib/types";
import { PosterLibraryClient } from "./PosterLibraryClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Poster Library" };

export default async function LibraryPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const admin = createAdminClient();
  const [{ data: posters, error: posterError }, { data: unlocks, error: unlockError }, { data: balance }] = await Promise.all([
    admin.from(PORTAL.posters).select(CLIENT_POSTER_COLUMNS).eq("status", "published").order("featured", { ascending: false }).order("published_at", { ascending: false }),
    admin.from(PORTAL.unlocks).select("poster_id").eq("user_id", user.id),
    supabase.rpc("poster_portal_balance", { p_user_id: user.id })
  ]);

  if (posterError) console.error("Poster library error", posterError.message);
  if (unlockError) console.error("Poster unlock lookup error", unlockError.message);
  const unlocked = new Set((unlocks || []).map((item) => item.poster_id));
  const hydrated: ClientPoster[] = (posterError || unlockError ? [] : posters || [])
    .filter((poster) => !unlocked.has(poster.id))
    .map((poster) => ({
      ...poster,
      featured: Boolean(poster.featured),
      preview_url: posterPreviewUrl(poster.preview_path),
      unlocked: false
    }));

  return <div className="app-shell">
    <Navigation credits={Number(balance || 0)} email={user.email} />
    <PosterLibraryClient posters={hydrated} initialCredits={Number(balance || 0)} />
  </div>;
}
