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
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "/icon.png";

  const trimmedPath = path.trim();
  let objectPath = trimmedPath;

  if (/^https?:\/\//i.test(trimmedPath)) {
    try {
      const url = new URL(trimmedPath);
      const storageOrigin = new URL(base).origin;
      const publicPreviewPrefix = `/storage/v1/object/public/${PORTAL.previewBucket}/`;
      if (url.origin !== storageOrigin || !url.pathname.startsWith(publicPreviewPrefix) || url.search || url.hash) {
        return "/icon.png";
      }
      objectPath = url.pathname
        .slice(publicPreviewPrefix.length)
        .split("/")
        .map((segment) => decodeURIComponent(segment))
        .join("/");
    } catch {
      return "/icon.png";
    }
  }

  const segments = objectPath.split("/");
  const unsafePath = !objectPath
    || objectPath.startsWith("/")
    || objectPath.includes("\\")
    || objectPath.includes("?")
    || objectPath.includes("#")
    || /^[a-z][a-z0-9+.-]*:/i.test(objectPath)
    || segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("/"));
  if (unsafePath) return "/icon.png";

  const encodedPath = segments.map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${PORTAL.previewBucket}/${encodedPath}`;
}
