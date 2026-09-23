"use client";

import React from "react";
import clsx from "clsx";
import { AuthStatus, SeverityLevel } from "@/types/threat";

interface SeverityBadgeProps {
  severity: SeverityLevel | string;
  size?: "sm" | "md";
  label?: string;
  className?: string;
}

export function SeverityBadge({
  severity,
  size = "md",
  label,
  className = "",
}: SeverityBadgeProps) {
  const sev = (severity || "").toLowerCase();

  const isCritical = sev.includes("critical");
  const isHigh = sev === "high";
  const isMedium = sev === "medium" || sev.includes("suspicious");
  const isLow = sev === "low";
  const isSafe = sev === "safe" || sev === "clean";

  const dotColor = isCritical
    ? "bg-threat-red"
    : isHigh
    ? "bg-accent-amber"
    : isMedium
    ? "bg-accent-amber"
    : isLow
    ? "bg-accent-green"
    : isSafe
    ? "bg-accent-green"
    : "bg-ink-muted";

  const textColor = isCritical
    ? "text-threat-red font-medium"
    : isHigh
    ? "text-accent-amber font-medium"
    : isMedium
    ? "text-accent-amber font-medium"
    : isLow
    ? "text-accent-green font-medium"
    : isSafe
    ? "text-accent-green font-medium"
    : "text-ink-muted";

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 font-sans tracking-tight select-none",
        size === "sm" ? "text-[11px]" : "text-xs",
        textColor,
        className
      )}
    >
      <span className={clsx("rounded-full shrink-0", size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2", dotColor)} />
      <span>{label || severity}</span>
    </span>
  );
}

export function AuthBadge({
  status,
  label,
}: {
  status: AuthStatus | string;
  label?: string;
}) {
  const s = (status || "").toLowerCase().trim();

  // Distinct states mapping as strictly mandated by forensic requirements
  const isPass = s === "pass";
  const isFail = s === "fail" || s === "permerror" || s === "spoofed" || s === "mismatch";
  const isSoftfail = s === "softfail" || s === "neutral";
  const isNone = s === "none";
  const isNotChecked = s === "not_checked" || s === "not-checked" || s === "unverified";
  const isError = s === "temperror" || s === "error";

  let displayLabel = label;
  if (!displayLabel) {
    if (isPass) displayLabel = "Pass";
    else if (isFail) displayLabel = s === "permerror" ? "Perm Error" : "Fail";
    else if (isSoftfail) displayLabel = s === "softfail" ? "Softfail" : "Neutral";
    else if (isNone) displayLabel = "None";
    else if (isNotChecked) displayLabel = "Not Checked";
    else if (isError) displayLabel = s === "temperror" ? "Temp Error" : "Error";
    else displayLabel = status.toUpperCase();
  }

  const badgeStyle = isPass
    ? "text-accent-green bg-accent-greenBg border-accent-greenBorder"
    : isFail
    ? "text-threat-red bg-threat-redBg border-threat-redBorder"
    : isSoftfail
    ? "text-accent-amber bg-accent-amberBg border-accent-amberBorder"
    : isNotChecked
    ? "text-ink-muted bg-paper-subtle border-border-light"
    : isNone
    ? "text-ink-subtle bg-paper-subtle border-border-light"
    : isError
    ? "text-threat-red bg-threat-redBg border-threat-redBorder"
    : "text-ink-muted bg-paper-subtle border-border-light";

  const dotColor = isPass
    ? "bg-accent-green"
    : isFail
    ? "bg-threat-red"
    : isSoftfail
    ? "bg-accent-amber"
    : isNotChecked
    ? "bg-border-strong"
    : isNone
    ? "bg-border-strong"
    : isError
    ? "bg-threat-red"
    : "bg-ink-muted";

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase border font-medium",
        badgeStyle
      )}
    >
      <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", dotColor)} />
      <span>{displayLabel}</span>
    </span>
  );
}
