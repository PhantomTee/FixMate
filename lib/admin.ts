import { createServerSideClient } from "@/lib/supabase";

export async function isAdminUser(): Promise<boolean> {
  const client = await createServerSideClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return false;

  if (user.user_metadata?.role === "admin") return true;

  const emails = (process.env.ADMIN_EMAIL_WHITELIST ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (emails.length > 0 && emails.includes((user.email ?? "").toLowerCase())) return true;

  const phones = (process.env.ADMIN_PHONE_WHITELIST ?? "")
    .split(",").map((p) => p.trim()).filter(Boolean);
  if (phones.length > 0 && phones.includes(user.phone ?? "")) return true;

  return false;
}
