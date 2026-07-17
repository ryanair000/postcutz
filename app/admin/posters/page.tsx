import Link from "next/link";
import { Edit3, Plus, ToggleLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Manage Posters" };

export default async function AdminPostersPage() {
  const admin = createAdminClient();
  const { data: posters } = await admin.from("postcutz_posters").select("*").order("created_at", { ascending: false });
  return <div>
    <header className="admin-header"><div><span className="eyebrow">Content</span><h1>Posters</h1><p>Publish, archive and review poster files.</p></div><Link href="/admin/posters/new" className="button button-primary"><Plus size={17} /> Upload poster</Link></header>
    <section className="admin-panel table-wrap"><table><thead><tr><th>Poster</th><th>Category</th><th>Credits</th><th>Status</th><th>Added</th><th></th></tr></thead><tbody>{(posters || []).map((poster) => {
      const preview = poster.preview_path.startsWith("http") ? poster.preview_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/postcutz-previews/${poster.preview_path}`;
      return <tr key={poster.id}><td><div className="table-poster"><img src={preview} alt="" /><div><strong>{poster.title}</strong><small>{poster.file_name || "No original uploaded"}</small></div></div></td><td>{poster.category}</td><td>{poster.credit_cost}</td><td><span className={`status-badge ${poster.status}`}>{poster.status}</span></td><td>{formatDate(poster.created_at)}</td><td><Link className="icon-button" href={`/admin/posters/${poster.id}`} title="Edit"><Edit3 size={16} /></Link></td></tr>;
    })}</tbody></table>{!posters?.length && <div className="table-empty"><ToggleLeft /> No posters uploaded yet.</div>}</section>
  </div>;
}
