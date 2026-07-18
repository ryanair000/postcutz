"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Archive, Save } from "lucide-react";
import type { Poster } from "@/lib/types";

export function PosterEditor({ poster }: { poster: Poster }) {
  const [status, setStatus] = useState(poster.status);
  const [message, setMessage] = useState("");
  async function update(nextStatus = status) {
    const response = await fetch(`/api/admin/posters/${poster.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
    const payload = await response.json(); setMessage(response.ok ? "Poster updated." : payload.error || "Update failed.");
    if (response.ok) setStatus(nextStatus);
  }
  return <div><header className="admin-header"><div><Link className="back-link" href="/admin/posters"><ArrowLeft size={15} /> Back to posters</Link><span className="eyebrow">Poster details</span><h1>{poster.title}</h1><p>Manage publication state and file availability.</p></div></header>
    <div className="poster-admin-grid"><section className="admin-panel poster-admin-preview"><img src={poster.preview_url} alt={poster.title} /></section><section className="admin-panel form-section"><h2>Publication</h2><label>Status<select value={status} onChange={(event) => setStatus(event.target.value as Poster["status"])}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label><dl className="detail-list"><div><dt>Category</dt><dd>{poster.category}</dd></div><div><dt>Credit cost</dt><dd>{poster.credit_cost}</dd></div><div><dt>Original file</dt><dd>{poster.original_path ? "Available" : "Missing"}</dd></div></dl>{message && <div className="notice success">{message}</div>}<div className="stack-actions"><button className="button button-primary" onClick={() => update()}><Save size={17} /> Save changes</button><button className="button button-secondary" onClick={() => update("archived")}><Archive size={17} /> Archive</button></div></section></div>
  </div>;
}
