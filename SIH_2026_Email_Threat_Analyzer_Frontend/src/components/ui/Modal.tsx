"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import gsap from "gsap";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-2xl",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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
      if (overlayRef.current && contentRef.current) {
        gsap.killTweensOf([overlayRef.current, contentRef.current]);
        gsap.set(overlayRef.current, { opacity: 0, display: "flex" });
        gsap.set(contentRef.current, { opacity: 0, scale: 0.98, y: 8 });

        gsap.to(overlayRef.current, {
          opacity: 1,
          duration: 0.2,
          ease: "power2.out",
        });

        gsap.to(contentRef.current, {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.25,
          ease: "power2.out",
        });
      }
    } else {
      document.body.style.overflow = "";
      if (overlayRef.current && contentRef.current) {
        gsap.to(contentRef.current, {
          opacity: 0,
          scale: 0.98,
          y: 4,
          duration: 0.15,
          ease: "power2.in",
        });

        gsap.to(overlayRef.current, {
          opacity: 0,
          duration: 0.18,
          ease: "power2.in",
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-ink/30 backdrop-blur-xs"
    >
      <div className="absolute inset-0" onClick={onClose} />
      <div
        ref={contentRef}
        className={`relative w-full ${maxWidth} bg-paper border border-border-light shadow-elevated rounded-lg flex flex-col max-h-[90vh] overflow-hidden z-10`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light bg-paper">
          <div>
            {subtitle && (
              <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                {subtitle}
              </div>
            )}
            <h3 className="text-sm font-semibold text-ink tracking-tight mt-0.5">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-ink-muted hover:text-ink hover:bg-paper-subtle transition-colors focus:outline-none"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
