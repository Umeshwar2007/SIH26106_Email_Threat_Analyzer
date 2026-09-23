"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ToastProvider } from "../ui/ToastProvider";
import { InteractiveDotField } from "../visuals";
import { X } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-paper text-ink font-sans relative">
        {/* Full-Screen Interactive Wiggling Dot Field Background */}
        <InteractiveDotField
          density="medium"
          color="#111111"
          accentColor="#18C77A"
          interactionRadius={140}
          interactionStrength={0.95}
          baseOpacity={0.20}
          className="fixed inset-0 pointer-events-none z-0"
        />

        {/* Desktop Left Rail Sidebar */}
        <div className="hidden md:block shrink-0 h-full relative z-20">
          <Sidebar />
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-ink/20 backdrop-blur-xs"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative w-64 max-w-[80vw] h-full bg-paper z-10 border-r border-border-light shadow-drawer">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 text-ink-muted hover:text-ink p-1 rounded transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="w-4 h-4" />
              </button>
              <Sidebar onCloseMobile={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-transparent relative z-10">
          <Topbar onMenuToggle={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto bg-transparent relative">
            <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10 sm:py-14 relative z-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
