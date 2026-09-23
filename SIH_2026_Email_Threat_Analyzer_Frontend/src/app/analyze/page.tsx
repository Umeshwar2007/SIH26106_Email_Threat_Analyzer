"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowRight, Check, AlertCircle, RefreshCw } from "lucide-react";
import gsap from "gsap";
import { analyzeEmail } from "@/lib/api";
import { RawHeadersModal } from "@/components/ui/RawHeadersModal";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";

interface SamplePreset {
  id: string;
  name: string;
  filename: string;
  description: string;
  expectedCategory: string;
  expectedSeverity: "low" | "medium" | "high";
}

const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: "sample-clean",
    name: "Clean Verified",
    filename: "clean_email.eml",
    description: "Standard corporate newsletter with valid SPF, DKIM, and DMARC alignment.",
    expectedCategory: "Authentication Supported",
    expectedSeverity: "low",
  },
  {
    id: "sample-spoof",
    name: "Executive Spoof",
    filename: "spf_fail_spoof.eml",
    description: "Spoofed executive identity requesting wire transfer with SPF failure.",
    expectedCategory: "Identity Inconsistency",
    expectedSeverity: "high",
  },
  {
    id: "sample-dkim",
    name: "Broken DKIM",
    filename: "dkim_broken.eml",
    description: "Cryptographic signature mismatch indicating body or header alteration.",
    expectedCategory: "Cryptographic Tampering",
    expectedSeverity: "medium",
  },
  {
    id: "sample-relay",
    name: "Multi-Hop Relay",
    filename: "long_relay_chain.eml",
    description: "Extended Received-header transit path across 4 intermediate MTAs.",
    expectedCategory: "Extended Trajectory",
    expectedSeverity: "low",
  },
  {
    id: "sample-internshala",
    name: "Internshala Campaign",
    filename: "internshala.eml",
    description: "Live recruitment campaign email with multi-hop DKIM/SPF alignment.",
    expectedCategory: "Real-World Inbound",
    expectedSeverity: "low",
  },
];

