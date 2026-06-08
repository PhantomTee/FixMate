"use client";

// Demo role system for hackathon judging.
// Roles are stored in localStorage. No real auth is used.
// In production this would be replaced by Firebase Auth + Firestore role claims.

import { DemoRole } from "@/lib/types";

const STORAGE_KEY = "fixmate_demo_role";
const DEFAULT_ROLE: DemoRole = "user";

export function getDemoRole(): DemoRole {
  if (typeof window === "undefined") return DEFAULT_ROLE;
  const saved = localStorage.getItem(STORAGE_KEY) as DemoRole | null;
  return saved && ["user", "artisan", "admin"].includes(saved) ? saved : DEFAULT_ROLE;
}

export function setDemoRole(role: DemoRole) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, role);
    window.dispatchEvent(new CustomEvent("fixmate-role-changed", { detail: role }));
  }
}

export function canAccess(role: DemoRole, allowedRoles: DemoRole[]): boolean {
  return allowedRoles.includes(role);
}

export const ROLE_META: Record<DemoRole, { label: string; color: string; badge: string; path: string }> = {
  user: {
    label: "Customer",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    badge: "bg-blue-700",
    path: "/dashboard",
  },
  artisan: {
    label: "Artisan",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    badge: "bg-orange-700",
    path: "/artisan/dashboard",
  },
  admin: {
    label: "Admin",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    badge: "bg-purple-700",
    path: "/admin",
  },
};

export const DEMO_PERSONAS: Record<DemoRole, { name: string; description: string }> = {
  user: {
    name: "Chukwudi Eze",
    description: "Customer in Yaba, Lagos. Reports household faults and releases payment after job completion.",
  },
  artisan: {
    name: "Opeyemi Ahmed",
    description: "Verified AC Repair artisan in Ikeja. Accepts jobs, marks progress, and receives OPay payout.",
  },
  admin: {
    name: "FixMate Admin",
    description: "Platform admin. Approves artisans, manages disputes, releases/refunds escrow, views ledger.",
  },
};
