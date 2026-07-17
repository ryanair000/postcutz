"use client";

import { FormEvent, useState } from "react";
import { ArrowLeft, ImagePlus, LoaderCircle, Upload } from "lucide-react";
import Link from "next/link";

export default function NewPosterPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/admin/posters", { method: "POST", body: new FormData(event.currentTarget) });
    const payload = await response.json();
    if (!response.ok) { setMessage(payload.error || "Upload failed."); setBusy(false); return; }
    location.href = "/admin/posters";
  }
  return <div>
    <header className="admin-header"><div><Link className="back-link" href="/admin/posters"><ArrowLeft size={15} /> Back to posters</Link><span className="eyebrow">New content</span><h1>Upload poster</h1><p>Use a watermarked preview and a high-resolution original.</p></div></header>
    <form className="admin-form" onSubmit={submit}>
      <section className="admin-panel form-section"><h2>Poster details</h2><div className="form-grid"><label>Title<input name="title" required placeholder="Precision Fade" /></label><label>Category<select name="category" defaultValue="Haircuts"><option>Haircuts</option><option>Offers</option><option>Opening Hours</option><option>Massage</option><option>Brand</option><option>Colour</option></select></label><label className="wide">Description<textarea name="description" placeholder="Short description shown in the preview modal." /></label><label>Credit cost<input name="credit_cost" type="number" min="1" max="20" defaultValue="1" required /></label><label>Status<select name="status" defaultValue="published"><option value="published">Published</option><option value="draft">Draft</option></select></label></div></section>
      <section className="admin-panel form-section"><h2>Files</h2><div className="upload-grid"><label className="file-drop"><ImagePlus /><strong>Preview image</strong><span>Watermarked JPG, PNG or WebP</span><input name="preview" type="file" accept="image/png,image/jpeg,image/webp" required /></label><label className="file-drop"><Upload /><strong>Original poster</strong><span>High-resolution JPG, PNG or WebP</span><input name="original" type="file" accept="image/png,image/jpeg,image/webp" required /></label></div></section>
      {message && <div className="notice error">{message}</div>}
      <div className="form-actions"><Link className="button button-secondary" href="/admin/posters">Cancel</Link><button className="button button-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <Upload size={18} />}{busy ? "Uploading…" : "Upload poster"}</button></div>
    </form>
  </div>;
}
