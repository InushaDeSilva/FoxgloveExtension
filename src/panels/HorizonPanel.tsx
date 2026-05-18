"use client";

import type { PanelExtensionContext } from "@foxglove/extension";
import { ReactElement, useEffect } from "react";
import { createRoot } from "react-dom/client";

import { AttitudeIndicator } from "../components/attitude-indicator";
import { PanelInfoTip } from "../components/panel-info-tip";
import { ImuTopicCollapsibleRow } from "./ImuTopicCollapsibleRow";
import { useIslTelemetryPanel } from "./useIslTelemetryPanel";

function computeInstrumentSize(containerWidth: number, containerHeight: number): number {
  return Math.max(
    88,
    Math.min(Math.min(containerWidth * 0.72, (containerHeight - 140) * 0.48), 300),
  );
}

function HorizonPanel({ context }: { context: PanelExtensionContext }): ReactElement {
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
    context.setDefaultPanelTitle("ISL Horizon");
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
  };

  const cardStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: "4px",
    padding: isCompact ? "8px" : "12px",
    flex: 1,
    minHeight: 0,
  };

  const headerRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    marginBottom: "8px",
    fontSize: `${Math.round(baseFont * 1.05)}px`,
    fontWeight: 600,
    color: theme.text,
  };

  const gnssRow: React.CSSProperties = {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "center",
    gap: "6px",
    marginTop: "8px",
    flexWrap: "wrap",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: `${Math.max(9, baseFont - 3)}px`,
    color: theme.textDim,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  const numStyle: React.CSSProperties = {
    fontSize: `${Math.max(13, Math.round(baseFont * 1.1))}px`,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontWeight: 600,
    color: theme.text,
  };

  const helpCluster = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
      <PanelInfoTip
        theme={theme}
        title="GNSS altitude: ellipsoidal height from /fix (sensor_msgs/NavSatFix). Not barometric AGL."
      />
      <PanelInfoTip
        theme={theme}
        title="Odometry: when no IMU orientation update arrives in the same frame, roll/pitch/heading fall back to /Odometry pose orientation."
      />
      <PanelInfoTip
        theme={theme}
        title="IMU: when an IMU topic is selected, roll/pitch come from its orientation quaternion (sensor_msgs/Imu)."
      />
    </span>
  );

  return (
    <div ref={containerRef} style={containerStyle}>
      <ImuTopicCollapsibleRow
        theme={theme}
        baseFont={baseFont}
        selectedImuTopic={selectedImuTopic}
        onTopicChange={handleImuTopicChange}
        availableTopics={availableTopics}
        allImuTopicNames={allImuTopicNames}
      />

      <div style={cardStyle}>
        <div style={headerRow}>
          Horizon
          {helpCluster}
        </div>
        <AttitudeIndicator
          roll={droneData.roll}
          pitch={droneData.pitch}
          darkMode={theme.isDark}
          size={componentSize}
        />
        <div style={gnssRow}>
          <span style={labelStyle}>GNSS</span>
          <span style={numStyle}>{droneData.gnssAltitudeValid ? droneData.altitude.toFixed(1) : "—"}</span>
          <span style={{ ...labelStyle, fontWeight: 400 }}>m</span>
        </div>
      </div>
    </div>
  );
}

export function initHorizonPanel(context: PanelExtensionContext): () => void {
  const root = createRoot(context.panelElement);
  root.render(<HorizonPanel context={context} />);
  return () => {
    root.unmount();
  };
}
