"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { PosterCard } from "@/components/PosterCard";
import { PosterPreviewModal } from "@/components/PosterPreviewModal";
import { EmptyState } from "@/components/EmptyState";
import type { Poster } from "@/lib/types";

export function PosterLibraryClient({ posters, initialCredits }: { posters: Poster[]; initialCredits: number }) {
  const [credits, setCredits] = useState(initialCredits);
  const [items, setItems] = useState(posters);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<Poster | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const categories = useMemo(() => ["All", ...Array.from(new Set(items.map((item) => item.category)))], [items]);
  const filtered = useMemo(() => items.filter((poster) => {
    const categoryMatches = category === "All" || poster.category === category;
    const queryMatches = `${poster.title} ${poster.description || ""}`.toLowerCase().includes(query.toLowerCase());
    return categoryMatches && queryMatches;
  }), [items, query, category]);

  async function download(poster: Poster) {
    if (!poster.unlocked && credits < poster.credit_cost) {
      location.href = "/credits?reason=insufficient";
      return;
    }
    setBusy(true); setMessage("");
    try {
      if (!poster.unlocked) {
        const response = await fetch(`/api/posters/${poster.id}/unlock`, { method: "POST" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not unlock poster.");
        setCredits(Number(payload.credit_balance));
        setItems((current) => current.map((item) => item.id === poster.id ? { ...item, unlocked: true } : item));
        setSelected((current) => current?.id === poster.id ? { ...current, unlocked: true } : current);
      }
      const response = await fetch(`/api/posters/${poster.id}/download`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not prepare download.");
      const anchor = document.createElement("a");
      anchor.href = payload.url;
      anchor.download = payload.file_name || `${poster.slug}.png`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally { setBusy(false); }
  }

  return <main className="content-page">
    <section className="page-hero">
      <div><span className="eyebrow"><Sparkles size={14} /> Private design library</span><h1>Posters made for JBCutz.</h1><p>Preview every design for free. Unlock any poster for one credit and redownload it whenever you need it.</p></div>
      <div className="hero-credit-card"><small>Current balance</small><strong>{credits}</strong><span>credits available</span><Link href="/credits">Buy more credits</Link></div>
    </section>
    <section className="library-toolbar">
      <div className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search posters" /></div>
      <div className="category-tabs">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
    </section>
    {message && <div className="notice error">{message}</div>}
    {filtered.length ? <section className="poster-grid">{filtered.map((poster) => <PosterCard key={poster.id} poster={poster} onPreview={setSelected} onDownload={download} />)}</section> : <EmptyState title="No posters found" text="Try a different category or search term." />}
    <PosterPreviewModal poster={selected} credits={credits} busy={busy} onClose={() => setSelected(null)} onAction={download} />
  </main>;
}
