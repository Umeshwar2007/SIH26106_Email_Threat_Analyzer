"use client";

import React, { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface Node {
  id: string;
  label: string;
  sublabel: string;
  x: number;
  y: number;
  type: "origin" | "asn" | "domain" | "campaign" | "target";
  risk: "critical" | "warning" | "neutral" | "safe";
}

interface Edge {
  from: string;
  to: string;
  label: string;
}

export function ThreatGraphModal({
  isOpen,
  onClose,
  initialIp = "127.0.0.1",
  domain = "ingress-node.net",
  targetDomain = "claimed-sender.org",
  asn = "Transit Relay AS",
}: {
  isOpen: boolean;
  onClose: () => void;
  initialIp?: string;
  domain?: string;
  targetDomain?: string;
  asn?: string;
}) {
  const [selectedNode, setSelectedNode] = useState<string>("ip");

  const nodes: Node[] = [
    {
      id: "asn",
      label: asn || "Transit AS",
      sublabel: "Autonomous System Relay",
      x: 120,
      y: 190,
      type: "asn",
      risk: "warning",
    },
    {
      id: "ip",
      label: initialIp,
      sublabel: "Inbound Ingress Origin IP",
      x: 320,
      y: 190,
      type: "origin",
      risk: "warning",
    },
    {
      id: "domain",
      label: domain || "routing-domain.org",
      sublabel: "Relayed Inbound Domain",
      x: 540,
      y: 110,
      type: "domain",
      risk: "warning",
    },
    {
      id: "target",
      label: targetDomain || "sender-domain.com",
      sublabel: "Claimed Header Identity",
      x: 740,
      y: 110,
      type: "target",
      risk: "safe",
    },
    {
      id: "campaign",
      label: "Header Analysis",
      sublabel: "Multi-Signal Correlation",
      x: 540,
      y: 280,
      type: "campaign",
      risk: "neutral",
    },
    {
      id: "url",
      label: "DNS & Crypto Checks",
      sublabel: "SPF / DKIM / DMARC",
      x: 740,
      y: 280,
      type: "domain",
      risk: "safe",
    },
  ];

  const edges: Edge[] = [
    { from: "asn", to: "ip", label: "hosts" },
    { from: "ip", to: "domain", label: "relayed" },
    { from: "domain", to: "target", label: "aligns" },
    { from: "ip", to: "campaign", label: "evaluated" },
    { from: "campaign", to: "url", label: "verified" },
  ];

  const selectedNodeData = nodes.find((n) => n.id === selectedNode);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Forensic Correlation Graph"
      subtitle="Multi-entity attribution cluster"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        <p className="text-xs text-ink-muted leading-relaxed">
          Interactive correlation graph identifying infrastructure connections, routing relationships,
          and authentication anchors tied to ingress node {initialIp}.
        </p>

        {/* Sparse SVG Canvas */}
        <div className="relative w-full h-[360px] bg-paper-subtle border border-border-light rounded overflow-hidden select-none">
          <svg className="w-full h-full" viewBox="0 0 860 380">
            {/* Draw Edges */}
            {edges.map((edge, idx) => {
              const fromNode = nodes.find((n) => n.id === edge.from)!;
              const toNode = nodes.find((n) => n.id === edge.to)!;
              const midX = (fromNode.x + toNode.x) / 2;
              const midY = (fromNode.y + toNode.y) / 2;

              return (
                <g key={idx}>
                  <line
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke="#D4D4D0"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <rect
                    x={midX - 28}
                    y={midY - 10}
                    width="56"
                    height="18"
                    rx="3"
                    fill="#FFFFFF"
                    stroke="#E8E8E5"
                    strokeWidth="1"
                  />
                  <text
                    x={midX}
                    y={midY + 3}
                    textAnchor="middle"
                    className="font-mono text-[9px] fill-neutral-500 uppercase tracking-wider"
                  >
                    {edge.label}
                  </text>
                </g>
              );
            })}

            {/* Draw Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNode === node.id;
              const strokeColor =
                node.risk === "critical"
                  ? "#DC2626"
                  : node.risk === "warning"
                  ? "#FF9F43"
                  : node.risk === "safe"
                  ? "#18C77A"
                  : "#64748B";

              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedNode(node.id)}
                  className="cursor-pointer transition-transform duration-150 hover:scale-105"
                  transform={`translate(${node.x}, ${node.y})`}
                >
                  <circle
                    r={isSelected ? 26 : 22}
                    fill="#FFFFFF"
                    stroke={strokeColor}
                    strokeWidth={isSelected ? "2.5" : "1.5"}
                    className="transition-all"
                  />
                  <circle
                    r={isSelected ? 6 : 4}
                    fill={strokeColor}
                  />

                  {/* Node Label Below */}
                  <text
                    y={36}
                    textAnchor="middle"
                    className={`font-mono text-[11px] font-semibold ${
                      isSelected ? "fill-black" : "fill-neutral-800"
                    }`}
                  >
                    {node.label}
                  </text>
                  <text
                    y={49}
                    textAnchor="middle"
                    className="font-sans text-[9px] fill-neutral-500"
                  >
                    {node.sublabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Node detail inspector strip */}
        {selectedNodeData && (
          <div className="p-3.5 bg-paper-muted border border-border-light rounded flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <div className="font-mono text-[10px] uppercase text-ink-muted">
                Selected Entity: {selectedNodeData.type}
              </div>
              <div className="font-semibold text-ink">{selectedNodeData.label}</div>
              <div className="text-ink-muted text-[11px]">{selectedNodeData.sublabel}</div>
            </div>
            <div className="text-right font-mono text-[11px]">
              <span
                className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                  selectedNodeData.risk === "critical"
                    ? "bg-threat-redBg text-threat-red"
                    : selectedNodeData.risk === "warning"
                    ? "bg-accent-amberBg text-accent-amber"
                    : selectedNodeData.risk === "safe"
                    ? "bg-accent-greenBg text-accent-green"
                    : "bg-paper text-ink-muted"
                }`}
              >
                {selectedNodeData.risk}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border-light">
          <Button variant="primary" size="sm" onClick={onClose}>
            Close Graph
          </Button>
        </div>
      </div>
    </Modal>
  );
}
