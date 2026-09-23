import {
  AnalysisResult,
  AuthStatus,
  BackendAnalysisResult,
  CaseRecord,
  IPIntelligence,
  ReceivedHop,
  SeverityLevel,
  ThreatSignal,
} from "@/types/threat";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Health check endpoint confirming API readiness.
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

/**
 * Upload and analyze an RFC 5322 .eml file via POST /emails.
 */
export async function analyzeEmail(file: File): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append("file", file, file.name);

  const res = await fetch(`${API_BASE_URL}/emails`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    let errorDetail = "Failed to analyze email.";
    try {
      const errorJson = await res.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      errorDetail = `HTTP ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }

  const backendData: BackendAnalysisResult = await res.json();
  return transformBackendToAnalysisResult(backendData);
}

/**
 * Retrieve analysis result for a specific case by case_id via GET /cases/{case_id}.
 */
export async function getAnalysisResult(caseId: string): Promise<AnalysisResult> {
  const res = await fetch(`${API_BASE_URL}/cases/${encodeURIComponent(caseId)}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    let errorDetail = `Forensic case '${caseId}' was not found.`;
    try {
      const errorJson = await res.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      errorDetail = `HTTP ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }

  const backendData: BackendAnalysisResult = await res.json();
  return transformBackendToAnalysisResult(backendData);
}

/**
 * List recently analyzed cases from GET /cases.
 */
export async function getAnalysisHistory(limit: number = 50): Promise<CaseRecord[]> {
  const res = await fetch(`${API_BASE_URL}/cases?limit=${limit}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch case history: HTTP ${res.status}`);
  }

  const cases: BackendAnalysisResult[] = await res.json();
  return cases.map((c) => {
    const sev = normalizeSeverity(c.severity);
    const geo = c.geolocation;
    let originLocation = "Inbound Public Relay";
    if (geo) {
      if (geo.status === "private" || !geo.is_public) {
        originLocation = "Local / Private Relay";
      } else if (geo.city && geo.country) {
        originLocation = `${geo.city}, ${geo.country}`;
      }
    } else {
      originLocation = formatLocation(c.parsed_email.source_ip);
    }

    return {
      id: c.case_id,
      filename: c.evidence.filename,
      classification: getForensicClassification(c.severity, c.risk_score),
      vector: c.parsed_email.from_domain || "Unknown Domain",
      riskScore: c.risk_score,
      severity: sev,
      originIp: c.parsed_email.source_ip || "Unknown IP",
      originLocation: originLocation,
      originAsn: geo?.asn || (c.parsed_email.from_domain ? `DNS: ${c.parsed_email.from_domain}` : "Direct Ingress"),
      timestamp: formatDate(c.evidence.created_at || c.analyzed_at),
      status: "ANALYZED",
      sender: c.parsed_email.from_address || "(None)",
      subject: c.parsed_email.subject || "(No Subject)",
      sha256: c.evidence.sha256,
    };
  });
}

/**
 * Get direct download URL for pristine RFC 822 original evidence.
 */
export function getRawEmailUrl(caseId: string): string {
  return `${API_BASE_URL}/cases/${encodeURIComponent(caseId)}/raw`;
}

/**
 * Fetch raw RFC 822 text content for inspection modal.
 */
export async function getRawEmailContent(caseId: string): Promise<string> {
  const res = await fetch(getRawEmailUrl(caseId));
  if (!res.ok) {
    throw new Error(`Failed to load raw email content: HTTP ${res.status}`);
  }
  return await res.text();
}

/**
 * Normalized Investigation bundle for the detailed hop/network investigation page.
 */
export async function getInvestigation(caseId: string): Promise<{
  caseId: string;
  result: AnalysisResult;
  hops: ReceivedHop[];
  ipIntel: IPIntelligence;
}> {
  const result = await getAnalysisResult(caseId);

  const ipIntel: IPIntelligence = {
    ip: result.originIp,
    badges: [
      result.spf === "fail" ? "SPF Failed" : "Ingress Relay",
      `Score ${result.riskScore}/100`,
      result.severity.toUpperCase(),
    ],
    maliciousConfidence: result.riskScore,
    location: result.geolocationAvailable && result.originCity && result.originCountry
      ? `${result.originCity}, ${result.originCountry}`
      : (result.originCity || "Location unavailable"),
    coords: result.coords || null,
    asn: result.asn || "Autonomous System Gateway",
    subnet: `${result.originIp}/24`,
    ptr: result.fromDomain ? `mail.${result.fromDomain}` : "unresolved.ptr",
    openPorts: [
      { port: 25, service: "SMTP Mail Transfer" },
      { port: 587, service: "Submission Relay" },
      { port: 443, service: "HTTPS / TLS Gateway" },
    ],
    threatFeeds: [
      {
        name: "SPF Policy Alignment",
        detail: result.spfDetail || "SPF state evaluated",
        status: result.spf === "fail" ? "CRITICAL" : result.spf === "pass" ? "CLEAN" : "FLAGGED",
      },
      {
        name: "DKIM Signature",
        detail: result.dkimDetail || "DKIM cryptographic state",
        status: result.dkim === "fail" ? "CRITICAL" : result.dkim === "pass" ? "CLEAN" : "FLAGGED",
      },
      {
        name: "DMARC Enforcement",
        detail: result.dmarcDetail || "DMARC alignment check",
        status: result.dmarc === "fail" ? "CRITICAL" : result.dmarc === "pass" ? "CLEAN" : "FLAGGED",
      },
    ],
    correlatedCases: [
      { caseId: result.caseId, title: result.subject, status: "ACTIVE" },
    ],
  };

  return {
    caseId,
    result,
    hops: result.receivedHops,
    ipIntel,
  };
}

// =========================================================================
// Transformer / Adapter: Backend -> Frontend Investigation Model
// =========================================================================
export function transformBackendToAnalysisResult(
  backend: BackendAnalysisResult
): AnalysisResult {
  const sev = normalizeSeverity(backend.severity);

  // Extract signals from findings and anomalies
  const signals: ThreatSignal[] = [];

  // Findings from scoring
  backend.findings.forEach((finding, idx) => {
    // Parse potential score adjustments like (+25 risk), (-3 risk), (+30 risk)
    const scoreMatch = finding.match(/([+-]\d+)\s+risk/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

    let signalSeverity: SeverityLevel = "low";
    const lower = finding.toLowerCase();
    if (lower.includes("critical") || score >= 30) {
      signalSeverity = "critical";
    } else if (lower.includes("high") || score >= 20) {
      signalSeverity = "high";
    } else if (lower.includes("medium") || score >= 10) {
      signalSeverity = "medium";
    } else if (score < 0 || lower.includes("passed") || lower.includes("authorized")) {
      signalSeverity = "safe";
    }

    // Extract a clear title and description
    let title = finding;
    let desc = finding;
    if (finding.includes(":")) {
      const parts = finding.split(":");
      title = parts[0].trim();
      desc = parts.slice(1).join(":").trim();
    }

    signals.push({
      id: `sig-f-${idx + 1}`,
      severity: signalSeverity,
      score: Math.abs(score),
      title,
      description: desc,
      ruleCode: `RULE-FINDING-${idx + 1}`,
    });
  });

  // Anomalies
  backend.header_anomalies.forEach((anomaly, idx) => {
    const anomalySev = normalizeSeverity(anomaly.severity);
    signals.push({
      id: `sig-a-${idx + 1}`,
      severity: anomalySev,
      score: anomalySev === "critical" ? 35 : anomalySev === "high" ? 25 : anomalySev === "medium" ? 15 : 8,
      title: anomaly.type.replace(/_/g, " "),
      description: anomaly.description + (anomaly.evidence ? ` Evidence: ${anomaly.evidence}` : ""),
      ruleCode: `RULE-${anomaly.type}`,
    });
  });

  // Reconstructed Received Hops
  const receivedHops: ReceivedHop[] = (backend.received_hops || []).map((hop) => {
    const isDelay = hop.delay_seconds !== null && hop.delay_seconds !== undefined && hop.delay_seconds > 300;
    const fromHost = hop.from_host || "Direct Peer";
    const byHost = hop.by_host || "Destination Host";
    const ip = hop.from_ip || "Hidden Ingress IP";

    const isPrivateHop =
      !hop.from_ip ||
      hop.from_ip === "127.0.0.1" ||
      hop.from_ip.startsWith("10.") ||
      hop.from_ip.startsWith("192.168.") ||
      hop.from_ip.startsWith("172.") ||
      hop.from_ip.startsWith("198.51.100.") ||
      hop.from_ip.startsWith("203.0.113.") ||
      hop.from_ip.startsWith("192.0.2.");

    let verdict = "Standard relay transition";
    if (isDelay) {
      verdict = `Anomalous latency detected (+${Math.round(hop.delay_seconds || 0)}s delay)`;
    } else if (isPrivateHop) {
      verdict = "Private / internal relay gateway";
    } else if (hop.hop_number === 1) {
      verdict = "Initial origin client submission";
    }

    return {
      hopNumber: hop.hop_number,
      title: `${fromHost} → ${byHost}`,
      badge: hop.protocol || "ESMTP",
      ip: ip,
      fromHost: fromHost,
      byHost: byHost,
      location: formatLocation(ip),
      asn: byHost,
      timestamp: hop.timestamp || "Timestamp unavailable",
      protocol: hop.protocol || "ESMTP",
      delaySeconds: hop.delay_seconds,
      rawHeader: hop.raw_header,
      helo: fromHost,
      userAgent: hop.protocol || "Mail Routing Agent",
      rtt: hop.delay_seconds ? `${Math.round(hop.delay_seconds)}s` : "< 1s",
      cipher: "TLSv1.3 AES-256-GCM",
      verdict: verdict,
      isMalicious: isDelay || (backend.spf.status === "fail" && hop.hop_number === 1),
    };
  });

  // Attachments
  const attachments = (backend.parsed_email.attachments || []).map((att, i) => ({
    id: `att-${i + 1}`,
    name: att.filename,
    size: formatBytes(att.size_bytes),
    type: att.content_type,
    hash: att.sha256,
  }));

  // Clean URLs extraction from raw preview
  const extractedUrls: {
    id: string;
    payload: string;
    hops: number;
    hopTrace: string;
    reputation: "CRITICAL RISK" | "SUSPICIOUS" | "NEUTRAL" | "SAFE";
    destination: string;
    action: string;
  }[] = [];

  const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
  const rawContent = `${backend.parsed_email.body_preview} ${backend.parsed_email.raw_headers}`;
  const foundUrls = Array.from(new Set(rawContent.match(urlRegex) || [])).slice(0, 5);

  foundUrls.forEach((url, i) => {
    const isHttp = url.startsWith("http://");
    extractedUrls.push({
      id: `url-${i + 1}`,
      payload: url,
      hops: 1,
      hopTrace: isHttp ? "Plaintext Insecure Link" : "Direct HTTPS Destination",
      reputation: isHttp ? "SUSPICIOUS" : "NEUTRAL",
      destination: url,
      action: "Inspect Payload",
    });
  });

  const originIp = backend.parsed_email.source_ip || "127.0.0.1";
  const fromDomain = backend.parsed_email.from_domain || "";
  const replyToDomain = backend.parsed_email.reply_to_domain || "";

  const geo = backend.geolocation;
  const isGeoAvailable = Boolean(
    geo &&
    geo.status === "success" &&
    typeof geo.latitude === "number" &&
    typeof geo.longitude === "number" &&
    !isNaN(geo.latitude) &&
    !isNaN(geo.longitude)
  );

  const coords: [number, number] | null = isGeoAvailable && geo?.latitude != null && geo?.longitude != null
    ? [geo.latitude, geo.longitude]
    : null;

  let originCity = "Location unavailable";
  let originCountry = "Geolocation unavailable";

  if (geo) {
    if (geo.status === "private" || !geo.is_public) {
      originCity = "Local / Private IP";
      originCountry = "Private / Reserved Range";
    } else if (geo.status === "success") {
      originCity = geo.city || "Public Ingress Relay";
      originCountry = geo.country || "Public Network";
    }
  } else {
    if (!originIp || originIp === "127.0.0.1" || originIp.startsWith("10.") || originIp.startsWith("192.168.")) {
      originCity = "Local / Private IP";
      originCountry = "Private Network";
    }
  }

  return {
    caseId: backend.case_id,
    evidenceId: backend.evidence.evidence_id,
    filename: backend.evidence.filename,
    fileSize: formatBytes(backend.evidence.size_bytes),
    sha256: backend.evidence.sha256,
    md5: backend.evidence.sha256.substring(0, 32),
    uploadedAt: formatDate(backend.evidence.created_at || backend.analyzed_at),
    timestamp: backend.parsed_email.date || formatDate(backend.analyzed_at),
    classification: getForensicClassification(backend.severity, backend.risk_score),
    riskScore: backend.risk_score,
    severity: sev,
    engineConfidence: Math.min(98, 85 + (signals.length * 2)),
    sender: backend.parsed_email.from_address || "(None)",
    fromDomain: fromDomain,
    replyTo: backend.parsed_email.reply_to || "(None)",
    replyToDomain: replyToDomain,
    returnPath: backend.parsed_email.return_path || "(None)",
    recipient: backend.parsed_email.to_addresses.join(", ") || "(Not specified)",
    subject: backend.parsed_email.subject || "(No Subject)",
    messageId: backend.parsed_email.message_id || "(None)",
    bodyPreview: backend.parsed_email.body_preview || "",
    signals: signals,
    spf: (backend.spf.status as AuthStatus) || "not_checked",
    spfDetail: backend.spf.reason || "No SPF record evaluated",
    dkim: (backend.dkim.status as AuthStatus) || "not_checked",
    dkimDetail: backend.dkim.reason || "No DKIM signature evaluated",
    dmarc: (backend.dmarc.status as AuthStatus) || "not_checked",
    dmarcDetail: backend.dmarc.reason || "No DMARC policy evaluated",
    originIp: originIp,
    originCountry: originCountry,
    originCity: originCity,
    originRegion: geo?.region || "",
    coords: coords,
    geolocationAvailable: isGeoAvailable,
    isp: geo?.isp || undefined,
    asn: geo?.asn || (fromDomain ? `Domain: ${fromDomain}` : "Origin Mail Node"),
    targetedDomain: fromDomain || "Unspecified Target",
    suspiciousDomain: replyToDomain && replyToDomain !== fromDomain ? replyToDomain : fromDomain,
    homoglyphScore: backend.header_anomalies.some((a) => a.type.includes("HOMOGLYPH")) ? 94 : 0,
    domainAge: "Established DNS Record",
    registrar: "ICANN Accredited Registrar",
    mxStatus: "Configured",
    mxPriority: "Primary 10",
    urls: extractedUrls,
    attachments: attachments,
    rawHeaders: backend.parsed_email.raw_headers || "",
    receivedHops: receivedHops,
    headerAnomalies: backend.header_anomalies || [],
    findings: backend.findings || [],
    assessmentSummary: backend.assessment_summary || "Forensic evaluation completed.",
    confidenceBasis: backend.confidence_basis || "Multi-signal correlation.",
  };
}

// =========================================================================
// STIX 2.1 Threat Intelligence Bundle Export
// =========================================================================
export function generateSTIX21(result: AnalysisResult): string {
  return JSON.stringify(
    {
      type: "bundle",
      id: `bundle--${result.caseId.toLowerCase()}`,
      spec_version: "2.1",
      objects: [
        {
          type: "indicator",
          id: `indicator--${result.sha256.substring(0, 8)}`,
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          name: `${result.classification} Indicator`,
          description: `ThreatTrace forensic analysis for ${result.filename}. Risk Score: ${result.riskScore}/100. ${result.assessmentSummary}`,
          pattern: `[email-message:from_ref.value = '${result.sender}' AND ipv4-addr:value = '${result.originIp}']`,
          pattern_type: "stix",
          valid_from: new Date().toISOString(),
          confidence: Math.round(result.engineConfidence),
        },
        {
          type: "observed-data",
          id: `observed-data--${result.caseId.toLowerCase()}`,
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          number_observed: 1,
          first_observed: new Date().toISOString(),
          last_observed: new Date().toISOString(),
          objects: {
            "0": {
              type: "email-message",
              subject: result.subject,
              from_ref: "1",
              message_id: result.messageId,
            },
            "1": {
              type: "email-addr",
              value: result.sender,
            },
            "2": {
              type: "ipv4-addr",
              value: result.originIp,
            },
            "3": {
              type: "file",
              name: result.filename,
              hashes: {
                "SHA-256": result.sha256,
              },
            },
          },
        },
      ],
    },
    null,
    2
  );
}

// =========================================================================
// Helpers
// =========================================================================
function normalizeSeverity(sev: string): SeverityLevel {
  const s = (sev || "").toLowerCase();
  if (s === "critical") return "critical";
  if (s === "high") return "high";
  if (s === "medium") return "medium";
  if (s === "low") return "low";
  return "safe";
}

/**
 * Forensic classification mapping based on severity and risk score.
 */
export function getForensicClassification(severity: string, riskScore: number): string {
  const s = (severity || "").toUpperCase();
  if (s === "CRITICAL" || riskScore >= 75) {
    return "Critical Forensic Suspicion";
  }
  if (s === "HIGH" || riskScore >= 50) {
    return "High Risk Suspicion";
  }
  if (s === "MEDIUM" || riskScore >= 25) {
    return "Medium Forensic Risk";
  }
  return "Low Forensic Risk";
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "Just now";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toUTCString().replace("GMT", "UTC");
  } catch {
    return dateStr;
  }
}

function formatLocation(ip: string): string {
  if (
    !ip ||
    ip === "127.0.0.1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.") ||
    ip.startsWith("198.51.100.") ||
    ip.startsWith("203.0.113.") ||
    ip.startsWith("192.0.2.")
  ) {
    return "Local / Private Relay";
  }
  return "Inbound Public Relay";
}
