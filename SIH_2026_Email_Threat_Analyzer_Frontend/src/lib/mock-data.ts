import { SampleDataset } from "@/types/threat";

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: "sample-clean",
    name: "Clean Verified",
    filename: "clean_email.eml",
    size: "1.2 KB",
    sha256: "authoritative_backend_hash",
    description: "Standard corporate newsletter with valid SPF, DKIM, and DMARC alignment.",
    classification: "Low Forensic Risk",
    riskScore: 10,
    sender: "newsletter@acme-corp.com",
    subject: "Quarterly Project Status Update - Q3 2026",
  },
  {
    id: "sample-spoof",
    name: "Executive Spoof",
    filename: "spf_fail_spoof.eml",
    size: "1.1 KB",
    sha256: "authoritative_backend_hash",
    description: "Spoofed executive identity requesting wire transfer with SPF failure.",
    classification: "High Risk Suspicion",
    riskScore: 60,
    sender: "ceo@trusted-corp.com",
    subject: "URGENT: Wire Transfer Authorization Required Immediately",
  },
];
