"use client";

import type { PanelExtensionContext } from "@foxglove/extension";
import { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { Compass } from "../components/compass2";
import { PanelInfoTip } from "../components/panel-info-tip";
import { TopicIngestErrorBanner } from "../components/topic-ingest-error-banner";
import {
  applyOrientationAdjustments,
  maxSquareInstrumentSize,
  type HeadingPanelState,
  type QuadrantBiasDeg,
} from "./telemetryShared";
import { useImuTopicPanelSettings } from "./useImuTopicPanelSettings";
import { useIslTelemetryPanel } from "./useIslTelemetryPanel";

const QUADRANT_OPTIONS = [
  { label: "0°", value: 0 },
  { label: "90°", value: 90 },
  { label: "180°", value: 180 },
  { label: "270°", value: 270 },
] as const;

function isQuadrant(v: unknown): v is QuadrantBiasDeg {
  return v === 0 || v === 90 || v === 180 || v === 270;
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
    setSelectedImuTopic,
    allImuTopicNames,
    baseFont,
    imuIngestError,
  } = useIslTelemetryPanel(context);

  const saved = context.initialState as HeadingPanelState | undefined;
  const [flipYaw, setFlipYaw] = useState(saved?.flipYaw ?? false);
  const [yawBiasDeg, setYawBiasDeg] = useState<QuadrantBiasDeg>(
    isQuadrant(saved?.yawBiasDeg) ? saved.yawBiasDeg : 0,
  );

  useEffect(() => {
    context.saveState({
      selectedImuTopic,
      flipYaw,
      yawBiasDeg,
    } satisfies HeadingPanelState);
  }, [context, selectedImuTopic, flipYaw, yawBiasDeg]);

  const handleDebugUpdate = useCallback(
    (action: { action: string; payload: { path: readonly string[]; value?: unknown } }) => {
      const field = action.payload.path[1];
      const val = action.payload.value;
      switch (field) {
        case "flipYaw":
          setFlipYaw(Boolean(val));
          break;
        case "yawBiasDeg":
          if (isQuadrant(val)) setYawBiasDeg(val);
          break;
      }
    },
    [],
  );

  const extraSettings = useMemo(
    () => ({
      extraNodes: {
        debug: {
          label: "Display / debug",
          fields: {
            flipYaw: { label: "Flip yaw", input: "boolean" as const, value: flipYaw },
            yawBiasDeg: {
              label: "Yaw bias",
              input: "select" as const,
              value: yawBiasDeg,
              options: [...QUADRANT_OPTIONS],
            },
          },
        },
      },
      onExtraFieldUpdate: handleDebugUpdate,
    }),
    [flipYaw, yawBiasDeg, handleDebugUpdate],
  );

  useImuTopicPanelSettings(
    context,
    availableTopics,
    allImuTopicNames,
    selectedImuTopic,
    setSelectedImuTopic,
    "sensor_msgs/Imu orientation sets yaw when messages arrive; otherwise /Odometry pose orientation.",
    extraSettings,
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

  const adjusted = applyOrientationAdjustments(droneData.roll, droneData.pitch, droneData.heading, {
    flipYaw,
    yawBiasDeg,
  });

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
          <Compass heading={adjusted.yaw} darkMode={theme.isDark} size={componentSize} />
        </div>
        <div style={degRow}>
          <span>{adjusted.yaw.toFixed(1)}</span>
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
