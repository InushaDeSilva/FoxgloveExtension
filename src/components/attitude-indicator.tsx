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
    // Invert the pitch value to compensate for flipped data
    const adjustedPitch = pitch;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size with device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Constants
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.45;

    // Draw outer bezel
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
    ctx.fillStyle = darkMode ? "#1a1a1a" : "#e0e0e0";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
    ctx.strokeStyle = darkMode ? "#333" : "#ccc";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Create a clipping region for the attitude indicator
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();

    // Translate to center
    ctx.translate(centerX, centerY);

    // Rotate for roll
    ctx.rotate(((roll + 180) * Math.PI) / 180);

    // Adjust for pitch (move horizon up/down)
    const pitchOffset = (adjustedPitch / 45) * radius;

    // Draw sky and ground - make them much larger to avoid seeing edges during rotation
    const extendedSize = radius * 3; // Make the rectangles much larger than the visible area

    // Ground (brown) - should be BELOW the horizon (positive pitch direction)
    ctx.beginPath();
    ctx.rect(-extendedSize, -pitchOffset, extendedSize * 2, extendedSize);
    ctx.fillStyle = "#8B4513"; // Brown for ground
    ctx.fill();

    // Sky (blue) - should be ABOVE the horizon (negative pitch direction)
    ctx.beginPath();
    ctx.rect(-extendedSize, -extendedSize, extendedSize * 2, extendedSize - pitchOffset);
    ctx.fillStyle = "#3498db"; // Sky blue
    ctx.fill();

    // Draw horizon line
    ctx.beginPath();
    ctx.moveTo(-radius, -pitchOffset);
    ctx.lineTo(radius, -pitchOffset);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw pitch lines (every 10 degrees)
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "bold 12px Arial";

    // Draw 20 degree pitch lines
    for (let i = -40; i <= 40; i += 20) {
      if (i === 0) continue; // Skip horizon line as we already drew it

      const lineY = -pitchOffset - (i / 45) * radius;

      // Only draw if within view
      if (lineY > -radius && lineY < radius) {
        // Draw longer line for 20 degree marks
        const lineWidth = radius * 0.3;

        ctx.beginPath();
        ctx.moveTo(-lineWidth, lineY);
        ctx.lineTo(lineWidth, lineY);
        ctx.stroke();

        // Add pitch value on both sides
        ctx.fillText(`${Math.abs(i)}`, -lineWidth - 10, lineY + 4);
        ctx.fillText(`${Math.abs(i)}`, lineWidth + 10, lineY + 4);
      }
    }

    // Draw 10 degree pitch lines (shorter, no numbers)
    for (let i = -30; i <= 30; i += 10) {
      if (i % 20 === 0) continue; // Skip the 20 degree lines we already drew

      const lineY = -pitchOffset + (i / 45) * radius;

      // Only draw if within view
      if (lineY > -radius && lineY < radius) {
        const lineWidth = radius * 0.15;

        ctx.beginPath();
        ctx.moveTo(-lineWidth, lineY);
        ctx.lineTo(lineWidth, lineY);
        ctx.stroke();
      }
    }

    // Draw 5 degree pitch lines (shortest)
    for (let i = -35; i <= 35; i += 5) {
      if (i % 10 === 0) continue; // Skip the 10 and 20 degree lines we already drew

      const lineY = -pitchOffset - (i / 45) * radius;

      // Only draw if within view
      if (lineY > -radius && lineY < radius) {
        const lineWidth = radius * 0.1;

        ctx.beginPath();
        ctx.moveTo(-lineWidth, lineY);
        ctx.lineTo(lineWidth, lineY);
        ctx.stroke();
      }
    }

    // Restore context (removes clipping)
    ctx.restore();

    // Draw fixed aircraft reference (yellow T shape)
    ctx.beginPath();
    ctx.moveTo(centerX - 15, centerY);
    ctx.lineTo(centerX + 15, centerY);
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX, centerY + 15);
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw roll indicator at the top
    ctx.save();
    ctx.translate(centerX, centerY);

    // Draw roll arc
    ctx.beginPath();
    ctx.arc(0, -radius + 10, 10, 0, Math.PI, true);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw roll indicator
    ctx.rotate((roll * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo(0, -radius + 5);
    ctx.lineTo(0, -radius + 15);
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }, [roll, pitch, size, darkMode]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-full"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  );
}
