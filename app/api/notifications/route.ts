import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export type SetupItem = {
  key:   string;
  label: string;
  desc:  string;
  done:  boolean;
  href:  string;
};

export async function GET() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const { createServerClient } = await import("@supabase/ssr");

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const userClient = createServerClient(url, anon, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  });

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ notifications: [], unread: 0, setupItems: [], setupComplete: true });

  const service = createServiceClient();

  const [{ data: jobs }, { data: bookings }, { data: profile }, { data: artisan }] = await Promise.all([
    service.from("job_requests").select("id, status, description, updated_at")
      .eq("user_id", user.id).order("updated_at", { ascending: false }).limit(10),
    service.from("bookings").select("id, escrow_status, updated_at, job_id")
      .eq("user_id", user.id).order("updated_at", { ascending: false }).limit(10),
    service.from("users").select("avatar, location, nin_verified").eq("id", user.id).single(),
    service.from("artisans").select("id, nin_verified").eq("user_id", user.id).maybeSingle(),
  ]);

  // ── Setup checklist ──────────────────────────────────────────────
  const setupItems: SetupItem[] = [
    {
      key:   "account",
      label: "Account created",
      desc:  "You're in — welcome to iSabi!",
      done:  true,
      href:  "/dashboard",
    },
    {
      key:   "photo",
      label: "Add a profile photo",
      desc:  "Upload your picture so artisans recognise you",
      done:  !!(profile as { avatar?: string } | null)?.avatar,
      href:  "/profile",
    },
    {
      key:   "location",
      label: "Set your location",
      desc:  "Helps us match nearby artisans instantly",
      done:  !!(profile as { location?: string } | null)?.location,
      href:  "/profile",
    },
    {
      key:   "nin",
      label: "Verify your identity (NIN)",
      desc:  "Enter your 11-digit NIN to get the Verified badge",
      done:  !!(profile as { nin_verified?: boolean } | null)?.nin_verified,
      href:  "/profile",
    },
  ];

  const setupComplete = setupItems.every((i) => i.done);

  // ── Activity notifications ───────────────────────────────────────
  const STATUS_MESSAGES: Record<string, string> = {
    funded:      "Escrow funded — artisan will be notified",
    accepted:    "Artisan accepted your job",
    in_progress: "Your job is now in progress",
    completed:   "Job marked complete — please release payment",
    released:    "Payment released successfully",
    disputed:    "Your dispute has been opened",
    not_funded:  "Awaiting payment",
  };

  const notifications: Array<{
    id:    string;
    title: string;
    body:  string;
    time:  string;
    read:  boolean;
  }> = [];

  for (const b of bookings ?? []) {
    const statusMsg = STATUS_MESSAGES[b.escrow_status as string];
    if (!statusMsg) continue;
    notifications.push({
      id:    `booking-${b.id}`,
      title: statusMsg,
      body:  `Booking #${(b.id as string).slice(0, 8)}`,
      time:  new Date(b.updated_at as string).toLocaleDateString("en-NG", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      }),
      read: ["released", "refunded"].includes(b.escrow_status as string),
    });
  }

  for (const j of jobs ?? []) {
    if (notifications.find((n) => n.id.includes(j.id as string))) continue;
    notifications.push({
      id:    `job-${j.id}`,
      title: "New job reported",
      body:  ((j.description as string) ?? "").slice(0, 60) + "…",
      time:  new Date(j.updated_at as string).toLocaleDateString("en-NG", {
        day: "numeric", month: "short",
      }),
      read: true,
    });
  }

  // KYC pending nudge for artisans who skipped verification
  const artisanData = artisan as { id?: string; nin_verified?: boolean } | null;
  if (artisanData && artisanData.nin_verified === false) {
    notifications.unshift({
      id:    "kyc-pending",
      title: "Complete identity verification",
      body:  "Your profile is tagged Unverified. Complete KYC to build client trust and remove the warning.",
      time:  "Action required",
      read:  false,
    });
  }

  const unread = notifications.filter((n) => !n.read).length;

  return NextResponse.json({
    notifications: notifications.slice(0, 8),
    unread,
    setupItems,
    setupComplete,
  });
}
