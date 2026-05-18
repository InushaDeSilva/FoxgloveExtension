"use client";

import type { ReactElement } from "react";

import type { FoxTheme } from "../panels/telemetryShared";

export function TopicIngestErrorBanner({
  message,
  topic,
  theme,
}: {
  message: string;
  topic: string;
  theme: FoxTheme;
}): ReactElement | null {
  if (!message) {
    return null;
  }

  const bg = theme.isDark ? "rgba(127, 29, 29, 0.45)" : "#fee2e2";
  const fg = theme.isDark ? "#fecaca" : "#991b1b";
  const border = theme.danger;

  return (
    <div
      role="alert"
      style={{
        flexShrink: 0,
        marginBottom: "8px",
        padding: "10px 12px",
        borderRadius: "4px",
        border: `1px solid ${border}`,
        backgroundColor: bg,
        color: fg,
        fontSize: "13px",
        lineHeight: 1.45,
      }}
    >
      <strong>Cannot use this topic as IMU</strong>
      {topic ? (
        <div style={{ marginTop: "4px", fontFamily: "ui-monospace, monospace", wordBreak: "break-all" }}>
          {topic}
        </div>
      ) : null}
      <div style={{ marginTop: "6px" }}>{message}</div>
      <div style={{ marginTop: "8px", opacity: 0.95 }}>
        Open <strong>panel settings</strong> (gear icon) → <strong>Panel</strong> → <strong>IMU message topic</strong> and
        choose a <code style={{ fontSize: "12px" }}>sensor_msgs/Imu</code> topic.
      </div>
    </div>
  );
}