export default function AnalyzePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedPreview, setStagedPreview] = useState<{
    name: string;
    size: string;
    rawHeaders: string;
  } | null>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRawModal, setShowRawModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedHeaders, setPastedHeaders] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-reveal", {
        y: 16,
        opacity: 0,
        stagger: 0.08,
        duration: 0.6,
        ease: "power3.out",
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dropzoneRef.current) return;
    const rect = dropzoneRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setErrorMsg(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
    e.target.value = "";
  };

  const processSelectedFile = async (file: File) => {
    const validExtensions = [".eml", ".txt", ".msg"];
    const hasValidExt = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExt) {
      setErrorMsg("Invalid file format. Please upload a standard RFC 5322 .eml file.");
      toast({
        type: "error",
        title: "Unsupported Format",
        description: "Only RFC 5322 .eml or raw text files are supported.",
      });
      return;
    }

    if (file.size === 0) {
      setErrorMsg("Uploaded file is empty.");
      toast({
        type: "error",
        title: "Empty File",
        description: "The selected file contains 0 bytes.",
      });
      return;
    }

    // Read a slice for raw header preview
    try {
      const textPreview = await file.slice(0, 4096).text();
      setStagedFile(file);
      setStagedPreview({
        name: file.name,
        size: formatFileSize(file.size),
        rawHeaders: textPreview,
      });

      toast({
        type: "success",
        title: "Evidence Staged",
        description: `${file.name} ready for forensic analysis.`,
      });
    } catch {
      setErrorMsg("Failed to read file.");
    }
  };

  const handleLoadSamplePreset = async (sample: SamplePreset) => {
    setErrorMsg(null);
    setLoadingSample(sample.id);
    try {
      const response = await fetch(`/samples/${encodeURIComponent(sample.filename)}`);
      if (!response.ok) {
        throw new Error(`Failed to load sample: ${response.statusText}`);
      }
      const blob = await response.blob();
      const file = new File([blob], sample.filename, { type: "message/rfc822" });
      await processSelectedFile(file);
    } catch (err: any) {
      setErrorMsg(`Could not stage sample: ${err.message}`);
      toast({
        type: "error",
        title: "Sample Load Error",
        description: err.message,
      });
    } finally {
      setLoadingSample(null);
    }
  };

  const handlePastedSource = () => {
    const trimmed = pastedHeaders.trim();
    if (!trimmed) {
      toast({
        type: "error",
        title: "Empty Source",
        description: "Please paste the raw RFC 822 email headers and content.",
      });
      return;
    }
    if (trimmed.length < 15 || !trimmed.includes(":")) {
      toast({
        type: "error",
        title: "Invalid RFC 822 Format",
        description: "Pasted text must contain standard RFC 822 header fields (e.g. From:, Subject:).",
      });
      return;
    }
    const blob = new Blob([trimmed], { type: "message/rfc822" });
    const file = new File([blob], "pasted_email.eml", { type: "message/rfc822" });
    setStagedFile(file);
    setStagedPreview({
      name: "pasted_email.eml",
      size: formatFileSize(blob.size),
      rawHeaders: trimmed.slice(0, 4096),
    });
    setShowPasteModal(false);
    setPastedHeaders("");
    toast({
      type: "success",
      title: "RFC 822 Staged",
      description: "Pasted email content staged for analysis.",
    });
  };

  const handleStartAnalysis = async () => {
    if (!stagedFile) {
      setErrorMsg("Please select or drop an .eml file first.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    toast({
      type: "info",
      title: "Analysis In Progress",
      description: "Submitting evidence to FastAPI forensic pipeline...",
    });

    try {
      const result = await analyzeEmail(stagedFile);

      toast({
        type: "success",
        title: "Forensic Analysis Complete",
        description: `Case ${result.caseId} registered. Risk Score: ${result.riskScore}/100.`,
      });

      router.push(`/results?caseId=${encodeURIComponent(result.caseId)}`);
    } catch (err: any) {
      setIsProcessing(false);
      const msg = err.message || "Backend service communication error.";
      setErrorMsg(`Analysis failed: ${msg}. Verify that the FastAPI backend is running at http://localhost:8000.`);
      toast({
        type: "error",
        title: "Forensic Pipeline Error",
        description: msg,
      });
    }
  };

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return (
    <div ref={heroRef} className="space-y-16 pb-20 relative overflow-visible">
      {/* Editorial Hero Header */}
      <div className="space-y-4 max-w-xl relative z-10">
        <div className="hero-reveal text-[11px] font-mono tracking-widest uppercase text-ink-muted flex items-center gap-2">
          <span>Email Threat Forensics</span>
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
        </div>
        <h1 className="hero-reveal text-5xl sm:text-6xl font-bold tracking-tight text-ink leading-[1.06]">
          Drop an email.<br />
          We’ll investigate.
        </h1>
        <p className="hero-reveal text-base text-ink-muted leading-relaxed font-normal pt-1">
          Upload an RFC 5322 .eml file to audit Received header routing, verify SPF/DKIM/DMARC
          cryptographic alignment, detect anomalies, and derive multi-signal risk.
        </p>
      </div>

      {/* Large Minimalist Upload Dropzone */}
      <div className="hero-reveal">
        <div
          ref={dropzoneRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onMouseMove={handleMouseMove}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleFileDrop}
          className={`relative rounded-xl border border-dashed transition-all duration-300 ${
            isDragOver
              ? "border-accent-green bg-accent-greenBg/30 scale-[1.005]"
              : errorMsg
              ? "border-threat-red bg-threat-redBg"
              : isHovered
              ? "border-accent-green/60 bg-paper/95 backdrop-blur-xs"
              : "border-border-strong bg-paper/90 backdrop-blur-xs"
          }`}
          style={{
            backgroundImage: isHovered
              ? `radial-gradient(420px circle at ${mousePos.x}px ${mousePos.y}px, rgba(24,199,122,0.04), transparent 70%)`
              : `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,0.02), transparent 70%)`,
          }}
        >
          {/* Centered Interaction Area */}
          <div className="px-6 py-20 sm:py-24 flex flex-col items-center justify-center text-center space-y-4">
            <div
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 ${
                isHovered
                  ? "border-accent-green text-accent-green"
                  : "border-border-strong text-ink"
              }`}
            >
              <ArrowUp className="w-4 h-4" />
            </div>

            <div className="space-y-1">
              <div className="text-base sm:text-lg font-medium text-ink flex items-center justify-center gap-2">
                <span>Drop your .eml file here</span>
                {isHovered && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                )}
              </div>
              <div className="text-xs text-ink-muted">or choose an RFC 5322 email file from your system</div>
            </div>

            <div className="text-xs font-mono text-ink-subtle">
              Supported: .EML · RFC 5322 · 50MB max · Pristine Evidence Preservation
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".eml,message/rfc822,.txt,.msg"
                onChange={handleFileSelect}
                className="hidden"
                tabIndex={-1}
              />
              <Button
                type="button"
                variant="primary"
                size="md"
                className="cursor-pointer"
                disabled={isProcessing}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose file
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setShowPasteModal(true)}
                disabled={isProcessing}
              >
                Paste raw email
              </Button>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-threat-red pt-3 font-medium max-w-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Staged File Confirmation Banner */}
          {stagedPreview && (
            <div className="border-t border-border-light px-6 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-paper-subtle">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink truncate">
                    {stagedPreview.name}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-accent-green font-medium">
                    <Check className="w-3 h-3" />
                    FILE STAGED
                  </span>
                </div>
                <div className="text-[11px] font-mono text-ink-muted">
                  {stagedPreview.size} · SHA-256 calculated by backend upon evidence ingestion
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowRawModal(true)}
                  disabled={isProcessing}
                >
                  Inspect Headers
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStartAnalysis}
                  isLoading={isProcessing}
                >
                  <span>{isProcessing ? "Analyzing..." : "Analyze Email"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pre-packaged Sample Presets for SIH Evaluation */}
      <div className="hero-reveal space-y-4 rounded-2xl border border-border-light bg-paper/95 backdrop-blur-md p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between text-xs text-ink-muted">
          <span className="font-mono uppercase tracking-wider">Test Sample Email Fixtures</span>
          <span className="text-[11px] text-ink-subtle">Click to stage & analyze</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
          {SAMPLE_PRESETS.map((sample) => {
            const isSelected = stagedPreview?.name === sample.filename;
            const dotColor =
              sample.expectedSeverity === "high"
                ? "bg-threat-red"
                : sample.expectedSeverity === "medium"
                ? "bg-accent-amber"
                : "bg-accent-green";

            return (
              <div
                key={sample.id}
                onClick={() => handleLoadSamplePreset(sample)}
                className={`group space-y-1.5 cursor-pointer p-3 rounded-lg border transition-all ${
                  isSelected
                    ? "border-accent-green bg-accent-greenBg/10 shadow-xs"
                    : "border-border-light hover:border-ink/20 bg-paper-subtle"
                }`}
              >
                <div className="flex items-baseline justify-between font-mono">
                  <span className="font-semibold flex items-center gap-1.5 text-ink">
                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                    <span>{sample.name}</span>
                  </span>
                  <span className="text-[10px] text-ink-muted">
                    {loadingSample === sample.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin inline" />
                    ) : (
                      sample.expectedCategory
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted leading-relaxed font-normal">
                  {sample.description}
                </p>
                <div className="text-[10px] font-mono text-ink-subtle truncate">
                  {sample.filename}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Forensic Pipeline Steps */}
      <div className="hero-reveal space-y-6 rounded-2xl border border-border-light bg-paper/95 backdrop-blur-md p-6 sm:p-8 shadow-xs">
        <div className="text-xs font-mono uppercase tracking-wider text-ink-muted">
          Authoritative Backend Forensics Architecture
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
          <div className="space-y-1">
            <div className="font-mono font-semibold text-ink flex items-center gap-1.5">
              <span className="text-accent-green">01</span>
              <span>/ PRESERVE</span>
            </div>
            <p className="text-ink-muted leading-relaxed">
              Byte-exact evidence preservation with SHA-256 hash generation.
            </p>
          </div>

          <div className="space-y-1">
            <div className="font-mono font-semibold text-ink flex items-center gap-1.5">
              <span className="text-accent-green">02</span>
              <span>/ ROUTING</span>
            </div>
            <p className="text-ink-muted leading-relaxed">
              Bottom-up Received hop trajectory reconstruction & latency analysis.
            </p>
          </div>

          <div className="space-y-1">
            <div className="font-mono font-semibold text-ink flex items-center gap-1.5">
              <span className="text-accent-green">03</span>
              <span>/ AUDIT</span>
            </div>
            <p className="text-ink-muted leading-relaxed">
              Cryptographic SPF, DKIM, and DMARC alignment verification.
            </p>
          </div>

          <div className="space-y-1">
            <div className="font-mono font-semibold text-ink flex items-center gap-1.5">
              <span className="text-accent-green">04</span>
              <span>/ CORRELATE</span>
            </div>
            <p className="text-ink-muted leading-relaxed">
              Deterministic risk score (5–100) derived from correlated signals.
            </p>
          </div>
        </div>
      </div>

      {/* Raw Headers Modal for staged file */}
      {stagedPreview && (
        <RawHeadersModal
          isOpen={showRawModal}
          onClose={() => setShowRawModal(false)}
          headers={stagedPreview.rawHeaders}
          filename={stagedPreview.name}
        />
      )}

      {/* Paste Raw RFC 822 Email Modal */}
      <Modal
        isOpen={showPasteModal}
        onClose={() => setShowPasteModal(false)}
        title="Paste Raw RFC 822 Email Source"
        subtitle="Header & MIME Content Ingestion"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <textarea
            rows={10}
            value={pastedHeaders}
            onChange={(e) => setPastedHeaders(e.target.value)}
            placeholder={`Received: from mail-relay01.domain.com...
From: sender@example.com
To: recipient@example.com
Subject: Test Email
Date: Sun, 20 Sep 2026 10:00:00 +0000

Email body content...`}
            className="w-full bg-paper-subtle border border-border-light p-3 font-mono text-xs text-ink rounded focus:outline-none focus:border-ink resize-none"
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-light">
            <Button variant="secondary" size="sm" onClick={() => setShowPasteModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handlePastedSource}>
              Stage Content
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
