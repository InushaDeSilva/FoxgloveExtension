"use client";

import type { FoxTheme } from "../panels/telemetryShared";

interface PanelInfoTipProps {
  title: string;
  theme: FoxTheme;
}

/** Small theme-aware (i) control; use native `title` for hover tooltip text. */
export function PanelInfoTip({ title, theme }: PanelInfoTipProps) {
  const ring = theme.isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  return (
    <span
      title={title}
      role="img"
      aria-label={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "1.15em",
        height: "1.15em",
        marginLeft: "4px",
        borderRadius: "999px",
        border: `1px solid ${ring}`,
        color: theme.textMuted,
        backgroundColor: theme.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
        fontSize: "0.72em",
        fontWeight: 700,
        fontStyle: "italic",
        fontFamily: "Georgia, 'Times New Roman', serif",
        lineHeight: 1,
        cursor: "help",
        userSelect: "none",
        verticalAlign: "middle",
      }}
    >
      i
    </span>
  );
}
