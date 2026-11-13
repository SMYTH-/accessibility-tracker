"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/home", label: "Home" },
  { href: "/challenge", label: "Challenge" },
  { href: "/activity", label: "Activity" },
  { href: "/profile", label: "Profile" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 overflow-x-auto border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--elevated)_92%,transparent)] backdrop-blur-md"
      aria-label="Primary"
    >
      <div className="mx-auto grid w-full max-w-lg grid-cols-4 items-stretch px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-center text-[clamp(0.55rem,2.6vw,0.7rem)] font-semibold leading-tight tracking-wide transition-colors ${
                active
                  ? "text-[var(--deep-sea)]"
                  : "text-[var(--mute)] hover:text-[var(--ink)]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`h-1 w-6 max-w-full shrink-0 rounded-full transition-opacity ${
                  active ? "bg-[var(--honey)] opacity-100" : "opacity-0"
                }`}
                aria-hidden
              />
              <span className="max-w-full break-words">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
