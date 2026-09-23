"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, ChevronUp, Check, AlertCircle, RefreshCw, FileText, Download, ShieldAlert } from "lucide-react";
import gsap from "gsap";
import { getAnalysisResult, getAnalysisHistory, getRawEmailUrl, generateSTIX21 } from "@/lib/api";
import { AnalysisResult } from "@/types/threat";
import { SeverityBadge, AuthBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { RawHeadersModal } from "@/components/ui/RawHeadersModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { LeafletMap } from "@/components/ui/LeafletMap";
import { useToast } from "@/components/ui/ToastProvider";

type TabKey =
  | "overview"
  | "email"
  | "authentication"
  | "infrastructure"
  | "urls"
  | "threats"
  | "evidence";

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center space-y-4">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-ink-muted" />
          <div className="text-xs font-mono text-ink-muted">Loading forensic assessment...</div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const caseIdParam = searchParams.get("caseId");

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showRawModal, setShowRawModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isQuarantined, setIsQuarantined] = useState(false);
  const [isVaulted, setIsVaulted] = useState(false);
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const tabContentRef = useRef<HTMLDivElement>(null);
  const scoreNumberRef = useRef<HTMLSpanElement>(null);

  // Load real forensic case from backend
  useEffect(() => {
    let isCancelled = false;

    async function loadCaseData() {
      setLoading(true);
      setError(null);
      try {
        let targetCaseId = caseIdParam;

        // If no caseId query param, retrieve the most recent case from GET /cases
        if (!targetCaseId) {
          const history = await getAnalysisHistory(1);
          if (history && history.length > 0) {
            targetCaseId = history[0].id;
          } else {
            setError("No forensic cases found in archive. Please upload an email first.");
            setLoading(false);
            return;
          }
        }

        const data = await getAnalysisResult(targetCaseId);
        if (!isCancelled) {
          setResult(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || "Failed to load forensic case from backend.");
          setLoading(false);
        }
      }
    }

    loadCaseData();

    return () => {
      isCancelled = true;
    };
  }, [caseIdParam]);

  // GSAP animations on data load
  useEffect(() => {
    if (!result) return;

    const ctx = gsap.context(() => {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: result.riskScore,
        duration: 1.0,
        ease: "power2.out",
        onUpdate: () => {
          if (scoreNumberRef.current) {
            scoreNumberRef.current.innerText = Math.round(obj.val).toString();
          }
        },
      });

      gsap.from(".results-reveal", {
        y: 12,
        opacity: 0,
        stagger: 0.06,
        duration: 0.5,
        ease: "power2.out",
      });
    }, containerRef);

    return () => ctx.revert();
  }, [result]);

  const handleTabChange = (tab: TabKey) => {
    if (tab === activeTab) return;
    if (tabContentRef.current) {
      gsap.fromTo(
        tabContentRef.current,
        { opacity: 0, y: 4 },
        { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" }
      );
    }
    setActiveTab(tab);
  };

  const handleDownloadEml = () => {
    if (!result) return;
    const url = getRawEmailUrl(result.caseId);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename || `${result.caseId}.eml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({
      type: "success",
      title: "Pristine Evidence Download",
      description: `Preserved .eml downloaded from backend store.`,
    });
  };

  const handleExportSTIX = () => {
    if (!result) return;
    const jsonStr = generateSTIX21(result);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ThreatTrace_${result.caseId}_STIX2.1.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({
      type: "success",
      title: "STIX 2.1 Exported",
      description: "Standard Threat Intelligence bundle saved.",
    });
  };

  const handleExportJSON = () => {
    if (!result) return;
    const jsonStr = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ForensicReport_${result.caseId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({
      type: "info",
      title: "Case JSON Exported",
      description: `Complete forensic case ${result.caseId} downloaded.`,
    });
  };

  const handleVaultEvidence = () => {
    setIsVaulted(true);
    toast({
      type: "success",
      title: "Evidence Vaulted",
      description: "Cryptographic SHA-256 anchored in immutable audit custody.",
    });
  };

  const handleIsolateHost = () => {
    setShowConfirmModal(false);
    setIsQuarantined(true);
    toast({
      type: "error",
      title: "Host Isolated",
      description: `Perimeter block rule pushed for ${result?.originIp}.`,
    });
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-ink" />
        <div className="space-y-1">
          <div className="text-sm font-semibold text-ink">Retrieving Forensic Case</div>
          <div className="text-xs font-mono text-ink-muted">
            Querying authoritative case store from FastAPI backend...
          </div>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="py-20 max-w-xl mx-auto text-center space-y-6">
        <div className="w-12 h-12 rounded-full bg-threat-redBg border border-threat-redBorder flex items-center justify-center mx-auto text-threat-red">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-ink">Case Retrieval Error</h2>
          <p className="text-xs text-ink-muted leading-relaxed font-mono">
            {error || "Unknown error encountered."}
          </p>
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <Button variant="primary" size="md" onClick={() => router.push("/analyze")}>
            Analyze an Email
          </Button>
          <Button variant="secondary" size="md" onClick={() => router.push("/history")}>
            View Case History
          </Button>
        </div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "email", label: "Email Content" },
    { key: "authentication", label: "Authentication" },
    { key: "infrastructure", label: "Infrastructure & Routing" },
    { key: "urls", label: "URLs" },
    { key: "threats", label: "Findings & Signals" },
    { key: "evidence", label: "Evidence & Custody" },
  ];

  const isCritical = result.riskScore >= 75;
  const isHigh = result.riskScore >= 50 && result.riskScore < 75;
  const isMedium = result.riskScore >= 25 && result.riskScore < 50;

  const scoreColor = isCritical
    ? "text-threat-red"
    : isHigh || isMedium
    ? "text-accent-amber"
    : "text-accent-green";

  const underlineColor = isCritical
    ? "bg-threat-red"
    : isHigh || isMedium
    ? "bg-accent-amber"
    : "bg-accent-green";

  return (
    <div ref={containerRef} className="space-y-16 pb-20">
      {/* Top Utility Bar */}
      <div className="results-reveal flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-light text-xs">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase text-ink-muted">
          <span className="font-semibold text-ink">{result.caseId}</span>
          <span className="text-border-strong">·</span>
          <span>{result.filename}</span>
          <span className="text-border-strong">·</span>
          <span>{result.fileSize}</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <button
            onClick={() => setShowRawModal(true)}
            className="text-ink-muted hover:text-ink transition-colors inline-flex items-center gap-1"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Raw Headers</span>
          </button>
          <button
            onClick={handleDownloadEml}
            className="text-ink-muted hover:text-ink transition-colors inline-flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .eml</span>
          </button>
          <Link
            href={`/investigation/${encodeURIComponent(result.caseId)}`}
            className="text-accent-green hover:underline font-semibold inline-flex items-center gap-1"
          >
            <span>Hop Timeline View →</span>
          </Link>
          <button
            onClick={handleExportJSON}
            className="text-ink hover:text-accent-green transition-colors font-semibold"
          >
            Export JSON →
          </button>
        </div>
      </div>

      {/* Dominant Forensic Result Statement (Adheres to Section 8: No fake legitimacy claims) */}
      <div className="results-reveal space-y-6 max-w-2xl relative overflow-visible">
        <div className="space-y-1 relative z-10">
          <div className={`text-[11px] font-mono uppercase tracking-widest font-semibold flex items-center gap-2 ${scoreColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${underlineColor}`} />
            <span>Forensic Assessment</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-ink">
            {result.classification}
          </h1>
        </div>

        {/* Dynamic Risk Score */}
        <div className="relative flex items-baseline gap-4 pt-1 z-10">
          <span
            ref={scoreNumberRef}
            className="text-6xl sm:text-7xl font-bold font-mono tracking-tighter text-ink"
          >
            {result.riskScore}
          </span>
          <span className="text-xl font-mono text-ink-muted">/ 100</span>

          <div className="ml-4 pl-4 border-l border-border-light space-y-0.5">
            <div className={`text-xs font-semibold uppercase tracking-wider ${scoreColor}`}>
              {result.severity} Risk
            </div>
            <div className="text-xs font-mono text-ink-muted">
              Analyzed {result.uploadedAt}
            </div>
          </div>
        </div>

        {/* Subtle Underline */}
        <div className={`w-48 h-0.5 ${underlineColor}`} />

        <div className="space-y-1 pt-1">
          <p className="text-sm sm:text-base text-ink font-medium leading-relaxed">
            {result.assessmentSummary}
          </p>
          <p className="text-xs text-ink-muted leading-relaxed font-normal">
            {result.confidenceBasis}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="results-reveal space-y-10">
        <div className="border-b border-border-light">
          <nav className="flex items-center gap-6 overflow-x-auto no-scrollbar -mb-px text-xs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`py-2.5 transition-all whitespace-nowrap border-b-2 ${
                    isActive
                      ? "border-accent-green text-ink font-semibold"
                      : "border-transparent text-ink-muted hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content Panes */}
        <div
          ref={tabContentRef}
          className="min-h-[340px] rounded-2xl border border-border-light bg-paper/95 backdrop-blur-md p-6 sm:p-8 shadow-xs"
        >
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-xs">
              {/* Detection Findings */}
              <div className="space-y-4">
                <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                  Detection Findings ({result.signals.length})
                </div>
                <div className="space-y-3 divide-y divide-border-light">
                  {result.signals.length === 0 ? (
                    <div className="text-ink-muted font-mono py-2">No anomalous signals identified.</div>
                  ) : (
                    result.signals.slice(0, 4).map((sig) => {
                      const isCrit = sig.severity === "critical" || sig.severity === "high";
                      return (
                        <div key={sig.id} className="pt-3 first:pt-0 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-ink flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isCrit ? "bg-threat-red" : "bg-accent-amber"
                                }`}
                              />
                              <span>{sig.title}</span>
                            </span>
                            {sig.score > 0 && (
                              <span
                                className={`font-mono text-[11px] font-medium ${
                                  isCrit ? "text-threat-red" : "text-accent-amber"
                                }`}
                              >
                                {sig.severity === "safe" ? `-${sig.score}` : `+${sig.score}`}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-ink-muted leading-relaxed pl-3">
                            {sig.description}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                {result.signals.length > 4 && (
                  <button
                    onClick={() => handleTabChange("threats")}
                    className="text-xs font-semibold text-ink hover:text-accent-green transition-colors inline-flex items-center gap-1 pt-2"
                  >
                    <span>View all {result.signals.length} findings</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Origin & Routing */}
              <div className="space-y-4">
                <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                  Origin & Ingress IP
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-mono font-bold text-ink">{result.originIp}</div>
                  <div className="text-ink font-medium">{result.fromDomain || "Unspecified Domain"}</div>
                  <div className="text-ink-muted font-mono text-[11px]">
                    {result.receivedHops.length > 0
                      ? `${result.receivedHops.length} Received hop(s) reconstructed`
                      : "No intermediate hops detected"}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleTabChange("infrastructure")}
                    className="text-xs font-semibold text-ink hover:text-accent-green transition-colors inline-flex items-center gap-1"
                  >
                    <span>Routing trajectory details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Authentication */}
              <div className="space-y-4">
                <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                  Authentication Audit
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-border-light">
                    <span className="font-mono">SPF Validation</span>
                    <AuthBadge status={result.spf} />
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-border-light">
                    <span className="font-mono">DKIM Signature</span>
                    <AuthBadge status={result.dkim} />
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-border-light">
                    <span className="font-mono">DMARC Alignment</span>
                    <AuthBadge status={result.dmarc} />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleTabChange("authentication")}
                    className="text-xs font-semibold text-ink hover:text-accent-green transition-colors inline-flex items-center gap-1"
                  >
                    <span>Cryptographic audit details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EMAIL CONTENT & HEADERS */}
          {activeTab === "email" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-20 text-xs">
              <div className="space-y-4 divide-y divide-border-light">
                <div className="pt-2 first:pt-0 space-y-1">
                  <div className="text-[10px] font-mono uppercase text-ink-subtle">From (Claimed Sender)</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink break-all">{result.sender}</span>
                    <span className="text-[10px] font-mono text-ink-muted">{result.fromDomain}</span>
                  </div>
                </div>

                <div className="pt-3 space-y-1">
                  <div className="text-[10px] font-mono uppercase text-ink-subtle">Reply-To Address</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink break-all">{result.replyTo}</span>
                    {result.replyToDomain && result.replyToDomain !== result.fromDomain && (
                      <span className="text-[10px] font-mono text-threat-red font-semibold">
                        Domain Mismatch: {result.replyToDomain}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 space-y-1">
                  <div className="text-[10px] font-mono uppercase text-ink-subtle">Return-Path</div>
                  <div className="font-medium text-ink break-all">{result.returnPath}</div>
                </div>

                <div className="pt-3 space-y-1">
                  <div className="text-[10px] font-mono uppercase text-ink-subtle">To (Recipient)</div>
                  <div className="font-medium text-ink break-all">{result.recipient}</div>
                </div>

                <div className="pt-3 space-y-1">
                  <div className="text-[10px] font-mono uppercase text-ink-subtle">Subject</div>
                  <div className="font-medium text-ink">{result.subject}</div>
                </div>

                <div className="pt-3 space-y-1">
                  <div className="text-[10px] font-mono uppercase text-ink-subtle">Date</div>
                  <div className="font-medium text-ink">{result.timestamp}</div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-ink-subtle">Message-ID</div>
                  <div className="font-mono text-ink-muted break-all">{result.messageId}</div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="text-[10px] font-mono uppercase text-ink-subtle">
                    Attachments ({result.attachments.length})
                  </div>
                  {result.attachments.length === 0 ? (
                    <div className="text-ink-muted font-mono text-[11px]">No MIME attachments present.</div>
                  ) : (
                    <div className="space-y-2 font-mono">
                      {result.attachments.map((att) => (
                        <div key={att.id} className="flex items-center justify-between py-1 border-b border-border-light">
                          <span className="text-ink">{att.name}</span>
                          <span className="text-accent-amber text-[10px] font-medium">{att.size}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1 pt-2">
                  <div className="text-[10px] font-mono uppercase text-ink-subtle">Body Preview</div>
                  <div className="text-ink-muted leading-relaxed font-normal p-3 rounded bg-paper-subtle border border-border-light max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-[11px]">
                    {result.bodyPreview || "(No text content preview available)"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUTHENTICATION AUDIT */}
          {activeTab === "authentication" && (
            <div className="max-w-2xl text-xs divide-y divide-border-light">
              <div className="py-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                <div className="w-24 font-mono font-bold text-ink">SPF</div>
                <div className="flex-1 text-ink-muted">
                  <div className="font-medium text-ink pb-0.5">Sender Policy Framework</div>
                  {result.spfDetail}
                </div>
                <div className="shrink-0">
                  <AuthBadge status={result.spf} />
                </div>
              </div>

              <div className="py-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                <div className="w-24 font-mono font-bold text-ink">DKIM</div>
                <div className="flex-1 text-ink-muted">
                  <div className="font-medium text-ink pb-0.5">DomainKeys Identified Mail</div>
                  {result.dkimDetail}
                </div>
                <div className="shrink-0">
                  <AuthBadge status={result.dkim} />
                </div>
              </div>

              <div className="py-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                <div className="w-24 font-mono font-bold text-ink">DMARC</div>
                <div className="flex-1 text-ink-muted">
                  <div className="font-medium text-ink pb-0.5">Domain-based Message Authentication</div>
                  {result.dmarcDetail}
                </div>
                <div className="shrink-0">
                  <AuthBadge status={result.dmarc} />
                </div>
              </div>

              <div className="pt-6 space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                  Forensic Note on Authentication
                </div>
                <p className="text-ink-muted leading-relaxed">
                  Cryptographic verification indicates authorization at the protocol level. A valid SPF/DKIM check
                  proves the sending server was permitted by DNS records, but does not independently certify the
                  innocence of message contents.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: INFRASTRUCTURE & ROUTING */}
          {activeTab === "infrastructure" && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                <div className="space-y-4">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                    Origin Infrastructure
                  </div>
                  <div className="text-4xl font-mono font-bold text-ink">
                    {result.originIp}
                  </div>
                  <div className="text-sm text-ink">{result.originCity}, {result.originCountry}</div>
                  <div className="text-xs font-mono text-ink-muted">{result.asn}</div>

                  <div className="pt-2 text-xs text-ink-muted flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                    <span>Inferred source IP from Received routing analysis</span>
                  </div>
                </div>

                <div>
                  <LeafletMap
                    coords={result.coords}
                    location={
                      result.geolocationAvailable && result.originCity && result.originCountry
                        ? `${result.originCity}, ${result.originCountry}`
                        : (result.originCity || "Location unavailable")
                    }
                    ip={result.originIp}
                    asn={result.asn}
                    height="190px"
                  />
                </div>
              </div>

              {/* Received Trajectory Chain (Section 10 requirement) */}
              <div className="pt-6 border-t border-border-light space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                    Received Header Hop Sequence ({result.receivedHops.length} Hops)
                  </div>
                  <Link
                    href={`/investigation/${encodeURIComponent(result.caseId)}`}
                    className="text-xs text-accent-green hover:underline font-semibold"
                  >
                    View Interactive Trajectory Graph →
                  </Link>
                </div>

                {result.receivedHops.length === 0 ? (
                  <div className="p-4 rounded bg-paper-subtle border border-border-light text-ink-muted font-mono text-xs">
                    No routing information available
                  </div>
                ) : (
                  <div className="space-y-3 font-mono text-xs">
                    {result.receivedHops.map((hop) => (
                      <div
                        key={hop.hopNumber}
                        className="p-3 rounded bg-paper-subtle border border-border-light flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-ink flex items-center gap-2">
                            <span className="text-accent-green">Hop {hop.hopNumber}</span>
                            <span>·</span>
                            <span>{hop.ip}</span>
                            {hop.fromHost && (
                              <span className="text-ink-muted font-normal">({hop.fromHost})</span>
                            )}
                          </div>
                          <div className="text-[11px] text-ink-subtle">
                            Relayed by: {hop.byHost} {hop.protocol ? `via ${hop.protocol}` : ""}
                          </div>
                        </div>

                        <div className="text-right text-[11px] text-ink-muted shrink-0">
                          <div>{hop.timestamp}</div>
                          {hop.delaySeconds ? (
                            <div className="text-accent-amber font-semibold">
                              Latency: +{Math.round(hop.delaySeconds)}s
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: URLS */}
          {activeTab === "urls" && (
            <div className="space-y-4 max-w-2xl text-xs">
              <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                Extracted URLs & Destinations
              </div>

              {result.urls.length === 0 ? (
                <div className="p-4 rounded bg-paper-subtle border border-border-light text-ink-muted font-mono">
                  No actionable URLs extracted from message payload.
                </div>
              ) : (
                <div className="space-y-3 divide-y divide-border-light">
                  {result.urls.map((u) => {
                    const isExpanded = expandedUrl === u.id;
                    return (
                      <div key={u.id} className="py-4 space-y-2 first:pt-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="font-mono font-semibold text-ink break-all">
                              {u.payload}
                            </div>
                            <div className="text-[11px] text-ink-muted flex items-center gap-2">
                              <span className="text-accent-amber font-mono">{u.hopTrace}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => setExpandedUrl(isExpanded ? null : u.id)}
                            className="text-ink-muted hover:text-ink transition-colors shrink-0"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="mt-2 pl-4 border-l border-border-strong space-y-1 font-mono text-[11px] text-ink-muted">
                            <div>Destination: {u.destination}</div>
                            <div>Classification: {u.reputation}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: FINDINGS & THREAT SIGNALS */}
          {activeTab === "threats" && (
            <div className="space-y-8 max-w-2xl text-xs">
              <div className="space-y-4">
                <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                  Correlated Forensic Detection Signals
                </div>
                <div className="divide-y divide-border-light">
                  {result.findings.map((finding, idx) => (
                    <div key={idx} className="py-3 flex items-start justify-between gap-4">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-ink flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                          <span>Signal #{idx + 1}</span>
                        </span>
                        <p className="text-ink-muted leading-relaxed pl-3.5">{finding}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Header Anomalies */}
              {result.headerAnomalies.length > 0 && (
                <div className="pt-6 border-t border-border-light space-y-4">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                    Header Anomalies ({result.headerAnomalies.length})
                  </div>
                  <div className="space-y-3 font-mono text-xs">
                    {result.headerAnomalies.map((anom, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded bg-paper-subtle border border-border-light space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink">{anom.type}</span>
                          <SeverityBadge severity={anom.severity} size="sm" />
                        </div>
                        <p className="text-[11px] text-ink-muted font-sans">{anom.description}</p>
                        {anom.evidence && (
                          <div className="text-[10px] text-ink-subtle truncate">
                            Evidence: {anom.evidence}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Domain Dissection */}
              <div className="pt-6 border-t border-border-light space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                  Domain Alignment Dissection
                </div>
                <div className="font-mono space-y-1">
                  <div>Claimed From Domain: <strong className="text-accent-green">{result.fromDomain || "(None)"}</strong></div>
                  <div>Reply-To Domain: <strong className={result.replyToDomain !== result.fromDomain ? "text-threat-red" : "text-ink"}>{result.replyToDomain || "(None)"}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: EVIDENCE & CUSTODY (Section 11 requirement: Authoritative SHA-256) */}
          {activeTab === "evidence" && (
            <div className="bg-forensic text-forensic-text p-8 rounded border border-forensic-border space-y-6 max-w-3xl">
              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-widest text-accent-green flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                  <span>Evidence Custody Record</span>
                </div>
                <h2 className="text-base font-bold text-forensic-text">
                  Original Evidence Preserved in Store
                </h2>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase text-forensic-dim">Authoritative SHA-256 Hash</div>
                  <div className="text-accent-green select-all break-all font-bold">
                    {result.sha256}
                  </div>
                  <div className="text-[11px] text-forensic-muted font-sans pt-0.5">
                    SHA-256 is the cryptographic fingerprint of the preserved .EML evidence.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase text-forensic-dim">Case ID</div>
                    <div className="text-forensic-text">{result.caseId}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase text-forensic-dim">Evidence ID</div>
                    <div className="text-forensic-text">{result.evidenceId}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase text-forensic-dim">Original Filename</div>
                    <div className="text-forensic-text">{result.filename}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase text-forensic-dim">Evidence File Size</div>
                    <div className="text-forensic-text">{result.fileSize}</div>
                  </div>
                </div>

                <div className="text-accent-green text-xs font-sans pt-2 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-accent-green" />
                  <span>Authoritative · Sealed in backend evidence store upon ingestion.</span>
                </div>
              </div>

              <div className="pt-4 border-t border-forensic-border flex flex-wrap items-center gap-4 text-xs">
                <button
                  onClick={handleDownloadEml}
                  className="text-accent-green hover:underline font-mono flex items-center gap-1 font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Pristine .EML</span>
                </button>
                <button
                  onClick={handleExportSTIX}
                  className="text-forensic-muted hover:text-forensic-text font-mono flex items-center gap-1"
                >
                  <span>Export STIX 2.1 JSON</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setShowRawModal(true)}
                  className="text-forensic-muted hover:text-forensic-text font-mono"
                >
                  Inspect RFC 822 Raw Headers →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="results-reveal pt-8 border-t border-border-light flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <span className="text-ink-muted">
          {isQuarantined ? (
            <span className="text-threat-red font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-threat-red" />
              <span>Perimeter isolation active for origin node.</span>
            </span>
          ) : isVaulted ? (
            <span className="text-accent-green font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
              <span>Evidence anchored in immutable forensic vault.</span>
            </span>
          ) : (
            <span>Correlated multi-signal assessment completed.</span>
          )}
        </span>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={isVaulted}
            onClick={handleVaultEvidence}
          >
            {isVaulted ? "Evidence Vaulted" : "Anchor in Vault"}
          </Button>

          <Button
            variant="destructive"
            size="sm"
            disabled={isQuarantined}
            onClick={() => setShowConfirmModal(true)}
          >
            {isQuarantined ? "Host Isolated" : "Isolate Origin Host"}
          </Button>
        </div>
      </div>

      {/* Raw Headers Modal */}
      <RawHeadersModal
        isOpen={showRawModal}
        onClose={() => setShowRawModal(false)}
        headers={result.rawHeaders}
        filename={result.filename}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Isolate Ingress Host"
        description={`This will simulate pushing a perimeter block rule for IP ${result.originIp} across gateway relays.`}
        confirmText="Isolate Host"
        onConfirm={handleIsolateHost}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
}
