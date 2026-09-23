"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { checkBackendHealth } from "@/lib/api";

interface TopbarProps {
  onMenuToggle?: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    checkBackendHealth().then((online) => {
      if (mounted) setIsOnline(online);
    });
    const interval = setInterval(() => {
      checkBackendHealth().then((online) => {
        if (mounted) setIsOnline(online);
      });
    }, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  let activeContext = "Forensics Engine Ready";
  if (pathname.startsWith("/results")) {
    activeContext = "Forensic Assessment";
  } else if (pathname.startsWith("/investigation")) {
    const parts = pathname.split("/");
    activeContext = parts[2] || "Trajectory Investigation";
  } else if (pathname.startsWith("/history")) {
    activeContext = "Case Archive";
  }

  return (
    <header className="h-14 bg-paper/75 backdrop-blur-md border-b border-border-light px-6 sm:px-10 flex items-center justify-between select-none">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-1 -ml-1 text-ink-muted hover:text-ink transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-ink uppercase tracking-wider hidden sm:inline">
            ThreatTrace
          </span>
          <span className="text-border-strong hidden sm:inline">/</span>
          <span className="font-mono text-ink-muted text-xs">{activeContext}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-ink-muted">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isOnline ? "bg-accent-green" : "bg-threat-red"
          }`}
        />
        <span className="font-mono text-[11px] hidden sm:inline">
          {isOnline ? "Backend Connected" : "Backend Offline"}
        </span>
      </div>
    </header>
  );
}
