"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Circle,
  ExternalLink,
  FileImage,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  Upload,
  X
} from "lucide-react";

type FileInfo = {
  name: string;
  size: number;
  width: number;
  height: number;
  type: string;
};

type UploadedPoster = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  preview_url?: string;
};

const stages = [
  "Validating image",
  "Generating preview",
  "Adding watermark",
  "Uploading original",
  "Publishing poster"
];

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

function formatBytes(bytes: number) {
  if (bytes < 1_000_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function imageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This file is not a valid image."));
    };
    image.src = url;
  });
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AdminQuickUpload({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(-1);
  const [message, setMessage] = useState("");
  const [uploaded, setUploaded] = useState<UploadedPoster | null>(null);
  const [title, setTitle] = useState("");

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const valid = useMemo(() => Boolean(
    fileInfo &&
    allowedTypes.has(fileInfo.type) &&
    fileInfo.size <= 4_000_000 &&
    fileInfo.width >= 1080 &&
    fileInfo.height >= 1080
  ), [fileInfo]);

  async function inspect(nextFile?: File) {
    if (!nextFile) return;
    setMessage("");
    setUploaded(null);
    if (!allowedTypes.has(nextFile.type)) {
      setMessage("Use a JPG, PNG or WebP image.");
      return;
    }
    if (nextFile.size > 4_000_000) {
      setMessage("The image must be smaller than 4 MB.");
      return;
    }
    try {
      const dimensions = await imageDimensions(nextFile);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(nextFile));
      setFile(nextFile);
      setFileInfo({
        name: nextFile.name,
        size: nextFile.size,
        width: dimensions.width,
        height: dimensions.height,
        type: nextFile.type
      });
      if (!title) {
        setTitle(nextFile.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()));
      }
      if (dimensions.width < 1080 || dimensions.height < 1080) {
        setMessage("The original must be at least 1080 × 1080 pixels.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not inspect this image.");
    }
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setFile(null);
    setFileInfo(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function reset() {
    clearFile();
    setUploaded(null);
    setMessage("");
    setProgress(-1);
    setTitle("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !valid) {
      setMessage("Choose a valid image before publishing.");
      return;
    }

    setBusy(true);
    setUploaded(null);
    setMessage("");
    setProgress(0);

    try {
      await wait(160);
      setProgress(1);
      await wait(160);
      setProgress(2);
      await wait(160);
      setProgress(3);

      const form = new FormData(event.currentTarget);
      form.set("original", file);
      const response = await fetch("/api/admin/posters", { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Upload failed.");

      setProgress(4);
      await wait(220);
      setUploaded(payload.poster);
      setMessage("Poster published successfully.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
      setProgress(-1);
    } finally {
      setBusy(false);
    }
  }

  return <section className={`admin-panel quick-upload-panel ${compact ? "compact" : ""}`}>
    <div className="section-heading">
      <div>
        <span className="eyebrow">Quick upload</span>
        <h2>Add a poster to PostCutz</h2>
        <p>Drop one original image. The server creates a watermarked preview and keeps the original private.</p>
      </div>
      <span className="secure-chip"><Check size={14} /> Private original</span>
    </div>

    {uploaded ? <div className="upload-success-card">
      <div className="upload-success-icon"><Check /></div>
      <div>
        <span className="eyebrow">Complete</span>
        <h3>{uploaded.title}</h3>
        <p>{uploaded.status === "published" ? "The poster is now visible in the client library." : "The poster was saved as a draft."}</p>
      </div>
      {uploaded.preview_url && <img src={uploaded.preview_url} alt={`${uploaded.title} watermarked preview`} />}
      <div className="upload-success-actions">
        {uploaded.preview_url && <a className="button button-primary" href={uploaded.preview_url} target="_blank" rel="noreferrer"><ExternalLink size={17} /> View preview</a>}
        <Link className="button button-secondary" href={`/admin/posters/${uploaded.id}`}>Edit poster</Link>
        <button className="button button-secondary" type="button" onClick={reset}><RefreshCw size={17} /> Upload another</button>
      </div>
    </div> : <form className="quick-upload-form" onSubmit={submit}>
      <div className="quick-upload-workspace">
        <div
          className={`quick-drop-zone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void inspect(event.dataTransfer.files[0]);
          }}
        >
          {previewUrl ? <>
            <img src={previewUrl} alt="Selected original poster" />
            <button className="clear-upload" type="button" onClick={clearFile} aria-label="Remove selected image"><X size={17} /></button>
            <div className="selected-file-meta"><FileImage size={17} /><span><strong>{fileInfo?.name}</strong><small>{fileInfo && `${formatBytes(fileInfo.size)} · ${fileInfo.width} × ${fileInfo.height}`}</small></span></div>
          </> : <>
            <ImagePlus size={34} />
            <strong>Drop the poster here</strong>
            <span>or choose a JPG, PNG or WebP image</span>
            <button className="button button-secondary" type="button" onClick={() => fileInput.current?.click()}>Choose image</button>
          </>}
          <input ref={fileInput} className="visually-hidden-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void inspect(event.target.files?.[0])} />
        </div>

        <div className="quick-watermark-preview">
          <div className="preview-label-row"><span>Watermarked preview</span>{fileInfo && <span className={valid ? "validation-pass" : "validation-fail"}>{valid ? "Ready" : "Check image"}</span>}</div>
          <div className="watermark-stage">
            {previewUrl ? <>
              <img src={previewUrl} alt="Simulated watermarked preview" />
              <div className="watermark-pattern" aria-hidden="true">
                {Array.from({ length: 9 }, (_, index) => <span key={index}>POSTCUTZ PREVIEW</span>)}
              </div>
              <div className="watermark-footer">Preview · Unlock to download</div>
            </> : <div className="preview-placeholder"><FileImage /><span>Your preview appears here</span></div>}
          </div>
          <small>The final WebP preview is generated securely on the server.</small>
        </div>
      </div>

      <div className="quick-upload-fields">
        <label>Poster title<input name="title" value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="Precision Fade" /></label>
        <button className="button button-primary quick-publish-button" disabled={busy || !valid || title.trim().length < 2}>
          {busy ? <LoaderCircle className="spin" size={18} /> : <Upload size={18} />}
          {busy ? "Publishing…" : "Publish poster"}
        </button>
      </div>

      <details className="advanced-options">
        <summary><span><ChevronDown size={17} /> Advanced options</span><small>Category, description, credits and status</small></summary>
        <div className="form-grid advanced-grid">
          <label>Category<select name="category" defaultValue="General"><option>General</option><option>Haircuts</option><option>Offers</option><option>Opening Hours</option><option>Massage</option><option>Brand</option><option>Colour</option><option>Creative</option></select></label>
          <label>Credit cost<input name="credit_cost" type="number" min="1" max="20" defaultValue="1" required /></label>
          <label>Status<select name="status" defaultValue="published"><option value="published">Published</option><option value="draft">Draft</option></select></label>
          <label className="feature-toggle"><input name="featured" value="true" type="checkbox" /><span>Feature this poster</span></label>
          <label className="wide">Description<textarea name="description" placeholder="Optional short description shown to JB." /></label>
        </div>
      </details>

      {busy && <div className="upload-progress-list" aria-live="polite">{stages.map((stage, index) => <div className={index < progress ? "done" : index === progress ? "active" : ""} key={stage}>{index < progress ? <Check size={15} /> : index === progress ? <LoaderCircle className="spin" size={15} /> : <Circle size={15} />}<span>{stage}</span></div>)}</div>}
      {message && <div className={`notice ${uploaded ? "success" : "error"}`}>{message}</div>}
    </form>}
  </section>;
}
