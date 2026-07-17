import { Navigation } from "@/components/Navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Poster } from "@/lib/types";
import { PosterLibraryClient } from "./PosterLibraryClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Poster Library" };

export default async function LibraryPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: posters }, { data: unlocks }, { data: balance }] = await Promise.all([
    supabase.from("postcutz_posters").select("*").eq("status", "published").order("featured", { ascending: false }).order("published_at", { ascending: false }),
    supabase.from("postcutz_unlocks").select("poster_id").eq("user_id", user.id),
    supabase.rpc("postcutz_balance")
  ]);

  const unlocked = new Set((unlocks || []).map((item) => item.poster_id));
  const hydrated: Poster[] = (posters || []).map((poster) => ({
    ...poster,
    preview_url: poster.preview_path.startsWith("http")
      ? poster.preview_path
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/postcutz-previews/${poster.preview_path}`,
    unlocked: unlocked.has(poster.id)
  }));

  return <div className="app-shell">
    <Navigation credits={Number(balance || 0)} email={user.email} />
    <PosterLibraryClient posters={hydrated} initialCredits={Number(balance || 0)} />
  </div>;
}
