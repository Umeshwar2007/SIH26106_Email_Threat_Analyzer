"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

interface SidebarProps {
  onCloseMobile?: () => void;
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Analyze",
      href: "/analyze",
    },
    {
      name: "History",
      href: "/history",
    },
  ];

  return (
    <aside className="w-52 h-full bg-paper/75 backdrop-blur-md border-r border-border-light flex flex-col justify-between select-none py-8 px-6">
      {/* Brand Header */}
      <div className="space-y-10">
        <Link
          href="/analyze"
          onClick={onCloseMobile}
          className="flex items-center gap-2 group"
        >
          <span className="w-2 h-2 rounded-full bg-ink group-hover:bg-accent-green transition-colors" />
          <span className="font-semibold text-xs tracking-widest uppercase text-ink">
            ThreatTrace
          </span>
        </Link>

        {/* Minimal Navigation Links with Green Active Dot */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/analyze" && pathname.startsWith("/results")) ||
              (item.href === "/history" && pathname.startsWith("/investigation"));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onCloseMobile}
                className={clsx(
                  "flex items-center justify-between text-xs py-1.5 px-2 -mx-2 rounded transition-all",
                  isActive
                    ? "text-ink font-semibold bg-paper-muted"
                    : "text-ink-muted hover:text-ink hover:bg-paper-subtle"
                )}
              >
                <span>{item.name}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-green shrink-0 animate-in fade-in duration-300" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer System Stamp */}
      <div className="pt-6 border-t border-border-light space-y-1.5 text-[11px] font-mono text-ink-muted">
        <div className="flex items-center justify-between">
          <span>SIH26106</span>
          <span className="text-[10px] text-accent-green flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
            Online
          </span>
        </div>
        <div className="text-[10px] text-ink-subtle">Engine v1.02 · Active</div>
      </div>
    </aside>
  );
}
