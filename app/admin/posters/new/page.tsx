import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminQuickUpload } from "@/components/AdminQuickUpload";

export const metadata = { title: "Upload Poster" };

export default function NewPosterPage() {
  return <div>
    <header className="admin-header">
      <div>
        <Link className="back-link" href="/admin/posters"><ArrowLeft size={15} /> Back to posters</Link>
        <span className="eyebrow">New content</span>
        <h1>Upload poster</h1>
        <p>Choose one high-resolution original. PostCutz creates and publishes the protected watermarked preview.</p>
      </div>
    </header>
    <AdminQuickUpload compact />
  </div>;
}
