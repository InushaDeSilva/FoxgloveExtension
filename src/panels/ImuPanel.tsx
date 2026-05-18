"use client";

import type { PanelExtensionContext } from "@foxglove/extension";
import { ReactElement, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";

import { IMUDisplay } from "../components/imu-display";
import { PanelInfoTip } from "../components/panel-info-tip";
import { TopicIngestErrorBanner } from "../components/topic-ingest-error-banner";
import { maxSquareInstrumentSize } from "./telemetryShared";
import { useImuTopicPanelSettings } from "./useImuTopicPanelSettings";
import { useIslTelemetryPanel } from "./useIslTelemetryPanel";

function ImuPanel({ context }: { context: PanelExtensionContext }): ReactElement {
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
    "sensor_msgs/Imu on the selected topic drives linear acceleration, angular velocity, and the XY plot.",
  );

  useEffect(() => {
    context.setDefaultPanelTitle("ISL IMU");
  }, [context]);

  const isCompact = containerWidth < 420;
  const outerPad = isCompact ? 8 : 12;
  const plotSize = useMemo(() => {
    const innerW = containerWidth - 2 * outerPad - 24;
    const innerH = containerHeight - 2 * outerPad;
    const reserveBelowPlot = Math.min(220, Math.max(100, Math.round(innerH * 0.34)));
    return maxSquareInstrumentSize(innerW, innerH - reserveBelowPlot, 560);
  }, [containerWidth, containerHeight, outerPad]);

  const accelMag = Math.sqrt(
    droneData.imuAcceleration.x ** 2 +
      droneData.imuAcceleration.y ** 2 +
      droneData.imuAcceleration.z ** 2,
  );

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
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: "4px",
    padding: isCompact ? "8px" : "10px",
    overflow: "hidden",
    position: "relative",
  };

  const plotTip: React.CSSProperties = {
    position: "absolute",
    top: 10,
    right: 12,
    zIndex: 2,
  };

  const magRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    flexShrink: 0,
    marginTop: "8px",
    fontSize: `${Math.max(10, Math.round(baseFont * 0.88))}px`,
    color: theme.textMuted,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  };

  return (
    <div ref={containerRef} style={containerStyle}>
      <TopicIngestErrorBanner message={imuIngestError ?? ""} topic={selectedImuTopic} theme={theme} />
      <div style={cardStyle}>
        <div style={plotTip}>
          <PanelInfoTip
            theme={theme}
            title="XY plot: linear acceleration X (right) and Y (up); clamped for display. Linear acceleration includes gravity (~9.81 m/s² on Z when level). Gyro: angular velocity (rad/s)."
          />
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <IMUDisplay
            acceleration={droneData.imuAcceleration}
            gyro={droneData.imuGyro}
            fontPx={baseFont}
            plotSize={plotSize}
            theme={{
              isDark: theme.isDark,
              surface: theme.surface,
              border: theme.border,
              text: theme.text,
              textMuted: theme.textMuted,
              textDim: theme.textDim,
              accentX: theme.accentX,
              accentY: theme.accentY,
              accentZ: theme.accentZ,
            }}
          />
        </div>
        <div style={magRow}>
          <span style={{ color: theme.textDim, fontWeight: 600 }}>‖a‖</span>
          <span style={{ color: theme.text, fontWeight: 600 }}>{accelMag.toFixed(2)}</span>
          <span style={{ color: theme.textDim }}>m/s²</span>
          <PanelInfoTip
            theme={theme}
            title="Euclidean norm √(x²+y²+z²) of linear acceleration; includes gravity unless filtered out."
          />
        </div>
      </div>
    </div>
  );
}

export function initImuPanel(context: PanelExtensionContext): () => void {
  const root = createRoot(context.panelElement);
  root.render(<ImuPanel context={context} />);
  return () => {
    root.unmount();
  };
}
