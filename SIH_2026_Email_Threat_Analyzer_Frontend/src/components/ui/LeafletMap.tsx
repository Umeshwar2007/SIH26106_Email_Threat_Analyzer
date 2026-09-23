"use client";

import React, { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

interface LeafletMapProps {
  coords?: [number, number] | null;
  location: string;
  ip: string;
  asn?: string;
  height?: string;
}

function MapController({
  coords,
  useMapHook,
}: {
  coords: [number, number];
  useMapHook: any;
}) {
  const map = useMapHook();
  useEffect(() => {
    if (map && coords) {
      map.setView(coords, map.getZoom() || 10);
    }
  }, [coords, map]);
  return null;
}

export function LeafletMap({
  coords,
  location,
  ip,
  asn,
  height = "220px",
}: LeafletMapProps) {
  const [mounted, setMounted] = useState(false);
  const [MapComponents, setMapComponents] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    Promise.all([import("react-leaflet"), import("leaflet")])
      .then(([reactLeaflet, L]) => {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });

        setMapComponents({
          MapContainer: reactLeaflet.MapContainer,
          TileLayer: reactLeaflet.TileLayer,
          Marker: reactLeaflet.Marker,
          Popup: reactLeaflet.Popup,
          useMap: reactLeaflet.useMap,
        });
      })
      .catch((err) => {
        console.warn("Leaflet map load warning:", err);
      });
  }, []);

  if (!coords) {
    return (
      <div
        style={{ height }}
        className="w-full bg-paper-subtle border border-border-light rounded flex flex-col items-center justify-center p-6 text-center space-y-2"
      >
        <MapPin className="w-5 h-5 text-ink-subtle opacity-60" />
        <div className="space-y-0.5">
          <div className="text-xs font-semibold text-ink">Geolocation unavailable</div>
          <div className="text-[11px] font-mono text-ink-muted">
            {location || "Location unavailable for this IP"}
          </div>
        </div>
        <div className="text-[10px] font-mono text-ink-subtle">
          {ip} · Private, reserved, or unmapped network node
        </div>
      </div>
    );
  }

  if (!mounted || !MapComponents) {
    return (
      <div
        style={{ height }}
        className="w-full bg-paper-subtle border border-border-light rounded flex items-center justify-center p-4"
      >
        <div className="flex items-center gap-2 text-ink-muted font-mono text-xs">
          <MapPin className="w-4 h-4 text-ink-subtle animate-pulse" />
          <span>Locating {ip}...</span>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, useMap } = MapComponents;

  return (
    <div
      style={{ height }}
      className="w-full relative rounded border border-border-light overflow-hidden quiet-map"
    >
      <MapContainer
        center={coords}
        zoom={10}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <MapController coords={coords} useMapHook={useMap} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={coords}>
          <Popup>
            <div className="p-0.5 space-y-1 text-left">
              <div className="font-mono text-xs font-bold text-white tracking-wide">{ip}</div>
              <div className="text-forensic-muted text-[11px] font-sans">{location}</div>
              {asn && <div className="text-forensic-dim text-[10px] font-mono">{asn}</div>}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
      <div className="absolute bottom-2.5 left-2.5 z-[400] bg-paper/95 backdrop-blur-xs border border-border-light px-2.5 py-1 rounded text-[11px] font-mono text-ink-muted">
        {ip} · {coords[0].toFixed(4)}° N, {coords[1].toFixed(4)}° E
      </div>
    </div>
  );
}
