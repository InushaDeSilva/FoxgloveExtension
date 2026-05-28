"use client";

import type { PanelExtensionContext } from "@foxglove/extension";
import { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { AttitudeIndicator } from "../components/attitude-indicator";
import { PanelInfoTip } from "../components/panel-info-tip";
import { TopicIngestErrorBanner } from "../components/topic-ingest-error-banner";
import {
  applyOrientationAdjustments,
  maxSquareInstrumentSize,
  type HorizonPanelState,
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

  const saved = context.initialState as HorizonPanelState | undefined;
  const [flipRoll, setFlipRoll] = useState(saved?.flipRoll ?? false);
  const [flipPitch, setFlipPitch] = useState(saved?.flipPitch ?? false);
  const [rollBiasDeg, setRollBiasDeg] = useState<QuadrantBiasDeg>(
    isQuadrant(saved?.rollBiasDeg) ? saved.rollBiasDeg : 0,
  );
  const [pitchBiasDeg, setPitchBiasDeg] = useState<QuadrantBiasDeg>(
    isQuadrant(saved?.pitchBiasDeg) ? saved.pitchBiasDeg : 0,
  );

  useEffect(() => {
    context.saveState({
      selectedImuTopic,
      flipRoll,
      flipPitch,
      rollBiasDeg,
      pitchBiasDeg,
    } satisfies HorizonPanelState);
  }, [context, selectedImuTopic, flipRoll, flipPitch, rollBiasDeg, pitchBiasDeg]);

  const handleDebugUpdate = useCallback(
    (action: { action: string; payload: { path: readonly string[]; value?: unknown } }) => {
      const field = action.payload.path[1];
      const val = action.payload.value;
      switch (field) {
        case "flipRoll":
          setFlipRoll(Boolean(val));
          break;
        case "flipPitch":
          setFlipPitch(Boolean(val));
          break;
        case "rollBiasDeg":
          if (isQuadrant(val)) setRollBiasDeg(val);
          break;
        case "pitchBiasDeg":
          if (isQuadrant(val)) setPitchBiasDeg(val);
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
            flipRoll: { label: "Flip roll", input: "boolean" as const, value: flipRoll },
            flipPitch: { label: "Flip pitch", input: "boolean" as const, value: flipPitch },
            rollBiasDeg: {
              label: "Roll bias",
              input: "select" as const,
              value: rollBiasDeg,
              options: [...QUADRANT_OPTIONS],
            },
            pitchBiasDeg: {
              label: "Pitch bias",
              input: "select" as const,
              value: pitchBiasDeg,
              options: [...QUADRANT_OPTIONS],
            },
          },
        },
      },
      onExtraFieldUpdate: handleDebugUpdate,
    }),
    [flipRoll, flipPitch, rollBiasDeg, pitchBiasDeg, handleDebugUpdate],
  );

  useImuTopicPanelSettings(
    context,
    availableTopics,
    allImuTopicNames,
    selectedImuTopic,
    setSelectedImuTopic,
    "sensor_msgs/Imu used for roll/pitch when messages arrive. Choose in this list (gear icon → Panel).",
    extraSettings,
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

  const adjusted = applyOrientationAdjustments(droneData.roll, droneData.pitch, droneData.heading, {
    flipRoll,
    flipPitch,
    rollBiasDeg,
    pitchBiasDeg,
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
              roll={adjusted.roll}
              pitch={adjusted.pitch}
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
