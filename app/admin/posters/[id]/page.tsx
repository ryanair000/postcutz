import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PORTAL, posterPreviewUrl } from "@/lib/portal";
import { PosterEditor } from "./PosterEditor";

export const dynamic = "force-dynamic";

export default async function PosterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = createAdminClient();
  const { data: poster } = await admin.from(PORTAL.posters).select("*").eq("id", (await params).id).single();
  if (!poster) notFound();
  return <PosterEditor poster={{ ...poster, featured: Boolean(poster.featured), preview_url: posterPreviewUrl(poster.preview_path) }} />;
}
