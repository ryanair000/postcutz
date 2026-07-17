import { Coins } from "lucide-react";

export function CreditBadge({ credits }: { credits: number }) {
  return <span className="credit-badge"><Coins size={15} /> {credits} credit{credits === 1 ? "" : "s"}</span>;
}
