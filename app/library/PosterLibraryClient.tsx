"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Sparkles, WalletCards } from "lucide-react";
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
    const queryMatches = `${poster.title} ${poster.description || ""}`.toLowerCase().includes(query.trim().toLowerCase());
    return categoryMatches && queryMatches;
  }), [items, query, category]);

  async function download(poster: Poster) {
    if (credits < poster.credit_cost) {
      location.href = "/credits?reason=insufficient";
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const unlockResponse = await fetch(`/api/posters/${poster.id}/unlock`, { method: "POST" });
      const unlockPayload = await unlockResponse.json();
      if (!unlockResponse.ok) throw new Error(unlockPayload.error || "Could not unlock poster.");
      const nextBalance = Number(unlockPayload.balance ?? unlockPayload.credit_balance ?? credits - poster.credit_cost);
      setCredits(nextBalance);

      const response = await fetch(`/api/posters/${poster.id}/download`, { method: "POST" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Could not prepare download.");
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const payload = await response.json();
        const anchor = document.createElement("a");
        anchor.href = payload.url;
        anchor.download = payload.file_name || `${poster.slug}.jpg`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = response.headers.get("x-download-name") || `${poster.slug}.jpg`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      setItems((current) => current.filter((item) => item.id !== poster.id));
      setSelected(null);
      setMessage("Poster unlocked and moved to My Downloads.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="content-page">
    <section className="page-hero">
      <div><span className="eyebrow"><Sparkles size={14} /> Private design library</span><h1>Posters made for JBCutz.</h1><p>Preview every design for free. One credit unlocks one poster permanently.</p></div>
      <div className="hero-credit-card"><small>Current balance</small><strong>{credits}</strong><span>credits available</span><Link href="/credits">Buy more credits</Link></div>
    </section>

    {credits <= 0 && <section className="notice warning zero-credit-banner">
      <WalletCards size={22} />
      <div><strong>Your credits have run out.</strong><p>Top up from KSh 100 for one poster, or choose a discounted bundle.</p></div>
      <Link className="button button-primary" href="/credits?reason=insufficient">View packages</Link>
    </section>}

    <section className="library-toolbar">
      <div className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search posters" aria-label="Search posters" /></div>
      <div className="category-tabs" role="list" aria-label="Poster categories">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
    </section>

    {message && <div className={`notice ${message.includes("moved") ? "success" : "error"}`} role="status">{message}</div>}
    {filtered.length ? <section className="poster-grid">{filtered.map((poster) => <PosterCard key={poster.id} poster={poster} onPreview={setSelected} onDownload={download} />)}</section> : <EmptyState title="No active posters" text="Downloaded posters are kept safely in My Downloads. New designs will appear here." />}
    <PosterPreviewModal poster={selected} credits={credits} busy={busy} onClose={() => setSelected(null)} onAction={download} />
  </main>;
}
