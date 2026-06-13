"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [phase, setPhase] = useState<"in" | "hold" | "out" | "done">("in");

  useEffect(() => {
    // Don't show again in the same session
    if (sessionStorage.getItem("splash_shown")) {
      setPhase("done");
      return;
    }

    const t1 = setTimeout(() => setPhase("hold"), 600);   // logo fades in
    const t2 = setTimeout(() => setPhase("out"),  1800);  // start exit
    const t3 = setTimeout(() => {
      setPhase("done");
      sessionStorage.setItem("splash_shown", "1");
    }, 2500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
      style={{
        opacity: phase === "out" ? 0 : 1,
        transition: phase === "out" ? "opacity 0.55s ease-in" : "none",
        pointerEvents: phase === "out" ? "none" : "all",
      }}
    >
      {/* Logo */}
      <div
        style={{
          opacity: phase === "in" ? 0 : 1,
          transform: phase === "in" ? "scale(0.88)" : "scale(1)",
          transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
        }}
        className="flex flex-col items-center gap-5"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/isabi-logo.svg"
          alt="iSabi"
          className="w-40 h-auto"
        />

        <p className="text-sm text-gray-400 font-semibold tracking-wide text-center px-6">
          Find the right hand for the job, anywhere in Nigeria.
        </p>

        {/* Thin animated underline */}
        <div className="relative h-0.5 w-32 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-green-500 rounded-full"
            style={{
              width: phase === "hold" || phase === "out" ? "100%" : "0%",
              transition: "width 1s ease-in-out",
            }}
          />
        </div>
      </div>

      {/* Bottom tag */}
      <p
        className="absolute bottom-8 text-[10px] font-bold tracking-widest uppercase text-gray-300"
        style={{
          opacity: phase === "in" ? 0 : 1,
          transition: "opacity 0.6s ease-out 0.3s",
        }}
      >
        WeSabi who go fix am
      </p>
    </div>
  );
}
