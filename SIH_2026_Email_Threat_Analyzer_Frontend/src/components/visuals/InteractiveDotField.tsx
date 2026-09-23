"use client";

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import gsap from "gsap";

export interface InteractiveDotFieldRef {
  triggerRipple: (x?: number, y?: number, intensity?: number) => void;
  pulseAt: (x: number, y: number, radius?: number, strength?: number) => void;
}

export interface InteractiveDotFieldProps {
  density?: "low" | "medium" | "high";
  color?: string; // Hex for base dots (default: #111111)
  accentColor?: string; // Hex for interactive dots (default: #18C77A)
  interactionRadius?: number; // Pixels around cursor (default: 140)
  interactionStrength?: number; // Force multiplier (default: 0.95)
  baseOpacity?: number; // Normal opacity (default: 0.20)
  className?: string;
  disabled?: boolean;
}

interface Dot {
  originX: number;
  originY: number;
  physX: number; // Dynamic displacement from cursor/ripples
  physY: number;
  vx: number;
  vy: number;
  baseRadius: number;
  currentRadius: number;
  baseAlpha: number;
  currentAlpha: number;
  accentWeight: number; // 0 = base monochrome, 1 = full accent
  phaseOffset: number;
  speedMultiplier: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  intensity: number;
  life: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.replace("#", "").trim();
  if (sanitized.length === 3) {
    return [
      parseInt(sanitized[0] + sanitized[0], 16),
      parseInt(sanitized[1] + sanitized[1], 16),
      parseInt(sanitized[2] + sanitized[2], 16),
    ];
  }
  if (sanitized.length === 6) {
    return [
      parseInt(sanitized.substring(0, 2), 16),
      parseInt(sanitized.substring(2, 4), 16),
      parseInt(sanitized.substring(4, 6), 16),
    ];
  }
  return [17, 17, 17];
}

export const InteractiveDotField = forwardRef<
  InteractiveDotFieldRef,
  InteractiveDotFieldProps
