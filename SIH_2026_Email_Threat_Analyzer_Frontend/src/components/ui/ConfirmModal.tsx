"use client";

import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertCircle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = "Confirm Action",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isDestructive = true,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} maxWidth="max-w-md">
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded bg-threat-redBg text-threat-red mt-0.5 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <p className="text-sm text-ink-muted leading-relaxed">{description}</p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border-light">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "primary"}
            size="sm"
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
