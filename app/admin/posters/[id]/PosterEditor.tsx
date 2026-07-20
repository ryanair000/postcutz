"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Archive, LoaderCircle, Save } from "lucide-react";
import type { Poster } from "@/lib/types";
import { useToast } from "@/components/ToastProvider";

export function PosterEditor({ poster }: { poster: Poster }) {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState(poster.status);
  const [busy, setBusy] = useState(false);

  async function update(nextStatus = status) {
    if (nextStatus === "archived" && status !== "archived" && !window.confirm(`Archive ${poster.title}? Existing unlocks will keep access.`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/posters/${poster.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Update failed.");
      setStatus(nextStatus);
      toast({
        title: nextStatus === "archived" ? "Poster archived" : "Poster updated",
        description: `${poster.title} is now ${nextStatus}.`,
        variant: "success"
      });
      router.refresh();
    } catch (error) {
      toast({ title: "Update failed", description: error instanceof Error ? error.message : "Please try again.", variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return <div>
    <header className="admin-header">
      <div><Link className="back-link" href="/admin/posters"><ArrowLeft size={15} /> Back to posters</Link><span className="eyebrow">Poster details</span><h1>{poster.title}</h1><p>Manage publication state and file availability.</p></div>
    </header>
    <div className="poster-admin-grid">
      <section className="admin-panel poster-admin-preview"><img src={poster.preview_url} alt={poster.title} /></section>
      <section className="admin-panel form-section">
        <h2>Publication</h2>
        <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as Poster["status"])}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        <dl className="detail-list"><div><dt>Category</dt><dd>{poster.category}</dd></div><div><dt>Credit cost</dt><dd>{poster.credit_cost}</dd></div><div><dt>Original file</dt><dd>{poster.original_path ? "Available" : "Missing"}</dd></div></dl>
        <div className="stack-actions">
          <button type="button" className="button button-primary" disabled={busy} onClick={() => void update()}>{busy ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />} Save changes</button>
          <button type="button" className="button button-secondary" disabled={busy || status === "archived"} onClick={() => void update("archived")}><Archive size={17} /> Archive</button>
        </div>
      </section>
    </div>
  </div>;
}
