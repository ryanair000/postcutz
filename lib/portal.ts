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

export function posterPreviewUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/")) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";
  return `${base}/storage/v1/object/public/${PORTAL.previewBucket}/${path}`;
}
