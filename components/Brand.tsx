import Link from "next/link";
import { Scissors } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/library" className="brand" aria-label="PostCutz poster library">
      <span className="brand-mark"><Scissors size={18} /></span>
      {!compact && <span><strong>PostCutz</strong><small>Poster Library</small></span>}
    </Link>
  );
}
