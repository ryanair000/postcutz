"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Archive, Edit3, ExternalLink, Search } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

type AdminPosterItem = {
  id: string;
  title: string;
  category: string;
  credit_cost: number;
  status: "draft" | "published" | "archived";
  preview_url: string;
  created_at: string;
};

export function AdminPosterGallery({ posters }: { posters: AdminPosterItem[] }) {
  const { toast } = useToast();
  const [items, setItems] = useState(posters);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setItems(posters);
  }, [posters]);

  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category))).sort(), [items]);
  const filtered = useMemo(() => items.filter((item) => {
    const queryMatch = `${item.title} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase());
    const statusMatch = status === "all" || item.status === status;
    const categoryMatch = category === "all" || item.category === category;
    return queryMatch && statusMatch && categoryMatch;
  }), [items, query, status, category]);

  async function archive(poster: AdminPosterItem) {
    if (!window.confirm(`Archive ${poster.title}? Existing unlocks will keep access.`)) return;
    setBusy(poster.id);
    try {
      const response = await fetch(`/api/admin/posters/${poster.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not archive the poster.");
      setItems((current) => current.map((item) => item.id === poster.id ? { ...item, status: "archived" } : item));
      toast({ title: "Poster archived", description: `${poster.title} is hidden from new unlocks.`, variant: "success" });
    } catch (error) {
      toast({ title: "Archive failed", description: error instanceof Error ? error.message : "Could not archive the poster.", variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  return <section className="admin-panel recent-posters-panel">
    <div className="section-heading recent-posters-heading">
      <div><span className="eyebrow">Content library</span><h2>Recent posters</h2><p>Preview, edit or archive the latest poster files.</p></div>
      <Link href="/admin/posters" className="button button-secondary">View all posters</Link>
    </div>

    <div className="admin-gallery-filters">
      <label className="admin-gallery-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search posters" aria-label="Search posters" /></label>
      <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status"><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
      <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category"><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
    </div>

    {filtered.length ? <div className="admin-poster-grid">{filtered.map((poster) => <article className="admin-poster-card" key={poster.id}>
      <div className="admin-poster-image"><img src={poster.preview_url} alt={poster.title} /><span className={`status-badge ${poster.status}`}>{poster.status}</span></div>
      <div className="admin-poster-card-body">
        <div><small>{poster.category}</small><h3>{poster.title}</h3><p>{poster.credit_cost} credit{poster.credit_cost === 1 ? "" : "s"}</p></div>
        <div className="admin-poster-actions">
          <a className="icon-button" href={poster.preview_url} target="_blank" rel="noreferrer" aria-label={`Open ${poster.title} preview`}><ExternalLink size={16} /></a>
          <Link className="icon-button" href={`/admin/posters/${poster.id}`} aria-label={`Edit ${poster.title}`}><Edit3 size={16} /></Link>
          {poster.status !== "archived" && <button type="button" className="icon-button archive-action" disabled={busy === poster.id} onClick={() => void archive(poster)} aria-label={`Archive ${poster.title}`}><Archive size={16} /></button>}
        </div>
      </div>
    </article>)}</div> : <div className="admin-gallery-empty">No posters match these filters.</div>}
  </section>;
}
