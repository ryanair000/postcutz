import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PosterEditor } from "./PosterEditor";

export const dynamic = "force-dynamic";

export default async function PosterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = createAdminClient();
  const { data: poster } = await admin.from("postcutz_posters").select("*").eq("id", (await params).id).single();
  if (!poster) notFound();
  const previewUrl = poster.preview_path.startsWith("http") ? poster.preview_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/postcutz-previews/${poster.preview_path}`;
  return <PosterEditor poster={{ ...poster, preview_url: previewUrl }} />;
}
