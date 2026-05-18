"use client"

import { useRef, useEffect } from "react"

interface AttitudeIndicatorProps {
  roll: number
  pitch: number
  size?: number
  darkMode?: boolean
}

export function AttitudeIndicator({ roll, pitch, size = 200, darkMode = true }: AttitudeIndicatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const adjustedPitch = pitch;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    // Scale factor for proportional elements
    const s = size / 200;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.45;

    const bezel = darkMode ? "#252526" : "#e8e8e8";
    const bezelStroke = darkMode ? "#3c3c3c" : "#c8c8c8";
    const sky = darkMode ? "#1a3a5c" : "#6ba3d4";
    const ground = darkMode ? "#6b4a36" : "#d4a574";
    const horizonColor = darkMode ? "rgba(255,255,255,0.92)" : "rgba(20,20,20,0.85)";
    const pitchText = darkMode ? "rgba(255,255,255,0.9)" : "rgba(20,20,20,0.85)";

    // Outer bezel
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 5 * s, 0, Math.PI * 2);
    ctx.fillStyle = bezel;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 3 * s, 0, Math.PI * 2);
    ctx.strokeStyle = bezelStroke;
    ctx.lineWidth = 2 * s;
    ctx.stroke();

    // Clipping region
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.translate(centerX, centerY);
    ctx.rotate(((roll + 180) * Math.PI) / 180);

    const pitchOffset = (adjustedPitch / 45) * radius;
    const extendedSize = radius * 3;

    // Ground
    ctx.beginPath();
    ctx.rect(-extendedSize, -pitchOffset, extendedSize * 2, extendedSize);
    ctx.fillStyle = ground;
    ctx.fill();

    // Sky
    ctx.beginPath();
    ctx.rect(-extendedSize, -extendedSize, extendedSize * 2, extendedSize - pitchOffset);
    ctx.fillStyle = sky;
    ctx.fill();

    // Horizon line
    ctx.beginPath();
    ctx.moveTo(-radius, -pitchOffset);
    ctx.lineTo(radius, -pitchOffset);
    ctx.strokeStyle = horizonColor;
    ctx.lineWidth = 2 * s;
    ctx.stroke();

    // Pitch lines
    ctx.strokeStyle = horizonColor;
    ctx.lineWidth = 1 * s;
    ctx.fillStyle = pitchText;
    ctx.textAlign = "center";
    ctx.font = `bold ${Math.round(12 * s)}px system-ui, sans-serif`;

    // 20 degree pitch lines
    for (let i = -40; i <= 40; i += 20) {
      if (i === 0) continue;
      const lineY = -pitchOffset - (i / 45) * radius;
      if (lineY > -radius && lineY < radius) {
        const lineWidth = radius * 0.3;
        ctx.beginPath();
        ctx.moveTo(-lineWidth, lineY);
        ctx.lineTo(lineWidth, lineY);
        ctx.stroke();
        ctx.fillText(`${Math.abs(i)}`, -lineWidth - 10 * s, lineY + 4 * s);
        ctx.fillText(`${Math.abs(i)}`, lineWidth + 10 * s, lineY + 4 * s);
      }
    }

    // 10 degree pitch lines (shorter)
    for (let i = -30; i <= 30; i += 10) {
      if (i % 20 === 0) continue;
      const lineY = -pitchOffset + (i / 45) * radius;
      if (lineY > -radius && lineY < radius) {
        const lineWidth = radius * 0.15;
        ctx.beginPath();
        ctx.moveTo(-lineWidth, lineY);
        ctx.lineTo(lineWidth, lineY);
        ctx.stroke();
      }
    }

    // 5 degree pitch lines (shortest)
    for (let i = -35; i <= 35; i += 5) {
      if (i % 10 === 0) continue;
      const lineY = -pitchOffset - (i / 45) * radius;
      if (lineY > -radius && lineY < radius) {
        const lineWidth = radius * 0.1;
        ctx.beginPath();
        ctx.moveTo(-lineWidth, lineY);
        ctx.lineTo(lineWidth, lineY);
        ctx.stroke();
      }
    }

    ctx.restore();

    const ref = darkMode ? "#f5c542" : "#c27a00";
    const rollArc = darkMode ? "rgba(255,255,255,0.75)" : "rgba(30,30,30,0.65)";

    // Fixed aircraft reference (reference mark)
    ctx.beginPath();
    ctx.moveTo(centerX - 15 * s, centerY);
    ctx.lineTo(centerX + 15 * s, centerY);
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX, centerY + 15 * s);
    ctx.strokeStyle = ref;
    ctx.lineWidth = 3 * s;
    ctx.stroke();

    // Roll indicator at the top
    ctx.save();
    ctx.translate(centerX, centerY);

    ctx.beginPath();
    ctx.arc(0, -radius + 10 * s, 10 * s, 0, Math.PI, true);
    ctx.strokeStyle = rollArc;
    ctx.lineWidth = 1 * s;
    ctx.stroke();

    ctx.rotate((roll * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo(0, -radius + 5 * s);
    ctx.lineTo(0, -radius + 15 * s);
    ctx.strokeStyle = ref;
    ctx.lineWidth = 2 * s;
    ctx.stroke();

    ctx.restore();
  }, [roll, pitch, size, darkMode]);

  return (
    <div style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: `${size}px`, height: `${size}px`, borderRadius: "50%" }}
      />
    </div>
  );
}
