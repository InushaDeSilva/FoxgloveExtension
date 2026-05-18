"use client";

import type { Topic } from "@foxglove/extension";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";

import type { FoxTheme } from "./telemetryShared";

interface ImuTopicCollapsibleRowProps {
  theme: FoxTheme;
  baseFont: number;
  selectedImuTopic: string;
  onTopicChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  availableTopics: readonly Topic[];
  allImuTopicNames: string[];
  /** Optional trailing controls (e.g. InfoTip) on the collapsed header row */
  headerExtra?: ReactNode;
}

export function ImuTopicCollapsibleRow({
  theme,
  baseFont,
  selectedImuTopic,
  onTopicChange,
  availableTopics,
  allImuTopicNames,
  headerExtra,
}: ImuTopicCollapsibleRowProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => {
    setExpanded((v) => !v);
  }, []);

  const labelStyle: React.CSSProperties = {
    fontSize: `${Math.max(10, baseFont - 2)}px`,
    color: theme.textMuted,
    whiteSpace: "nowrap",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  const selectStyle: React.CSSProperties = {
    width: "100%",
    minWidth: 0,
    padding: "4px 6px",
    backgroundColor: theme.inputBg,
    color: theme.text,
    border: `1px solid ${theme.inputBorder}`,
    borderRadius: "3px",
    fontSize: `${Math.max(11, Math.round(baseFont * 0.92))}px`,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    cursor: "pointer",
    outline: "none",
    boxSizing: "border-box",
  };

  const chevron = expanded ? "▼" : "▶";
  const summary =
    selectedImuTopic !== ""
      ? selectedImuTopic
      : availableTopics.length > 0
        ? "— choose IMU —"
        : "— no topics —";

  return (
    <div
      style={{
        flexShrink: 0,
        backgroundColor: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: "4px",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={toggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          width: "100%",
          padding: "6px 8px",
          margin: 0,
          border: "none",
          background: "transparent",
          color: theme.text,
          cursor: "pointer",
          font: "inherit",
          textAlign: "left",
        }}
      >
        <span aria-hidden style={{ width: "1em", textAlign: "center", color: theme.textDim }}>
          {chevron}
        </span>
        <span style={labelStyle}>Topic</span>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: `${Math.max(10, Math.round(baseFont * 0.88))}px`,
            color: theme.text,
          }}
          title={summary}
        >
          {summary}
        </span>
        {headerExtra}
      </button>
      {expanded && (
        <div style={{ padding: "0 8px 8px" }}>
          <select style={selectStyle} value={selectedImuTopic} onChange={onTopicChange}>
            <option value="">— Select an IMU topic —</option>
            {allImuTopicNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            {availableTopics.length > 0 && (
              <optgroup label="All topics">
                {availableTopics
                  .filter((t) => !allImuTopicNames.includes(t.name))
                  .map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name} ({t.schemaName})
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
        </div>
      )}
    </div>
  );
}
