export function PosterWatermark({ compact = false }: { compact?: boolean }) {
  const marks = compact ? 8 : 12;

  return <div className={`poster-watermark ${compact ? "compact" : ""}`} aria-hidden="true">
    <div className="poster-watermark-pattern">
      {Array.from({ length: marks }, (_, index) => <span key={index}>POSTCUTZ PREVIEW</span>)}
    </div>
    <div className="poster-watermark-center">POSTCUTZ PREVIEW</div>
    <div className="poster-watermark-footer">
      <span>Preview only · Unlock to download</span>
      <strong>JB</strong>
    </div>
  </div>;
}
