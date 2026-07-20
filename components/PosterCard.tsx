"use client";

import { Check, Download, Eye, Lock } from "lucide-react";
import { PosterWatermark } from "@/components/PosterWatermark";
import type { Poster } from "@/lib/types";

export function PosterCard({ poster, onPreview, onDownload }: {
  poster: Poster;
  onPreview: (poster: Poster) => void;
  onDownload: (poster: Poster) => void;
}) {
  return (
    <article className="poster-card">
      <button className="poster-image-button" onClick={() => onPreview(poster)} aria-label={`Preview ${poster.title}`}>
        <img src={poster.preview_url} alt={poster.title} className="poster-image" />
        <PosterWatermark compact />
        <span className="poster-overlay"><Eye size={22} /> Preview</span>
        {poster.unlocked && <span className="poster-unlocked"><Check size={13} /> Unlocked</span>}
      </button>
      <div className="poster-card-body">
        <div>
          <span className="eyebrow">{poster.category}</span>
          <h3>{poster.title}</h3>
        </div>
        <div className="poster-card-footer">
          <span>{poster.unlocked ? "Free redownload" : `${poster.credit_cost} credit · KSh ${poster.credit_cost * 100}`}</span>
          <button className="button button-small" onClick={() => onDownload(poster)}>
            {poster.unlocked ? <Download size={15} /> : <Lock size={15} />}
            {poster.unlocked ? "Download" : "Unlock"}
          </button>
        </div>
      </div>
    </article>
  );
}
