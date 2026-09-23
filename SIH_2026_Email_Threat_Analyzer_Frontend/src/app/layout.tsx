import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "ThreatTrace — Forensic Email Threat Intelligence",
  description:
    "AI-Powered Email Threat Detection, GeoLocation & Forensic Intelligence Platform (SIH26106)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-paper text-ink selection:bg-neutral-200">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
