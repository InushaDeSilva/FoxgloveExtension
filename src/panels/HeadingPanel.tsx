"use client";

import type { PanelExtensionContext } from "@foxglove/extension";
import { ReactElement, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";

import { Compass } from "../components/compass2";
import { PanelInfoTip } from "../components/panel-info-tip";
import { TopicIngestErrorBanner } from "../components/topic-ingest-error-banner";
import { maxSquareInstrumentSize } from "./telemetryShared";
import { useImuTopicPanelSettings } from "./useImuTopicPanelSettings";
import { useIslTelemetryPanel } from "./useIslTelemetryPanel";

function HeadingPanel({ context }: { context: PanelExtensionContext }): ReactElement {
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
    "sensor_msgs/Imu orientation sets yaw when messages arrive; otherwise /Odometry pose orientation.",
  );

  useEffect(() => {
    context.setDefaultPanelTitle("ISL Heading");
  }, [context]);

  const isCompact = containerWidth < 420;
  const outerPad = isCompact ? 8 : 12;
  const footerReserve = 44;

  const componentSize = useMemo(() => {
    const innerW = containerWidth - 2 * outerPad;
    const innerH = containerHeight - 2 * outerPad - footerReserve;
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
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: "4px",
    padding: isCompact ? "6px" : "10px",
    overflow: "hidden",
  };

  const plotFrame: React.CSSProperties = {
    position: "relative",
    width: componentSize,
    height: componentSize,
    flexShrink: 0,
  };

  const tipWrap: React.CSSProperties = {
    position: "absolute",
    top: 4,
    right: 4,
    zIndex: 2,
  };

  const degRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    marginTop: "10px",
    flexShrink: 0,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: `${Math.max(13, Math.round(baseFont * 1.08))}px`,
    fontWeight: 600,
    color: theme.text,
  };

  return (
    <div ref={containerRef} style={containerStyle}>
      <TopicIngestErrorBanner message={imuIngestError ?? ""} topic={selectedImuTopic} theme={theme} />
      <div style={cardStyle}>
        <div style={plotFrame}>
          <div style={tipWrap}>
            <PanelInfoTip
              theme={theme}
              title="Heading (yaw): from selected IMU orientation when messages arrive; otherwise from /Odometry pose orientation."
            />
          </div>
          <Compass heading={droneData.heading} darkMode={theme.isDark} size={componentSize} />
        </div>
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