>(function InteractiveDotField(
  {
    density = "medium",
    color = "#111111",
    accentColor = "#18C77A",
    interactionRadius = 140,
    interactionStrength = 0.95,
    baseOpacity = 0.20,
    className = "",
    disabled = false,
  },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const dotsRef = useRef<Dot[]>([]);

  // Function to burst dots outward with accent color directly at a coordinate
  const pulseAtInternal = (x: number, y: number, radius = 240, strength = 2.4) => {
    const dots = dotsRef.current;
    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      const dx = dot.originX + dot.physX - x;
      const dy = dot.originY + dot.physY - y;
      const dist = Math.hypot(dx, dy);
      if (dist < radius && dist > 0.001) {
        const factor = (1 - dist / radius) * strength;
        const angle = Math.atan2(dy, dx);
        dot.vx += Math.cos(angle) * factor * 5.2;
        dot.vy += Math.sin(angle) * factor * 5.2;
        dot.accentWeight = Math.min(1, dot.accentWeight + factor * 0.7);
      }
    }
  };

  // Function to create expanding GSAP wave ripple
  const createRipple = (x: number, y: number, maxRadius: number, intensity: number) => {
    const ripple: Ripple = {
      x,
      y,
      radius: 0,
      maxRadius,
      intensity,
      life: 1.0,
    };
    ripplesRef.current.push(ripple);

    // Smooth GSAP expansion and power2 deceleration
    gsap.to(ripple, {
      radius: maxRadius,
      life: 0,
      duration: 1.6,
      ease: "power2.out",
      onComplete: () => {
        const idx = ripplesRef.current.indexOf(ripple);
        if (idx !== -1) ripplesRef.current.splice(idx, 1);
      },
    });
  };

  // Expose imperative API for external ripples & pulses
  useImperativeHandle(ref, () => ({
    triggerRipple(x?: number, y?: number, intensity = 1.4) {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const rippleX = x !== undefined ? x : rect.width / 2;
      const rippleY = y !== undefined ? y : rect.height / 2;
      pulseAtInternal(rippleX, rippleY, 200, 1.8);
      createRipple(rippleX, rippleY, Math.max(rect.width, rect.height) * 0.95, intensity);
    },
    pulseAt(x: number, y: number, radius = 240, strength = 2.4) {
      pulseAtInternal(x, y, radius, strength);
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || disabled) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const isReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const [baseR, baseG, baseB] = hexToRgb(color);
    const [accR, accG, accB] = hexToRgb(accentColor);

    let width = 0;
    let height = 0;
    let dpr = 1;

    const mouse = {
      x: -9999,
      y: -9999,
      prevX: -9999,
      prevY: -9999,
      vx: 0,
      vy: 0,
      isActive: false,
    };

    // Refined grid spacing for an airy, distinct point lattice
    const getSpacing = (w: number) => {
      const isMobile = w < 768;
      const baseSpacing =
        density === "high" ? 28 : density === "low" ? 44 : 36;
      return isMobile ? baseSpacing * 1.25 : baseSpacing;
    };

    // Initialize point lattice across the screen
    const initDots = () => {
      const spacing = getSpacing(width);
      const cols = Math.floor(width / spacing) + 2;
      const rows = Math.floor(height / spacing) + 2;

      const offsetX = (width - (cols - 1) * spacing) / 2;
      const offsetY = (height - (rows - 1) * spacing) / 2;

      const dots: Dot[] = [];
      const isMobile = width < 768;
      // Well-defined, visible dot size: base radius 1.75px on desktop (diameter 3.5px), 1.35px on mobile
      const baseR = isMobile ? 1.35 : 1.75;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = offsetX + c * spacing;
          const y = offsetY + r * spacing;
          dots.push({
            originX: x,
            originY: y,
            physX: 0,
            physY: 0,
            vx: 0,
            vy: 0,
            baseRadius: baseR,
            currentRadius: baseR,
            baseAlpha: baseOpacity,
            currentAlpha: baseOpacity,
            accentWeight: 0,
            phaseOffset: (c * 0.19 + r * 0.23) % (Math.PI * 2),
            speedMultiplier: 0.9 + ((c * 7 + r * 13) % 5) * 0.06,
          });
        }
      }
      dotsRef.current = dots;
    };

    // Size canvas with device pixel ratio
    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.floor(rect.width || window.innerWidth);
      height = Math.floor(rect.height || window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      initDots();
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(container);
    resize();

    // GSAP-smoothed pointer tracking for buttery smooth motion
    const handlePointerMove = (e: MouseEvent) => {
      if (isReducedMotion) return;
      const rect = canvas.getBoundingClientRect();
      const targetX = e.clientX - rect.left;
      const targetY = e.clientY - rect.top;

      mouse.isActive = true;

      gsap.to(mouse, {
        x: targetX,
        y: targetY,
        duration: 0.22,
        ease: "power2.out",
        overwrite: "auto",
      });
    };

    const handlePointerLeave = () => {
      mouse.isActive = false;
    };

    // Tactile Click Effect: Instant burst of green energy + expanding GSAP ripple
    const handlePointerDown = (e: MouseEvent) => {
      if (isReducedMotion) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // 1. Immediate tactile impulse right under the click
      pulseAtInternal(clickX, clickY, 260, 2.6);

      // 2. High-energy expanding ripple wave
      createRipple(clickX, clickY, Math.max(width, height) * 0.95, 1.8);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { capture: true, passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);

    // Global ripple event listener for forensic page triggers
    const handleGlobalRipple = (e: Event) => {
      const customEvent = e as CustomEvent<{
        x?: number;
        y?: number;
        intensity?: number;
      }>;
      const detail = customEvent.detail || {};
      const rect = canvas.getBoundingClientRect();
      const rx =
        detail.x !== undefined ? detail.x - rect.left : width / 2;
      const ry =
        detail.y !== undefined ? detail.y - rect.top : height / 2;

      pulseAtInternal(rx, ry, 220, 2.0);
      createRipple(rx, ry, Math.max(width, height) * 0.95, detail.intensity || 1.6);
    };

    window.addEventListener("threattrace:ripple", handleGlobalRipple);

    // Reduced motion fallback: render static point lattice
    if (isReducedMotion) {
      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      const dots = dotsRef.current;
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        ctx.moveTo(d.originX + d.baseRadius, d.originY);
        ctx.arc(d.originX, d.originY, d.baseRadius, 0, Math.PI * 2);
      }
      ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${baseOpacity})`;
      ctx.fill();

      return () => {
        resizeObserver.disconnect();
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerdown", handlePointerDown, { capture: true });
        document.removeEventListener("mouseleave", handlePointerLeave);
        window.removeEventListener("threattrace:ripple", handleGlobalRipple);
      };
    }

    // Physics Engine & Batch Canvas Renderer driven by GSAP Ticker
    const springK = 0.045; // Elastic return strength
    const damping = 0.83; // Damping
    const radSq = interactionRadius * interactionRadius;
    const wiggleAmp = 3.0; // Clear, noticeable organic wiggling amplitude

    let startTime = performance.now();

    const renderTick = () => {
      const time = performance.now() - startTime;

      if (mouse.isActive) {
        mouse.vx = mouse.x - mouse.prevX;
        mouse.vy = mouse.y - mouse.prevY;
        mouse.prevX = mouse.x;
        mouse.prevY = mouse.y;
      } else {
        mouse.x = -9999;
        mouse.y = -9999;
      }

      ctx.clearRect(0, 0, width, height);

      const dots = dotsRef.current;
      const numDots = dots.length;
      const ripples = ripplesRef.current;

      // Group paths: unaccented base dots rendered in ONE single draw call for max performance
      ctx.beginPath();
      const activeDots: { dot: Dot; renderX: number; renderY: number }[] = [];

      for (let i = 0; i < numDots; i++) {
        const dot = dots[i];

        // 1. Lively, continuous sinusoidal organic wiggling
        const t1 =
          time * 0.0012 * dot.speedMultiplier +
          dot.phaseOffset +
          dot.originX * 0.007;
        const t2 =
          time * 0.0016 * dot.speedMultiplier +
          dot.phaseOffset * 1.2 +
          dot.originY * 0.008;
        const wiggleX = Math.sin(t1) * wiggleAmp + Math.cos(t2 * 0.7) * 1.0;
        const wiggleY = Math.cos(t1 * 0.85) * wiggleAmp + Math.sin(t2) * 1.0;

        // 2. Mouse Repulsion Force applied to physical displacement
        if (mouse.isActive) {
          const currentPosX = dot.originX + wiggleX + dot.physX;
          const currentPosY = dot.originY + wiggleY + dot.physY;
          const dx = currentPosX - mouse.x;
          const dy = currentPosY - mouse.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < radSq && distSq > 0.01) {
            const dist = Math.sqrt(distSq);
            const factor = 1 - dist / interactionRadius;
            const force = factor * factor * interactionStrength * 3.8;
            const angle = Math.atan2(dy, dx);

            dot.vx += Math.cos(angle) * force;
            dot.vy += Math.sin(angle) * force;

            // Electric green accent smoothly illuminates around cursor
            dot.accentWeight = Math.min(1, dot.accentWeight + factor * 0.6);
          }
        }

        // 3. Ripple Waves with wide band and energetic displacement
        for (let j = 0; j < ripples.length; j++) {
          const rip = ripples[j];
          const currentPosX = dot.originX + wiggleX + dot.physX;
          const currentPosY = dot.originY + wiggleY + dot.physY;
          const rdx = currentPosX - rip.x;
          const rdy = currentPosY - rip.y;
          const rDist = Math.hypot(rdx, rdy);
          const waveDist = Math.abs(rDist - rip.radius);

          if (waveDist < 46 && rDist > 0.01) {
            const waveFactor = (1 - waveDist / 46) * rip.intensity * rip.life;
            const angle = Math.atan2(rdy, rdx);
            dot.vx += Math.cos(angle) * waveFactor * 3.8;
            dot.vy += Math.sin(angle) * waveFactor * 3.8;
            dot.accentWeight = Math.min(1, dot.accentWeight + waveFactor * 0.65);
          }
        }

        // 4. Elastic Spring Return to rest (physX -> 0, physY -> 0)
        dot.vx += -dot.physX * springK;
        dot.vy += -dot.physY * springK;

        // 5. Damping
        dot.vx *= damping;
        dot.vy *= damping;

        // 6. Displacement Integration
        dot.physX += dot.vx;
        dot.physY += dot.vy;

        // Final rendered coordinates on screen
        const renderX = dot.originX + wiggleX + dot.physX;
        const renderY = dot.originY + wiggleY + dot.physY;

        // 7. Dynamic Radius & Alpha
        const disp = Math.hypot(dot.physX, dot.physY);
        const dispRatio = Math.min(disp / 22, 1);

        // Breathing pulse
        const radiusPulse = Math.sin(time * 0.0022 + dot.phaseOffset) * 0.22;
        dot.currentRadius = dot.baseRadius + radiusPulse + dispRatio * 1.1;
        dot.currentAlpha = Math.min(
          dot.baseAlpha + dispRatio * 0.32 + dot.accentWeight * 0.38,
          0.78
        );

        dot.accentWeight *= 0.93; // Smooth decay

        if (dot.accentWeight > 0.02) {
          activeDots.push({ dot, renderX, renderY });
        } else {
          // Render base dot in single master path
          ctx.moveTo(renderX + dot.currentRadius, renderY);
          ctx.arc(renderX, renderY, dot.currentRadius, 0, Math.PI * 2);
        }
      }

      // Draw all base dots in one single GPU pass
      ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${baseOpacity})`;
      ctx.fill();

      // Render accented dots individually with green blend
      for (let i = 0; i < activeDots.length; i++) {
        const { dot, renderX, renderY } = activeDots[i];
        const w = dot.accentWeight;

        const r = Math.round(baseR + (accR - baseR) * w);
        const g = Math.round(baseG + (accG - baseG) * w);
        const b = Math.round(baseB + (accB - baseB) * w);

        ctx.beginPath();
        ctx.arc(renderX, renderY, dot.currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${dot.currentAlpha})`;
        ctx.fill();
      }
    };

    // Use GSAP ticker for ultra-smooth 60/120fps sync and frame-dropping protection
    gsap.ticker.add(renderTick);

    return () => {
      gsap.ticker.remove(renderTick);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown, { capture: true });
      document.removeEventListener("mouseleave", handlePointerLeave);
      window.removeEventListener("threattrace:ripple", handleGlobalRipple);
      ripplesRef.current.forEach((r) => gsap.killTweensOf(r));
    };
  }, [
    density,
    color,
    accentColor,
    interactionRadius,
    interactionStrength,
    baseOpacity,
    disabled,
  ]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none select-none absolute inset-0 overflow-hidden ${className}`}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
});
