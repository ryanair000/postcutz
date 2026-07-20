"use client";

import { Download, Lock, X } from "lucide-react";
import { PosterWatermark } from "@/components/PosterWatermark";
import type { Poster } from "@/lib/types";

export function PosterPreviewModal({ poster, credits, busy, onClose, onAction }: {
  poster: Poster | null;
  credits: number;
  busy: boolean;
  onClose: () => void;
  onAction: (poster: Poster) => void;
}) {
  if (!poster) return null;
  const canAfford = credits >= poster.credit_cost;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={poster.title} onMouseDown={onClose}>
      <div className="preview-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close preview"><X /></button>
        <div className="preview-stage">
          <img src={poster.preview_url} alt={poster.title} />
          <PosterWatermark />
        </div>
        <div className="preview-details">
          <span className="eyebrow">{poster.category}</span>
          <h2>{poster.title}</h2>
          <p>{poster.description || "A professionally designed JBCutz social-media poster."}</p>
          <dl className="preview-facts">
            <div><dt>Format</dt><dd>{poster.width || 1080} × {poster.height || 1080}</dd></div>
            <div><dt>Cost</dt><dd>{poster.unlocked ? "Already unlocked" : `${poster.credit_cost} credit`}</dd></div>
            <div><dt>Your balance</dt><dd>{credits} credits</dd></div>
          </dl>
          {!poster.unlocked && <p className="microcopy">One credit unlocks this poster permanently. Future downloads are free.</p>}
          <button className="button button-primary button-wide" onClick={() => onAction(poster)} disabled={busy}>
            {poster.unlocked ? <Download size={18} /> : <Lock size={18} />}
            {busy ? "Preparing…" : poster.unlocked ? "Download poster" : canAfford ? `Unlock for ${poster.credit_cost} credit` : "Buy more credits"}
          </button>
        </div>
      </div>
    </div>
  );
}
