"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { SetupItem } from "@/app/api/notifications/route";

const NAV_LINKS = [
  { label: "Browse Artisans", href: "/browse" },
  { label: "Post a Job",      href: "/report" },
  { label: "How it Works",   href: "/#how-it-works" },
];

type AuthUser = { name: string; isArtisan: boolean } | null;

type Notification = {
  id:    string;
  title: string;
  body:  string;
  time:  string;
  read:  boolean;
};

type NotifState = {
  notifications: Notification[];
  setupItems:    SetupItem[];
  setupComplete: boolean;
  unread:        number;
};

const EMPTY_NOTIF: NotifState = {
  notifications: [],
  setupItems:    [],
  setupComplete: true,
  unread:        0,
};

// ── Bell icon ────────────────────────────────────────────────────────────────
function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  );
}

// ── Notification dropdown ─────────────────────────────────────────────────────
function NotificationList({
  data,
  onClose,
}: {
  data:    NotifState;
  onClose: () => void;
}) {
  const { notifications, setupItems, setupComplete } = data;

  return (
    <div className="max-h-[420px] overflow-y-auto">

      {/* Setup checklist */}
      {!setupComplete && (
        <div className="border-b border-gray-100">
          <p className="px-4 pt-3 pb-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
            Complete your profile
          </p>
          <ul className="pb-2">
            {setupItems.map((item) => (
              <li key={item.key}>
                {item.done ? (
                  <div className="flex items-start gap-3 px-4 py-2.5">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-green-100 border border-green-300 flex items-center justify-center shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs font-black text-gray-400 line-through">{item.label}</p>
                      <p className="text-[10px] text-gray-300">{item.desc}</p>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className="flex items-start gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors group"
                  >
                    <span className="mt-0.5 w-5 h-5 rounded-full border-2 border-red-300 flex items-center justify-center shrink-0 group-hover:border-red-500 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 group-hover:bg-red-600 transition-colors" />
                    </span>
                    <div>
                      <p className="text-xs font-black text-gray-800 group-hover:text-red-700 transition-colors">{item.label}</p>
                      <p className="text-[10px] text-gray-400">{item.desc}</p>
                    </div>
                    <span className="ml-auto text-gray-300 group-hover:text-red-400 transition-colors text-xs">→</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Setup complete banner */}
      {setupComplete && setupItems.length > 0 && (
        <div className="border-b border-gray-100 px-4 py-3 flex items-center gap-2 bg-green-50">
          <span className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center shrink-0">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <p className="text-xs font-black text-green-700">Profile complete — all set!</p>
        </div>
      )}

      {/* Activity notifications */}
      {notifications.length > 0 && (
        <>
          <p className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
            Activity
          </p>
          <ul className="pb-2 divide-y divide-gray-50">
            {notifications.map((n) => (
              <li key={n.id} className={`px-4 py-3 ${n.read ? "opacity-55" : ""}`}>
                <p className="text-xs font-black text-gray-950 leading-snug">{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.body}</p>
                <p className="text-[10px] text-gray-300 mt-1">{n.time}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Empty state */}
      {setupComplete && notifications.length === 0 && (
        <p className="px-4 py-6 text-xs text-gray-400 text-center font-semibold">
          No recent activity.
        </p>
      )}
    </div>
  );
}

// ── Main Navbar ───────────────────────────────────────────────────────────────
export default function Navbar() {
  const [isOpen,    setIsOpen]    = useState(false);
  const [authUser,  setAuthUser]  = useState<AuthUser>(null);
  const [authReady, setAuthReady] = useState(false);
  const [bellOpen,  setBellOpen]  = useState(false);
  const [notif,     setNotif]     = useState<NotifState>(EMPTY_NOTIF);

  const pathname = usePathname();
  const router   = useRouter();
  const close    = () => setIsOpen(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthReady(true); return; }
      try {
        const [meRes, notifRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/notifications"),
        ]);
        const meData = await meRes.json() as { user?: { name?: string } | null; artisan?: unknown };
        setAuthUser({
          name:      meData.user?.name ?? "You",
          isArtisan: !!meData.artisan,
        });
        if (notifRes.ok) {
          const nd = await notifRes.json() as NotifState;
          setNotif(nd);
        }
      } catch { /* silently skip */ }
      setAuthReady(true);
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") { setAuthUser(null); setAuthReady(true); setNotif(EMPTY_NOTIF); }
      else if (event === "SIGNED_IN") loadUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setAuthUser(null);
    setNotif(EMPTY_NOTIF);
    close();
    router.push("/");
  };

  // Dot: red+pulsing when setup incomplete; green when setup done + unread activity
  const showDot  = !notif.setupComplete || notif.unread > 0;
  const dotIsRed = !notif.setupComplete;

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="flex h-8 w-8 items-center justify-center bg-green-700 text-sm font-black text-white rounded-lg">S</span>
            <span className="text-base font-black tracking-tight text-gray-950">iSabi</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-7 text-[13px] font-semibold text-gray-500 md:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`hover:text-gray-950 transition-colors ${pathname === l.href ? "text-gray-950" : ""}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Desktop right */}
          <div className="hidden items-center gap-2.5 md:flex">
            {authReady && (
              authUser ? (
                <>
                  {/* Notification bell */}
                  <div className="relative">
                    <button
                      onClick={() => setBellOpen((o) => !o)}
                      className="relative p-2 text-gray-500 hover:text-gray-950 hover:bg-gray-50 rounded-lg transition-colors"
                      aria-label="Notifications"
                    >
                      <BellIcon />
                      {showDot && (
                        <span
                          className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full ${
                            dotIsRed
                              ? "bg-red-500 animate-notif-pulse"
                              : "bg-green-500"
                          }`}
                        />
                      )}
                    </button>

                    {bellOpen && (
                      <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                            Notifications
                          </span>
                          <button
                            onClick={() => setBellOpen(false)}
                            className="text-gray-300 hover:text-gray-950 text-lg leading-none"
                          >
                            ×
                          </button>
                        </div>
                        <NotificationList
                          data={notif}
                          onClose={() => setBellOpen(false)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Profile link */}
                  <Link href="/profile" className="text-sm font-black text-gray-600 hover:text-gray-950 transition-colors">
                    Me
                  </Link>

                  {authUser.isArtisan && (
                    <Link href="/artisan/dashboard" className="px-4 py-2 text-sm font-black text-gray-700 hover:text-gray-950 transition-colors">
                      Artisan Hub
                    </Link>
                  )}
                  <Link href="/dashboard" className="bg-green-700 px-5 py-2 text-sm font-black text-white hover:bg-green-800 transition-colors rounded-lg">
                    My Dashboard
                  </Link>
                  <button
                    onClick={signOut}
                    className="bg-gray-100 px-5 py-2 text-sm font-black text-gray-700 hover:bg-gray-200 transition-colors rounded-lg"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth" className="px-4 py-2 text-sm font-black text-gray-700 hover:text-gray-950 transition-colors">
                    Sign In
                  </Link>
                  <Link href="/artisan/register" className="bg-green-700 px-5 py-2 text-sm font-black text-white hover:bg-green-800 transition-colors rounded-lg">
                    Offer Your Skills
                  </Link>
                  <Link href="/report" className="bg-gray-950 px-5 py-2 text-sm font-black text-white hover:bg-gray-800 transition-colors rounded-lg">
                    Hire an Artisan
                  </Link>
                </>
              )
            )}
          </div>

          {/* Mobile: bell + hamburger */}
          <div className="flex items-center gap-1 md:hidden">
            {authUser && (
              <button
                onClick={() => setBellOpen((o) => !o)}
                className="relative p-2 text-gray-500 hover:text-gray-950 hover:bg-gray-50 rounded-lg transition-colors"
                aria-label="Notifications"
              >
                <BellIcon />
                {showDot && (
                  <span
                    className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full ${
                      dotIsRed ? "bg-red-500 animate-notif-pulse" : "bg-green-500"
                    }`}
                  />
                )}
              </button>
            )}
            <button
              className="p-2 text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => setIsOpen((o) => !o)}
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              {isOpen ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* Mobile bell dropdown */}
      {bellOpen && authUser && (
        <div className="fixed inset-x-4 top-16 z-50 bg-white border border-gray-100 rounded-2xl shadow-xl md:hidden overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Notifications</span>
            <button onClick={() => setBellOpen(false)} className="text-gray-300 hover:text-gray-950 text-lg leading-none">×</button>
          </div>
          <NotificationList data={notif} onClose={() => setBellOpen(false)} />
        </div>
      )}

      {/* Mobile drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-16 md:hidden overflow-y-auto">
          <nav className="flex flex-col text-sm font-semibold text-gray-800">
            <Link href="/"       onClick={close} className="border-b border-gray-100 px-6 py-4 hover:bg-gray-50">Home</Link>
            <Link href="/browse" onClick={close} className="border-b border-gray-100 px-6 py-4 hover:bg-gray-50">Browse Artisans</Link>
            <Link href="/report" onClick={close} className="border-b border-gray-100 px-6 py-4 hover:bg-gray-50">Post a Job</Link>

            {authUser ? (
              <>
                <Link href="/dashboard" onClick={close} className="border-b border-gray-100 px-6 py-4 hover:bg-gray-50 font-black text-green-700">
                  My Dashboard
                </Link>
                <Link href="/profile" onClick={close} className="border-b border-gray-100 px-6 py-4 hover:bg-gray-50 flex items-center justify-between">
                  <span>My Profile</span>
                  {!notif.setupComplete && (
                    <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                      Incomplete
                    </span>
                  )}
                </Link>
                {authUser.isArtisan && (
                  <Link href="/artisan/dashboard" onClick={close} className="border-b border-gray-100 px-6 py-4 hover:bg-gray-50">
                    Artisan Hub
                  </Link>
                )}
                <button
                  onClick={signOut}
                  className="border-b border-gray-100 px-6 py-4 hover:bg-gray-50 text-left text-red-600 w-full"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth?next=/dashboard" onClick={close} className="border-b border-gray-100 px-6 py-4 hover:bg-gray-50">Sign In</Link>
                <Link href="/artisan/dashboard"    onClick={close} className="border-b border-gray-100 px-6 py-4 hover:bg-gray-50">Artisan Hub</Link>
                <Link href="/artisan/register"     onClick={close} className="border-b border-gray-100 px-6 py-4 hover:bg-gray-50">Become an Artisan</Link>
              </>
            )}

            <div className="px-6 py-5 space-y-3">
              <Link href="/report" onClick={close} className="block w-full bg-green-700 text-white text-center py-3.5 text-sm font-black hover:bg-green-800 rounded-xl">
                Hire an Artisan →
              </Link>
              {!authUser && (
                <Link href="/artisan/register" onClick={close} className="block w-full border border-gray-950 text-gray-950 text-center py-3.5 text-sm font-black hover:bg-gray-50 rounded-xl">
                  Offer Your Skills
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
