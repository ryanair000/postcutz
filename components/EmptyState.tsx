import { ImageOff } from "lucide-react";

export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty-state"><ImageOff size={30} /><h3>{title}</h3><p>{text}</p></div>;
}
