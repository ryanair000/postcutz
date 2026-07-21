import { redirect } from "next/navigation";
import { JB_LOGIN_EMAIL } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isJbClientEmail(email?: string | null) {
  return email?.trim().toLowerCase() === JB_LOGIN_EMAIL.toLowerCase();
}

export function emailIsAdmin(email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail || isJbClientEmail(normalizedEmail)) return false;
  return getAdminEmails().includes(normalizedEmail);
}

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (isJbClientEmail(user?.email)) redirect("/library");
  if (!user || !emailIsAdmin(user.email)) redirect("/admin-login");
  return user;
}
