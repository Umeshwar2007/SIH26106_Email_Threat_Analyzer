"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ReceivedHop } from "@/types/threat";

interface ForensicPathProps {
  hops: ReceivedHop[];
  selectedHop: number | null;
  className?: string;
}

export function ForensicPath({
  hops,
  selectedHop,
  className = "",
}: ForensicPathProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const activePathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const isReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      pathRef.current.style.strokeDasharray = `${length}`;
      pathRef.current.style.strokeDashoffset = isReducedMotion ? "0" : `${length}`;

      if (!isReducedMotion) {
        gsap.to(pathRef.current, {
          strokeDashoffset: 0,
          duration: 1.2,
          ease: "power2.out",
          delay: 0.15,
        });
      }
    }
  }, [hops.length]);

  // Animate active illuminated branch when selectedHop changes
  useEffect(() => {
    if (!activePathRef.current) return;

    const isReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (selectedHop === null) {
      gsap.to(activePathRef.current, { opacity: 0, duration: 0.3 });
      return;
    }

    const totalHops = hops.length || 1;
    // Map selectedHop (1-indexed) to fraction of total height
    const hopIndex = Math.max(0, hops.findIndex((h) => h.hopNumber === selectedHop));
    const targetLength = (hopIndex / (totalHops - 1 || 1)) * 100;

    gsap.to(activePathRef.current, {
      opacity: 1,
      strokeDashoffset: 100 - targetLength,
      duration: isReducedMotion ? 0.01 : 0.5,
      ease: "power2.out",
    });
  }, [selectedHop, hops]);

  // Determine active branch color based on current selection verdict
  const currentHop = hops.find((h) => h.hopNumber === selectedHop);
  const isMalicious = currentHop?.isMalicious;
  const isDelay = (currentHop?.verdict || "").toLowerCase().includes("delay");

  const activeColor = isMalicious
    ? "#DC2626"
    : isDelay
    ? "#FF9F43"
    : "#18C77A";

  return (
    <svg
      aria-hidden="true"
      className={`absolute left-[3px] top-2.5 bottom-2.5 w-1 overflow-visible pointer-events-none ${className}`}
      viewBox="0 0 4 100"
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Underlying structural telemetry track */}
      <path
        ref={pathRef}
        d="M 2,0 L 2,100"
        stroke="#E8E8E5"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Dynamic illuminated forensic path */}
      <path
        ref={activePathRef}
        d="M 2,0 L 2,100"
        stroke={activeColor}
        strokeWidth="2"
        strokeLinecap="round"
        pathLength="100"
        style={{
          strokeDasharray: "100",
          strokeDashoffset: "100",
          opacity: 0,
        }}
      />
    </svg>
  );
}
