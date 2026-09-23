"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Check,
  Share2,
  Download,
  AlertCircle,
  RefreshCw,
  FileText,
} from "lucide-react";
import gsap from "gsap";
import { getInvestigation, getRawEmailUrl } from "@/lib/api";
import { AnalysisResult, IPIntelligence, ReceivedHop } from "@/types/threat";
import { Drawer } from "@/components/ui/Drawer";
import { ThreatGraphModal } from "@/components/ui/ThreatGraphModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { ForensicPath } from "@/components/visuals";

export default function InvestigationPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const caseId = (params?.caseId as string) || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [hops, setHops] = useState<ReceivedHop[]>([]);
  const [ipIntel, setIpIntel] = useState<IPIntelligence | null>(null);

  const [selectedHop, setSelectedHop] = useState<number | null>(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [graphModalOpen, setGraphModalOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isFirewallBlocked, setIsFirewallBlocked] = useState(false);
  const [copiedCidr, setCopiedCidr] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      if (!caseId) {
        setError("Invalid or missing Case ID.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const bundle = await getInvestigation(caseId);
        if (!isCancelled) {
          setResult(bundle.result);
          setHops(bundle.hops);
          setIpIntel(bundle.ipIntel);
          if (bundle.hops.length > 0) {
            setSelectedHop(bundle.hops[0].hopNumber);
          } else {
            setSelectedHop(null);
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || "Failed to load investigation details.");
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [caseId]);

  useEffect(() => {
    if (!result) return;
    const ctx = gsap.context(() => {
      gsap.from(".investigation-reveal", {
        y: 12,
        opacity: 0,
        stagger: 0.06,
        duration: 0.5,
        ease: "power2.out",
      });
    }, containerRef);

    return () => ctx.revert();
  }, [result]);

  const handleCopyCidr = () => {
    if (!ipIntel) return;
    navigator.clipboard.writeText(ipIntel.subnet);
    setCopiedCidr(true);
    toast({
      type: "success",
      title: "CIDR Copied",
      description: `Copied: ${ipIntel.subnet}`,
    });
    setTimeout(() => setCopiedCidr(false), 2000);
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
      title: "Evidence Downloaded",
      description: `Original .eml downloaded from backend evidence store.`,
    });
  };

  const handleAddFirewallBlock = () => {
    setShowConfirmModal(false);
    setIsFirewallBlocked(true);
    toast({
      type: "error",
      title: "Perimeter Isolation Enforced",
      description: `Firewall block rule active for ${ipIntel?.ip}`,
    });
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-ink" />
        <div className="space-y-1">
          <div className="text-sm font-semibold text-ink">Reconstructing Received Trajectory</div>
          <div className="text-xs font-mono text-ink-muted">
            Analyzing routing hops and network infrastructure for {caseId}...
          </div>
        </div>
      </div>
    );
  }

  if (error || !result || !ipIntel) {
    return (
      <div className="py-20 max-w-xl mx-auto text-center space-y-6">
        <div className="w-12 h-12 rounded-full bg-threat-redBg border border-threat-redBorder flex items-center justify-center mx-auto text-threat-red">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-ink">Investigation Record Unavailable</h2>
          <p className="text-xs text-ink-muted font-mono leading-relaxed">{error}</p>
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <Button variant="primary" size="md" onClick={() => router.push("/history")}>
            Back to Case History
          </Button>
          <Button variant="secondary" size="md" onClick={() => router.push("/analyze")}>
            Analyze an Email
          </Button>
        </div>
      </div>
    );
  }

  const isCritical = result.riskScore >= 75;
  const isHigh = result.riskScore >= 50 && result.riskScore < 75;
  const isMedium = result.riskScore >= 25 && result.riskScore < 50;

  const scoreColor = isCritical
    ? "text-threat-red"
    : isHigh || isMedium
    ? "text-accent-amber"
    : "text-accent-green";

  return (
    <div ref={containerRef} className="space-y-16 pb-20">
      {/* Top Header */}
      <div className="investigation-reveal space-y-4 pb-6 border-b border-border-light">
        <div className="flex items-center justify-between">
          <Link
            href="/history"
            className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to history</span>
          </Link>

          <Link
            href={`/results?caseId=${encodeURIComponent(result.caseId)}`}
            className="text-xs text-accent-green hover:underline font-semibold"
          >
            ← View Full Assessment Tabs
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div className="flex flex-wrap items-baseline gap-4">
            <h1 className="text-3xl font-bold font-mono tracking-tight text-ink">
              {result.caseId}
            </h1>
            <span className="text-base text-ink font-medium">
              {result.classification}
            </span>
            <span className={`text-xs font-mono font-semibold ${scoreColor}`}>
              {result.riskScore} / 100
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadEml}
              className="text-xs text-ink-muted hover:text-ink transition-colors inline-flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Evidence</span>
            </button>
            <Button
              variant={isFirewallBlocked ? "secondary" : "destructive"}
              size="sm"
              disabled={isFirewallBlocked}
              onClick={() => setShowConfirmModal(true)}
            >
              {isFirewallBlocked ? "Ingress Blocked" : "Isolate Ingress"}
            </Button>
          </div>
        </div>
      </div>

      {/* Case Context Summary */}
      <div className="investigation-reveal grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-xs">
        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase text-ink-subtle">Recipient</div>
          <div className="font-medium text-ink truncate">{result.recipient}</div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase text-ink-subtle">Claimed Sender</div>
          <div className="font-medium text-ink truncate">{result.sender}</div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase text-ink-subtle">Authentication Alignment</div>
          <div className="font-medium text-ink">
            SPF: {result.spf.toUpperCase()} · DKIM: {result.dkim.toUpperCase()} · DMARC: {result.dmarc.toUpperCase()}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase text-ink-subtle">Ingress Node</div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="font-mono font-bold text-ink hover:underline text-left inline-flex items-center gap-1"
          >
            <span>{ipIntel.ip}</span>
            <span className="text-[10px] text-ink-muted">(Inspect →)</span>
          </button>
        </div>
      </div>

      {/* Trajectory & Correlation */}
      <div className="investigation-reveal grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 pt-6">
        {/* Left: Received Header Trajectory Timeline */}
        <div className="lg:col-span-7 space-y-8 rounded-2xl border border-border-light bg-paper/95 backdrop-blur-md p-6 sm:p-8 shadow-xs">
          <div className="space-y-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
              Received Header Trajectory ({hops.length} Hops)
            </div>
            <p className="text-xs text-ink-muted font-normal">
              Hop trajectory reconstructed deterministically from RFC 822 Received headers.
            </p>
          </div>

          {hops.length === 0 ? (
            <div className="p-8 text-center text-ink-muted font-mono text-xs border border-dashed border-border-light rounded-lg">
              No routing information available
            </div>
          ) : (
            <div className="relative pl-6 space-y-10 overflow-visible">
              {/* Precision SVG Trajectory Path */}
              <ForensicPath hops={hops} selectedHop={selectedHop} />

              {hops.map((hop) => {
                const isSelected = selectedHop === hop.hopNumber;
                const verdictLower = (hop.verdict || "").toLowerCase();
                const isDelay = verdictLower.includes("delay") || verdictLower.includes("anomalous");
                const isClean = verdictLower.includes("standard") || verdictLower.includes("transition");

                const dotColor = hop.isMalicious
                  ? "bg-threat-red"
                  : isDelay
                  ? "bg-accent-amber"
                  : "bg-accent-green";

                const verdictTextColor = hop.isMalicious
                  ? "text-threat-red font-medium"
                  : isDelay
                  ? "text-accent-amber font-medium"
                  : isClean
                  ? "text-accent-green font-medium"
                  : "text-ink-muted";

                return (
                  <div key={hop.hopNumber} className="relative space-y-1.5 group">
                    <span
                      className={`absolute -left-[23px] top-1.5 w-2 h-2 rounded-full transition-all duration-300 z-10 ${dotColor} ${
                        isSelected ? "ring-2 ring-ink/20 scale-125 shadow-sm" : ""
                      }`}
                    />

                    <div
                      onClick={() => {
                        const next = isSelected ? null : hop.hopNumber;
                        setSelectedHop(next);
                      }}
                      className="cursor-pointer space-y-1 transition-opacity hover:opacity-100 relative z-10"
                    >
                      <div className="flex items-baseline justify-between text-xs font-mono">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-ink">Hop {hop.hopNumber}</span>
                          <span className="text-ink font-semibold">{hop.ip}</span>
                          {hop.fromHost && (
                            <>
                              <span className="text-ink-subtle">·</span>
                              <span className="text-ink-muted font-sans truncate max-w-[140px]">
                                {hop.fromHost}
                              </span>
                            </>
                          )}
                        </div>
                        <span className="text-[11px] text-ink-subtle">{hop.timestamp}</span>
                      </div>

                      <div className={`text-xs ${verdictTextColor}`}>
                        {hop.verdict}
                      </div>

                      {/* Expandable Technical Details */}
                      {isSelected && (
                        <div className="mt-3 pl-4 border-l border-border-strong space-y-1 font-mono text-[11px] text-ink-muted">
                          <div>From Host: {hop.fromHost || "Direct submission"}</div>
                          <div>Relayed By: {hop.byHost || "Destination MTA"}</div>
                          {hop.protocol && <div>Protocol: {hop.protocol}</div>}
                          {hop.delaySeconds !== null && hop.delaySeconds !== undefined && (
                            <div>Transition Delay: {Math.round(hop.delaySeconds)}s</div>
                          )}
                          <div className="pt-1 text-[10px] text-ink-subtle max-h-24 overflow-y-auto whitespace-pre-wrap select-all">
                            {hop.rawHeader}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Threat Vector Correlation */}
        <div className="lg:col-span-5 space-y-8 rounded-2xl border border-border-light bg-paper/95 backdrop-blur-md p-6 sm:p-8 shadow-xs">
          <div className="space-y-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
              Identity & Vector Correlation
            </div>
            <p className="text-xs text-ink-muted font-normal">
              Correlating claimed identity, return routing, and cryptographic authorization.
            </p>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div className="space-y-1">
              <div className="text-[10px] text-ink-subtle uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                <span>Claimed From Domain</span>
              </div>
              <div className="font-bold text-ink">{result.fromDomain || "Unspecified"}</div>
              <p className="text-[11px] text-ink-muted font-sans">
                Sender address specified in RFC 5322 From header.
              </p>
            </div>

            <div className="text-ink-subtle font-mono">↓</div>

            <div className="space-y-1">
              <div className="text-[10px] text-ink-subtle uppercase flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    result.replyToDomain && result.replyToDomain !== result.fromDomain
                      ? "bg-threat-red"
                      : "bg-accent-green"
                  }`}
                />
                <span>Reply-To Address Domain</span>
              </div>
              <div
                className={`font-bold ${
                  result.replyToDomain && result.replyToDomain !== result.fromDomain
                    ? "text-threat-red"
                    : "text-ink"
                }`}
              >
                {result.replyToDomain || "(No Reply-To specified)"}
              </div>
              <p className="text-[11px] text-ink-muted font-sans">
                {result.replyToDomain && result.replyToDomain !== result.fromDomain
                  ? "Variance detected: replies directed away from From domain."
                  : "Reply routing aligns with claimed sender domain."}
              </p>
            </div>

            <div className="text-ink-subtle font-mono">↓</div>

            <div className="space-y-1">
              <div className="text-[10px] text-ink-subtle uppercase flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    result.spf === "fail" ? "bg-threat-red" : "bg-accent-green"
                  }`}
                />
                <span>Ingress Origin IP</span>
              </div>
              <div className="font-bold text-ink">{result.originIp}</div>
              <p className="text-[11px] text-ink-muted font-sans">
                SPF Status: <strong className="uppercase">{result.spf}</strong>. {result.spfDetail}
              </p>
            </div>

            <div className="text-ink-subtle font-mono">↓</div>

            <div className="space-y-1">
              <div className="text-[10px] text-ink-subtle uppercase flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${scoreColor}`} />
                <span>Forensic Finding Correlation</span>
              </div>
              <div className="font-bold text-ink">
                Risk Score {result.riskScore} / 100 ({result.severity})
              </div>
              <p className="text-[11px] text-ink-muted font-sans">
                {result.assessmentSummary}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setGraphModalOpen(true)}
              className="text-xs font-semibold text-ink hover:underline inline-flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Pivot Threat Graph →</span>
            </button>
          </div>
        </div>
      </div>

      {/* IP Intelligence Inspector Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={ipIntel.ip}
        subtitle="IP Intelligence"
        width="max-w-md"
      >
        <div className="space-y-8 text-xs">
          <div className="space-y-1">
            <div className="text-base font-semibold text-ink">
              {ipIntel.location}
            </div>
            <div className="text-xs font-mono text-ink-muted">{ipIntel.asn}</div>
            <div className="text-xs text-threat-red font-mono pt-1">
              Forensic Risk: {result.riskScore}/100 ({result.severity})
            </div>
          </div>

          {/* Subnet & CIDR */}
          <div className="space-y-1 font-mono">
            <div className="text-[10px] uppercase text-ink-subtle">Subnet / CIDR</div>
            <div className="flex items-center justify-between py-1 border-b border-border-light">
              <span className="text-ink">{ipIntel.subnet}</span>
              <button
                onClick={handleCopyCidr}
                className="text-ink-muted hover:text-ink transition-colors text-[11px]"
              >
                {copiedCidr ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Threat Feeds */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase text-ink-subtle">
              Authentication Audit Signals
            </div>
            <div className="divide-y divide-border-light font-mono text-[11px]">
              {ipIntel.threatFeeds.map((feed, i) => {
                const isCrit = feed.status === "CRITICAL";
                const isFlagged = feed.status === "FLAGGED";
                const dotBg = isCrit
                  ? "bg-threat-red"
                  : isFlagged
                  ? "bg-accent-amber"
                  : "bg-accent-green";
                const textColor = isCrit
                  ? "text-threat-red"
                  : isFlagged
                  ? "text-accent-amber"
                  : "text-accent-green";

                return (
                  <div key={i} className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${dotBg}`} />
                      <span className="text-ink">{feed.name}</span>
                    </div>
                    <span className={`uppercase font-semibold text-[10px] ${textColor}`}>
                      {feed.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Open Ports */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase text-ink-subtle">
              Common Mail Relay Ports
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              {ipIntel.openPorts.map((p) => (
                <div key={p.port} className="py-1 border-b border-border-light">
                  <span className="font-semibold text-ink">Port {p.port}</span>
                  <span className="text-ink-subtle ml-1">({p.service.split(" ")[0]})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Case Association */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase text-ink-subtle">
              Associated Case
            </div>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between py-1 border-b border-border-light">
                <span className="text-ink font-semibold">{result.caseId}</span>
                <span className="text-ink-subtle">{result.evidenceId}</span>
              </div>
            </div>
          </div>
        </div>
      </Drawer>

      {/* Threat Graph Modal */}
      <ThreatGraphModal
        isOpen={graphModalOpen}
        onClose={() => setGraphModalOpen(false)}
        initialIp={ipIntel.ip}
        domain={result.fromDomain}
        targetDomain={result.replyToDomain || result.fromDomain}
        asn={ipIntel.asn}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Isolate Ingress Perimeter"
        description={`Push perimeter block rule for IP ${ipIntel.ip} across gateways.`}
        confirmText="Confirm Isolation"
        onConfirm={handleAddFirewallBlock}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
}
