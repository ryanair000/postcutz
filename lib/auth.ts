import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function emailIsAdmin(email?: string | null) {
  return Boolean(email && getAdminEmails().includes(email.toLowerCase()));
}

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!emailIsAdmin(user.email)) redirect("/library");
  return user;
}
