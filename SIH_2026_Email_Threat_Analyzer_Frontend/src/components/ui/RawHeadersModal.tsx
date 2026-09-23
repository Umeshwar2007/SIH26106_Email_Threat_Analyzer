"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { useToast } from "./ToastProvider";

interface RawHeadersModalProps {
  isOpen: boolean;
  onClose: () => void;
  headers: string;
  filename?: string;
}

export function RawHeadersModal({
  isOpen,
  onClose,
  headers,
  filename = "suspicious_invoice.eml",
}: RawHeadersModalProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(headers);
    setCopied(true);
    toast({
      type: "success",
      title: "Headers Copied",
      description: "Raw RFC 822 headers copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="RFC 822 Raw Headers"
      subtitle={filename}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Black Forensic Inspection Surface */}
        <div className="bg-forensic text-forensic-text rounded border border-forensic-border p-4 font-mono text-xs leading-relaxed max-h-[55vh] overflow-y-auto select-all whitespace-pre-wrap">
          {headers}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border-light text-xs text-ink-muted">
          <span className="font-mono text-[11px]">RFC 5322 · UTF-8 Canonical Form</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? <Check className="w-3.5 h-3.5 text-threat-green" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy Headers"}</span>
            </Button>
            <Button variant="primary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
