"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, ChevronLeft, ChevronRight, RefreshCw, AlertCircle, Inbox } from "lucide-react";
import gsap from "gsap";
import { getAnalysisHistory } from "@/lib/api";
import { CaseRecord } from "@/types/threat";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";

export default function HistoryPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await getAnalysisHistory(100);
      setCases(records);
    } catch (err: any) {
      setError(err.message || "Failed to load case history from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      gsap.from(".history-reveal", {
        y: 12,
        opacity: 0,
        stagger: 0.06,
        duration: 0.5,
        ease: "power2.out",
      });
    }, containerRef);

    return () => ctx.revert();
  }, [loading]);

  const filteredCases = cases.filter((item) => {
    const matchesSearch =
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.classification.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sender && item.sender.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.subject && item.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.originIp.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedSeverity === "ALL") return true;
    if (selectedSeverity === "CRITICAL") return item.severity === "critical";
    if (selectedSeverity === "HIGH") return item.severity === "high";
    if (selectedSeverity === "MEDIUM") return item.severity === "medium";
    if (selectedSeverity === "LOW") return item.severity === "low" || item.severity === "safe";
    return true;
  });

  const totalPages = Math.ceil(filteredCases.length / itemsPerPage) || 1;
  const paginatedCases = filteredCases.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const counts = {
    all: cases.length,
    critical: cases.filter((c) => c.severity === "critical").length,
    high: cases.filter((c) => c.severity === "high").length,
    medium: cases.filter((c) => c.severity === "medium").length,
    low: cases.filter((c) => c.severity === "low" || c.severity === "safe").length,
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(cases, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ThreatTrace_Cases_Archive_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({
      type: "info",
      title: "Audit Exported",
      description: `Exported ${cases.length} forensic cases to JSON.`,
    });
  };

  return (
    <div ref={containerRef} className="space-y-16 pb-20">
      {/* Header & Subtle Metrics */}
      <div className="history-reveal relative overflow-visible flex flex-col md:flex-row md:items-baseline justify-between gap-8 pb-6 border-b border-border-light">
        <div className="space-y-2 max-w-xl relative z-10">
          <div className="text-[11px] font-mono tracking-widest uppercase text-ink-muted flex items-center gap-2">
            <span>Case Custody Archive</span>
            <button
              onClick={fetchCases}
              disabled={loading}
              title="Refresh Cases"
              className="hover:text-ink transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-ink">
            Analysis History
          </h1>
          <p className="text-sm text-ink-muted font-normal">
            Authoritative registry of analyzed .eml evidence records and forensic findings.
          </p>
        </div>

        {/* Typographical Metrics */}
        <div className="flex items-baseline gap-8 shrink-0 text-right">
          <div className="space-y-0.5">
            <div className="text-2xl font-mono font-bold text-ink">{counts.all}</div>
            <div className="text-[11px] font-mono uppercase text-ink-subtle">Total Cases</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-mono font-bold text-threat-red">
              {counts.critical + counts.high}
            </div>
            <div className="text-[11px] font-mono uppercase text-threat-red">Elevated Risk</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-mono font-bold text-accent-green">
              {counts.low}
            </div>
            <div className="text-[11px] font-mono uppercase text-accent-green">Low Risk</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="history-reveal space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Case ID, sender, subject, filename, or IP..."
              className="w-full bg-paper-subtle border border-border-light pl-9 pr-4 py-2 text-xs font-mono text-ink rounded focus:outline-none focus:border-ink transition-colors placeholder:text-ink-subtle"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 text-xs">
            {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => {
              const isActive = selectedSeverity === sev;
              return (
                <button
                  key={sev}
                  onClick={() => {
                    setSelectedSeverity(sev);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded font-mono text-[11px] transition-colors ${
                    isActive
                      ? "bg-paper-strong text-paper-bg font-semibold"
                      : "text-ink-muted hover:text-ink hover:bg-paper-subtle"
                  }`}
                >
                  {sev}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-threat-redBg border border-threat-redBorder flex items-center justify-between text-xs text-threat-red">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={fetchCases} className="underline font-semibold">
              Retry
            </button>
          </div>
        )}

        {/* Case Records Table */}
        <div className="rounded-2xl border border-border-light bg-paper/95 backdrop-blur-md p-6 shadow-xs overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-light text-[10px] font-mono uppercase text-ink-subtle">
                <th className="pb-3 px-3 font-medium">Case ID</th>
                <th className="pb-3 px-3 font-medium">Evidence File</th>
                <th className="pb-3 px-3 font-medium">Claimed Sender / Subject</th>
                <th className="pb-3 px-3 font-medium">Assessment</th>
                <th className="pb-3 px-3 font-medium">Forensic Risk</th>
                <th className="pb-3 px-3 font-medium">Origin IP</th>
                <th className="pb-3 px-3 font-medium">Ingestion Time</th>
                <th className="pb-3 px-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light font-mono">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-ink-muted">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-ink" />
                    <span>Querying case store...</span>
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center space-y-3">
                    <Inbox className="w-8 h-8 text-ink-subtle mx-auto" />
                    <div className="text-ink font-medium text-sm font-sans">No analyzed cases yet</div>
                    <p className="text-ink-muted text-xs font-sans max-w-sm mx-auto">
                      Upload an RFC 5322 .eml file on the analyze page to generate your first forensic case.
                    </p>
                    <div className="pt-2">
                      <Button variant="primary" size="sm" onClick={() => router.push("/analyze")}>
                        Analyze an Email
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : paginatedCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-muted font-sans">
                    No cases match the specified filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedCases.map((item) => {
                  const isCrit = item.severity === "critical";
                  const isHighSev = item.severity === "high";
                  const isMedSev = item.severity === "medium";

                  const dotColor = isCrit
                    ? "bg-threat-red"
                    : isHighSev || isMedSev
                    ? "bg-accent-amber"
                    : "bg-accent-green";

                  return (
                    <tr
                      key={item.id}
                      onClick={() => router.push(`/results?caseId=${encodeURIComponent(item.id)}`)}
                      className="hover:bg-paper-subtle cursor-pointer transition-colors group"
                    >
                      <td className="py-4 px-3 font-bold text-ink">
                        {item.id}
                      </td>
                      <td className="py-4 px-3 text-ink-muted truncate max-w-[130px]">
                        {item.filename}
                      </td>
                      <td className="py-4 px-3 font-sans max-w-[200px]">
                        <div className="font-medium text-ink truncate">{item.sender}</div>
                        <div className="text-[11px] text-ink-muted truncate">{item.subject}</div>
                      </td>
                      <td className="py-4 px-3 font-sans font-medium text-ink">
                        {item.classification}
                      </td>
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                          <span className="font-semibold text-ink">{item.riskScore}</span>
                          <span className="text-[10px] text-ink-muted uppercase font-mono">
                            / 100
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-3 font-mono text-ink">
                        {item.originIp}
                      </td>
                      <td className="py-4 px-3 text-ink-muted text-[11px]">
                        {item.timestamp}
                      </td>
                      <td className="py-4 px-3 text-right">
                        <span className="text-ink-subtle group-hover:text-accent-green font-medium inline-flex items-center gap-1 transition-colors">
                          <span>Inspect</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Minimal Footer */}
        <div className="pt-4 border-t border-border-light flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-ink-muted">
          <div className="flex items-center gap-4">
            <button
              onClick={handleExportJSON}
              disabled={cases.length === 0}
              className="hover:text-ink transition-colors disabled:opacity-30"
            >
              Export Cases JSON
            </button>
            <button
              onClick={() => router.push("/analyze")}
              className="text-accent-green hover:underline font-semibold"
            >
              + Analyze New Email
            </button>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono mr-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded disabled:opacity-30 hover:bg-paper-subtle transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded disabled:opacity-30 hover:bg-paper-subtle transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
