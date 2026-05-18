"use client";

import type { PanelExtensionContext } from "@foxglove/extension";
import { ReactElement, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";

import { AttitudeIndicator } from "../components/attitude-indicator";
import { PanelInfoTip } from "../components/panel-info-tip";
import { TopicIngestErrorBanner } from "../components/topic-ingest-error-banner";
import { maxSquareInstrumentSize } from "./telemetryShared";
import { useImuTopicPanelSettings } from "./useImuTopicPanelSettings";
import { useIslTelemetryPanel } from "./useIslTelemetryPanel";

function HorizonPanel({ context }: { context: PanelExtensionContext }): ReactElement {
  const {
    containerRef,
    containerWidth,
    containerHeight,
    theme,
    droneData,
    availableTopics,
    selectedImuTopic,
    setSelectedImuTopic,
    allImuTopicNames,
    baseFont,
    imuIngestError,
  } = useIslTelemetryPanel(context);

  useImuTopicPanelSettings(
    context,
    availableTopics,
    allImuTopicNames,
    selectedImuTopic,
    setSelectedImuTopic,
    "sensor_msgs/Imu used for roll/pitch when messages arrive. Choose in this list (gear icon → Panel).",
  );

  useEffect(() => {
    context.setDefaultPanelTitle("ISL Horizon");
  }, [context]);

  const isCompact = containerWidth < 420;
  const outerPad = isCompact ? 8 : 12;
  const componentSize = useMemo(() => {
    const innerW = containerWidth - 2 * outerPad;
    const innerH = containerHeight - 2 * outerPad - 40;
    return maxSquareInstrumentSize(innerW, innerH);
  }, [containerWidth, containerHeight, outerPad]);

  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    backgroundColor: theme.bg,
    color: theme.text,
    padding: outerPad,
    boxSizing: "border-box",
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontSize: `${baseFont}px`,
    display: "flex",
    flexDirection: "column",
  };

  const cardStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: "4px",
    overflow: "hidden",
  };

  const instrumentArea: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: isCompact ? "6px" : "10px",
  };

  const plotFrame: React.CSSProperties = {
    position: "relative",
    width: componentSize,
    height: componentSize,
    flexShrink: 0,
  };

  const attitudeTipWrap: React.CSSProperties = {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 2,
  };

  const gnssRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    flexShrink: 0,
    padding: "8px 10px 10px",
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

  return (
    <div ref={containerRef} style={containerStyle}>
      <TopicIngestErrorBanner message={imuIngestError ?? ""} topic={selectedImuTopic} theme={theme} />
      <div style={cardStyle}>
        <div style={instrumentArea}>
          <div style={plotFrame}>
            <div style={attitudeTipWrap}>
              <PanelInfoTip
                theme={theme}
                title="Roll / pitch: from the selected IMU orientation (sensor_msgs/Imu) when messages arrive in-frame; otherwise from /Odometry pose orientation."
              />
            </div>
            <AttitudeIndicator
              roll={droneData.roll}
              pitch={droneData.pitch}
              darkMode={theme.isDark}
              size={componentSize}
            />
          </div>
        </div>
        <div style={gnssRow}>
          <span style={labelStyle}>GNSS</span>
          <span style={numStyle}>{droneData.gnssAltitudeValid ? droneData.altitude.toFixed(1) : "—"}</span>
          <span style={{ ...labelStyle, fontWeight: 400 }}>m</span>
          <PanelInfoTip
            theme={theme}
            title="Ellipsoidal height from topic /fix (sensor_msgs/NavSatFix). Not barometric AGL."
          />
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
