"use client";

import type { PanelExtensionContext } from "@foxglove/extension";
import { ReactElement, useEffect } from "react";
import { createRoot } from "react-dom/client";

import { Compass } from "../components/compass2";
import { PanelInfoTip } from "../components/panel-info-tip";
import { ImuTopicCollapsibleRow } from "./ImuTopicCollapsibleRow";
import { useIslTelemetryPanel } from "./useIslTelemetryPanel";

function computeInstrumentSize(containerWidth: number, containerHeight: number): number {
  return Math.max(
    88,
    Math.min(Math.min(containerWidth * 0.78, (containerHeight - 100) * 0.55), 320),
  );
}

function HeadingPanel({ context }: { context: PanelExtensionContext }): ReactElement {
  const {
    containerRef,
    containerWidth,
    containerHeight,
    theme,
    droneData,
    availableTopics,
    selectedImuTopic,
    allImuTopicNames,
    handleImuTopicChange,
    baseFont,
  } = useIslTelemetryPanel(context);

  useEffect(() => {
    context.setDefaultPanelTitle("ISL Heading");
  }, [context]);

  const componentSize = computeInstrumentSize(containerWidth, containerHeight);
  const isCompact = containerWidth < 420;

  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    overflow: "auto",
    backgroundColor: theme.bg,
    color: theme.text,
    padding: isCompact ? "6px" : "10px",
    boxSizing: "border-box",
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontSize: `${baseFont}px`,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    alignItems: "stretch",
  };

  const headingTip = (
    <PanelInfoTip
      theme={theme}
      title="Heading (yaw): from IMU orientation when an IMU topic is selected and messages arrive; otherwise from /Odometry pose orientation."
    />
  );

  const degRow: React.CSSProperties = {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "center",
    gap: "4px",
    marginTop: "8px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: `${Math.max(13, Math.round(baseFont * 1.08))}px`,
    fontWeight: 600,
    color: theme.text,
  };

  return (
    <div ref={containerRef} style={containerStyle}>
      <ImuTopicCollapsibleRow
        theme={theme}
        baseFont={baseFont}
        selectedImuTopic={selectedImuTopic}
        onTopicChange={handleImuTopicChange}
        availableTopics={availableTopics}
        allImuTopicNames={allImuTopicNames}
        headerExtra={headingTip}
      />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: "4px",
          padding: isCompact ? "8px" : "12px",
        }}
      >
        <Compass heading={droneData.heading} darkMode={theme.isDark} size={componentSize} />
        <div style={degRow}>
          <span>{droneData.heading.toFixed(1)}</span>
          <span style={{ fontSize: `${Math.max(10, baseFont - 2)}px`, color: theme.textDim }}>°</span>
        </div>
      </div>
    </div>
  );
}

export function initHeadingPanel(context: PanelExtensionContext): () => void {
  const root = createRoot(context.panelElement);
  root.render(<HeadingPanel context={context} />);
  return () => {
    root.unmount();
  };
}
