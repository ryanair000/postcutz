import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/library" className="brand" aria-label="PostCutz poster library">
      <span className="brand-mark brand-mark-logo"><img src="/brand/jb-logo.png" alt="" /></span>
      {!compact && <span><strong>PostCutz</strong><small>JBCutz poster library</small></span>}
    </Link>
  );
}
