"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDemoRole, setDemoRole, ROLE_META, DEMO_PERSONAS } from "@/lib/demo-auth";
import { DemoRole } from "@/lib/types";

const ROLES: DemoRole[] = ["user", "artisan", "admin"];

export default function DemoModeBanner() {
  const [role, setRole] = useState<DemoRole>("user");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setRole(getDemoRole());
    const handler = (e: Event) => setRole((e as CustomEvent<DemoRole>).detail);
    window.addEventListener("fixmate-role-changed", handler);
    return () => window.removeEventListener("fixmate-role-changed", handler);
  }, []);

  const handleSwitch = (r: DemoRole) => {
    setDemoRole(r);
    setRole(r);
    setExpanded(false);
  };

  const meta = ROLE_META[role];
  const persona = DEMO_PERSONAS[role];

  return (
    <div className="border-b border-amber-200 bg-amber-50 font-sans">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 sm:px-6">
        <span className="shrink-0 rounded-none bg-amber-700 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
          Demo Mode
        </span>
        <span className="hidden text-xs text-amber-700 sm:block">
          Hackathon judging — no real payments · OPay is simulated · Firebase auth is optional
        </span>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs font-medium text-amber-800 sm:block">View as:</span>
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => handleSwitch(r)}
              className={`px-3 py-1 text-xs font-bold border transition-colors ${
                role === r
                  ? `${meta.badge} text-white border-transparent`
                  : "bg-white border-amber-300 text-amber-700 hover:border-amber-500"
              }`}
            >
              {ROLE_META[r].label}
            </button>
          ))}
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1 text-xs text-amber-600 hover:text-amber-800"
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-amber-200 bg-white px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-700">
              Current persona: {persona.name}
            </p>
            <p className="mb-3 text-xs text-gray-600">{persona.description}</p>
            <div className="flex flex-wrap gap-3">
              <Link href={meta.path} className="text-xs font-bold text-green-700 underline hover:text-green-900">
                → Go to {ROLE_META[role].label} Dashboard
              </Link>
              <Link href="/opay-simulator" className="text-xs font-bold text-blue-700 underline hover:text-blue-900">
                → OPay Simulator
              </Link>
              <Link href="/ussd-demo" className="text-xs font-bold text-purple-700 underline hover:text-purple-900">
                → USSD Demo
              </Link>
              <Link href="/whatsapp-demo" className="text-xs font-bold text-green-700 underline hover:text-green-900">
                → WhatsApp Demo
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
