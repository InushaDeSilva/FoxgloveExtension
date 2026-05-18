"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

/** Colors aligned with the parent panel (Foxglove-style chrome). */
export interface ImuPanelTheme {
  isDark: boolean;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  textDim: string;
  accentX: string;
  accentY: string;
  accentZ: string;
}

interface IMUDisplayProps {
  acceleration: {
    x: number;
    y: number;
    z: number;
  };
  gyro: {
    x: number;
    y: number;
    z: number;
  };
  /** Diameter of the XY acceleration plot (scales with panel). */
  plotSize: number;
  /** Base UI font size in px from the panel layout (scales with panel). */
  fontPx: number;
  theme: ImuPanelTheme;
}

export function IMUDisplay({
  acceleration,
  gyro,
  plotSize,
  fontPx,
  theme,
}: IMUDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const s = plotSize / 200;
  const labelSize = Math.max(10, Math.round(fontPx * 0.85));
  const valueSize = Math.max(11, Math.round(fontPx * 0.95));
  const vizSize = Math.max(56, plotSize);

  const colors = {
    sectionLabel: theme.textMuted,
    unit: theme.textDim,
    value: theme.text,
    axisX: theme.accentX,
    axisY: theme.accentY,
    axisZ: theme.accentZ,
    vizBg: theme.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
    vizBorder: theme.border,
    vizDot: theme.text,
    cardBg: theme.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = vizSize * dpr;
    canvas.height = vizSize * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, vizSize, vizSize);

    const cx = vizSize / 2;
    const cy = vizSize / 2;
    const r = vizSize * 0.42;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = colors.vizBg;
    ctx.fill();
    ctx.strokeStyle = colors.vizBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.strokeStyle = colors.vizBorder;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.font = `${Math.max(9, Math.round(10 * s))}px system-ui, sans-serif`;
    ctx.fillStyle = colors.unit;
    ctx.textAlign = "center";
    ctx.fillText("+Y", cx, cy - r - 4);
    ctx.fillText("+X", cx + r + 10, cy + 4);

    const scale = 5;
    const normX = Math.min(1, Math.max(-1, acceleration.x / scale));
    const normY = Math.min(1, Math.max(-1, acceleration.y / scale));
    const dotX = cx + normX * r * 0.8;
    const dotY = cy - normY * r * 0.8;

    ctx.beginPath();
    ctx.arc(dotX, dotY, Math.max(2.5, 3.5 * s), 0, Math.PI * 2);
    ctx.fillStyle = colors.vizDot;
    ctx.fill();
  }, [
    acceleration.x,
    acceleration.y,
    vizSize,
    s,
    colors.vizBg,
    colors.vizBorder,
    colors.vizDot,
    colors.unit,
  ]);

  const gap = Math.max(6, Math.round(fontPx * 0.45));

  const columnsStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: `${gap}px`,
    width: "100%",
  };

  const plotWrap: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
  };

  const cardsRow: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: `${gap}px`,
    width: "100%",
  };

  const blockStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: `${Math.round(gap * 0.35)}px`,
    padding: `${Math.round(gap * 0.65)}px`,
    borderRadius: "4px",
    border: `1px solid ${theme.border}`,
    backgroundColor: colors.cardBg,
  };

  const sectionLabelStyle: CSSProperties = {
    fontSize: `${labelSize}px`,
    fontWeight: 600,
    color: colors.sectionLabel,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    lineHeight: 1.2,
  };

  const rowStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: `${Math.round(gap * 0.85)}px ${gap}px`,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: `${valueSize}px`,
    lineHeight: 1.35,
  };

  const axisStyle = (): CSSProperties => ({
    display: "flex",
    gap: "4px",
    alignItems: "baseline",
  });

  const axisLabelStyle = (color: string): CSSProperties => ({
    color,
    fontWeight: 700,
    fontSize: `${labelSize}px`,
    minWidth: "1em",
  });

  const valueTextStyle: CSSProperties = {
    color: colors.value,
    minWidth: `${Math.round(44 * s)}px`,
    textAlign: "right" as const,
  };

  const plotLabel: CSSProperties = {
    ...sectionLabelStyle,
    marginBottom: "4px",
    textAlign: "center" as const,
  };

  return (
    <div style={columnsStyle}>
      <div style={plotWrap}>
        <span style={plotLabel}>
          XY acceleration <span style={{ color: colors.unit, fontWeight: 400 }}>(m/s²)</span>
        </span>
        <canvas
          ref={canvasRef}
          width={vizSize}
          height={vizSize}
          style={{
            width: `${vizSize}px`,
            height: `${vizSize}px`,
            borderRadius: "50%",
            flexShrink: 0,
          }}
        />
      </div>

      <div style={cardsRow}>
        <div style={blockStyle}>
          <span style={sectionLabelStyle}>
            Linear acceleration <span style={{ color: colors.unit, fontWeight: 400 }}>m/s²</span>
          </span>
          <div style={rowStyle}>
            <div style={axisStyle()}>
              <span style={axisLabelStyle(colors.axisX)}>X</span>
              <span style={valueTextStyle}>{acceleration.x.toFixed(2)}</span>
            </div>
            <div style={axisStyle()}>
              <span style={axisLabelStyle(colors.axisY)}>Y</span>
              <span style={valueTextStyle}>{acceleration.y.toFixed(2)}</span>
            </div>
            <div style={axisStyle()}>
              <span style={axisLabelStyle(colors.axisZ)}>Z</span>
              <span style={valueTextStyle}>{acceleration.z.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style={blockStyle}>
          <span style={sectionLabelStyle}>
            Angular velocity <span style={{ color: colors.unit, fontWeight: 400 }}>rad/s</span>
          </span>
          <div style={rowStyle}>
            <div style={axisStyle()}>
              <span style={axisLabelStyle(colors.axisX)}>X</span>
              <span style={valueTextStyle}>{gyro.x.toFixed(3)}</span>
            </div>
            <div style={axisStyle()}>
              <span style={axisLabelStyle(colors.axisY)}>Y</span>
              <span style={valueTextStyle}>{gyro.y.toFixed(3)}</span>
            </div>
            <div style={axisStyle()}>
              <span style={axisLabelStyle(colors.axisZ)}>Z</span>
              <span style={valueTextStyle}>{gyro.z.toFixed(3)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
