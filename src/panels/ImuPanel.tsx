"use client";

import type { PanelExtensionContext } from "@foxglove/extension";
import { ReactElement, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";

import { IMUDisplay } from "../components/imu-display";
import { PanelInfoTip } from "../components/panel-info-tip";
import { ImuTopicCollapsibleRow } from "./ImuTopicCollapsibleRow";
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
    allImuTopicNames,
    handleImuTopicChange,
    baseFont,
  } = useIslTelemetryPanel(context);

  useEffect(() => {
    context.setDefaultPanelTitle("ISL IMU");
  }, [context]);

  const isCompact = containerWidth < 420;

  const plotSize = useMemo(() => {
    return Math.max(
      120,
      Math.min(Math.round(containerWidth - 20), Math.round(containerHeight * 0.38), 320),
    );
  }, [containerWidth, containerHeight]);

  const accelMag = Math.sqrt(
    droneData.imuAcceleration.x ** 2 +
      droneData.imuAcceleration.y ** 2 +
      droneData.imuAcceleration.z ** 2,
  );

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

  const imuTips = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
      <PanelInfoTip
        theme={theme}
        title="Linear acceleration (m/s²) from sensor_msgs/Imu, including gravity (~9.81 m/s² on Z when level)."
      />
      <PanelInfoTip
        theme={theme}
        title="Angular velocity (rad/s) from sensor_msgs/Imu gyro triad."
      />
      <PanelInfoTip
        theme={theme}
        title="XY plot: X right, Y up; clamped for display — not a calibrated inclinometer."
      />
    </span>
  );

  const magRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    marginTop: "6px",
    fontSize: `${Math.max(10, Math.round(baseFont * 0.88))}px`,
    color: theme.textMuted,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
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
        headerExtra={imuTips}
      />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: "4px",
          padding: isCompact ? "8px" : "10px",
        }}
      >
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
        <div style={magRow}>
          <span style={{ color: theme.textDim, fontWeight: 600 }}>‖a‖</span>
          <span style={{ color: theme.text, fontWeight: 600 }}>{accelMag.toFixed(2)}</span>
          <span style={{ color: theme.textDim }}>m/s²</span>
          <PanelInfoTip
            theme={theme}
            title="Euclidean norm √(x²+y²+z²) of linear acceleration; includes gravity unless removed by a filter."
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
