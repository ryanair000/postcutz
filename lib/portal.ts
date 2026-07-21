export const JB_LOGIN_EMAIL = "jbcutz@postcutz.app";

export const PORTAL = {
  profiles: "poster_portal_profiles",
  posters: "poster_portal_posters",
  unlocks: "poster_portal_unlocks",
  downloads: "poster_portal_downloads",
  ledger: "poster_portal_credit_ledger",
  packages: "poster_portal_credit_packages",
  payments: "poster_portal_payments",
  previewBucket: "poster-previews",
  originalBucket: "poster-originals"
} as const;

export const CLIENT_POSTER_COLUMNS = "id,title,slug,description,category,preview_path,source_type,file_name,mime_type,width,height,credit_cost,status,featured,created_at,published_at" as const;

export function posterPreviewUrl(path: string) {
  const segments = path.trim().split("/");
  const unsafePath = !path.trim()
    || path.startsWith("/")
    || path.includes("\\")
    || path.includes("?")
    || path.includes("#")
    || /^[a-z][a-z0-9+.-]*:/i.test(path)
    || segments.some((segment) => !segment || segment === "." || segment === "..");
  if (unsafePath) return "/icon.png";
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "/icon.png";
  const encodedPath = segments.map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${PORTAL.previewBucket}/${encodedPath}`;
}
