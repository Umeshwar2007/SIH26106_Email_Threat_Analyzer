"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import gsap from "gsap";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = "max-w-md",
}: DrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      if (overlayRef.current && panelRef.current) {
        gsap.killTweensOf([overlayRef.current, panelRef.current]);
        gsap.set(overlayRef.current, { opacity: 0, display: "block" });
        gsap.set(panelRef.current, { x: "100%" });

        gsap.to(overlayRef.current, {
          opacity: 1,
          duration: 0.25,
          ease: "power2.out",
        });

        gsap.to(panelRef.current, {
          x: "0%",
          duration: 0.35,
          ease: "power3.out",
        });
      }
    } else {
      document.body.style.overflow = "";
      if (overlayRef.current && panelRef.current) {
        gsap.to(overlayRef.current, {
          opacity: 0,
          duration: 0.2,
          ease: "power2.in",
        });

        gsap.to(panelRef.current, {
          x: "100%",
          duration: 0.25,
          ease: "power3.in",
          onComplete: () => {
            if (overlayRef.current) {
              overlayRef.current.style.display = "none";
            }
          },
        });
      }
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div
      ref={overlayRef}
      style={{ display: "none" }}
      className="fixed inset-0 z-50 overflow-hidden bg-ink/20 backdrop-blur-xs"
    >
      <div className="absolute inset-0" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 flex pl-10 max-w-full">
        <div
          ref={panelRef}
          className={`w-screen ${width} bg-paper border-l border-border-light shadow-drawer flex flex-col`}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-light bg-paper">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-ink-muted">
                {subtitle || "Inspector"}
              </div>
              <h2 className="text-base font-semibold text-ink tracking-tight mt-0.5">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-ink-muted hover:text-ink hover:bg-paper-subtle transition-colors focus:outline-none"
              aria-label="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
