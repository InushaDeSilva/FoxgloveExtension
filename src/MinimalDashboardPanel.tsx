import { PanelExtensionContext, Topic } from "@foxglove/extension";
import { ReactElement, useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";

import { Compass } from "./components/compass2";
import { IMUDisplay } from "./components/imu-display";
import { AttitudeIndicator } from "./components/attitude-indicator";

// GPS data structure based on NavSatFix message
interface GpsData {
  latitude: number;
  longitude: number;
  altitude: number;
  position_covariance?: number[];
  header?: {
    seq?: number;
    stamp?: { sec: number; nsec: number };
    frame_id?: string;
  };
  status?: {
    status?: number;
    service?: number;
  };
}

// IMU data structure based on IMU message
interface ImuData {
  orientation: { x: number; y: number; z: number; w: number };
  orientation_covariance?: number[];
  angular_velocity: { x: number; y: number; z: number };
  angular_velocity_covariance?: number[];
  linear_acceleration: { x: number; y: number; z: number };
  linear_acceleration_covariance?: number[];
  header?: {
    seq?: number;
    stamp?: { sec: number; nsec: number };
    frame_id?: string;
  };
}

// Odometry data structure
interface OdometryData {
  pose?: {
    pose?: {
      position?: { x: number; y: number; z: number };
      orientation?: { x: number; y: number; z: number; w: number };
    };
  };
  header?: {
    seq?: number;
    stamp?: { sec: number; nsec: number };
    frame_id?: string;
  };
}

interface MinimalDroneData {
  altitude: number;
  gnssAltitudeValid: boolean;
  heading: number;
  roll: number;
  pitch: number;
  imuAcceleration: { x: number; y: number; z: number };
  imuGyro: { x: number; y: number; z: number };
  imuMag: { x: number; y: number; z: number };
  latitude?: number;
  longitude?: number;
}

function makeInitialDroneData(): MinimalDroneData {
  return {
    altitude: 0,
    gnssAltitudeValid: false,
    heading: 0,
    roll: 0,
    pitch: 0,
    imuAcceleration: { x: 0, y: 0, z: 9.8 },
    imuGyro: { x: 0, y: 0, z: 0 },
    imuMag: { x: 0, y: 0, z: 0 },
  };
}

const IMU_SCHEMA_NAMES = [
  "sensor_msgs/Imu",
  "sensor_msgs/msg/Imu",
  "sensor_msgs/IMU",
];

// Foxglove-style chrome (tracks app light/dark via renderState.colorScheme)
interface FoxTheme {
  isDark: boolean;
  bg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  textDim: string;
  inputBg: string;
  inputBorder: string;
  accentX: string;
  accentY: string;
  accentZ: string;
  danger: string;
}

const DARK: FoxTheme = {
  isDark: true,
  bg: "#111111",
  surface: "#1a1a1a",
  border: "#303030",
  text: "#e4e4e4",
  textMuted: "#a3a3a3",
  textDim: "#737373",
  inputBg: "#222222",
  inputBorder: "#383838",
  accentX: "#f87171",
  accentY: "#4ade80",
  accentZ: "#60a5fa",
  danger: "#f87171",
};

const LIGHT: FoxTheme = {
  isDark: false,
  bg: "#f3f3f3",
  surface: "#ffffff",
  border: "#d4d4d4",
  text: "#171717",
  textMuted: "#525252",
  textDim: "#737373",
  inputBg: "#fafafa",
  inputBorder: "#c8c8c8",
  accentX: "#dc2626",
  accentY: "#16a34a",
  accentZ: "#2563eb",
  danger: "#dc2626",
};

function quaternionToEuler(quat: { x: number; y: number; z: number; w: number }) {
  const { x, y, z, w } = quat;
  const sinr_cosp = 2 * (w * x + y * z);
  const cosr_cosp = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinr_cosp, cosr_cosp) * (180 / Math.PI);
  const sinp = 2 * (w * y - z * x);
  const pitch =
    Math.abs(sinp) >= 1
      ? Math.sign(sinp) * 90
      : Math.asin(sinp) * (180 / Math.PI);
  const siny_cosp = 2 * (w * z + x * y);
  const cosy_cosp = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(siny_cosp, cosy_cosp) * (180 / Math.PI);
  return { roll, pitch, yaw };
}

interface PanelState {
  selectedImuTopic?: string;
}

function MinimalDashboardPanel({ context }: { context: PanelExtensionContext }): ReactElement {
  const [droneData, setDroneData] = useState<MinimalDroneData>(() => makeInitialDroneData());
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();
  const [availableTopics, setAvailableTopics] = useState<readonly Topic[]>([]);
  const [colorScheme, setColorScheme] = useState<"dark" | "light">("dark");
  const [selectedImuTopic, setSelectedImuTopic] = useState<string>(
    () => (context.initialState as PanelState | undefined)?.selectedImuTopic ?? "",
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(400);
  const [containerHeight, setContainerHeight] = useState(400);

  const theme = colorScheme === "dark" ? DARK : LIGHT;

  // ResizeObserver for panel-aware sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Default tab title in Foxglove
  useEffect(() => {
    context.setDefaultPanelTitle("ISL Lighthouse");
  }, [context]);

  // Persist selected IMU topic
  useEffect(() => {
    context.saveState({ selectedImuTopic } satisfies PanelState);
  }, [context, selectedImuTopic]);

  // Dynamic subscriptions
  useEffect(() => {
    const subs: { topic: string }[] = [
      { topic: "/fix" },
      { topic: "/Odometry" },
    ];
    if (selectedImuTopic) {
      subs.push({ topic: selectedImuTopic });
    }
    context.subscribe(subs);
  }, [context, selectedImuTopic]);

  // Render handler
  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);

      if (renderState.colorScheme != undefined) {
        setColorScheme(renderState.colorScheme);
      }
      if (renderState.topics) {
        setAvailableTopics(renderState.topics);
      }

      if (renderState.didSeek) {
        setDroneData(makeInitialDroneData());
      }

      if (renderState.currentFrame) {
        setDroneData((prev) => {
          const next = { ...prev };
          let dataUpdated = false;

          const gpsMessages = renderState.currentFrame!.filter((msg) => msg.topic === "/fix");
          if (gpsMessages.length > 0) {
            const gpsData = gpsMessages[gpsMessages.length - 1]?.message as unknown as GpsData;
            if (gpsData) {
              next.latitude = gpsData.latitude;
              next.longitude = gpsData.longitude;
              next.altitude = gpsData.altitude;
              next.gnssAltitudeValid = true;
              dataUpdated = true;
            }
          }

          let imuUpdatedThisFrame = false;
          if (selectedImuTopic) {
            const imuMessages = renderState.currentFrame!.filter(
              (msg) => msg.topic === selectedImuTopic,
            );
            if (imuMessages.length > 0) {
              const imuData = imuMessages[imuMessages.length - 1]?.message as unknown as ImuData;
              if (imuData) {
                const { roll, pitch, yaw } = quaternionToEuler(imuData.orientation);
                next.roll = roll;
                next.pitch = pitch;
                next.heading = (yaw + 360) % 360;
                next.imuAcceleration = { ...imuData.linear_acceleration };
                next.imuGyro = { ...imuData.angular_velocity };
                dataUpdated = true;
                imuUpdatedThisFrame = true;
              }
            }
          }

          const odometryMessages = renderState.currentFrame!.filter((msg) =>
            msg.topic.includes("/Odometry"),
          );
          if (odometryMessages.length > 0 && !imuUpdatedThisFrame) {
            const odometryData = odometryMessages[odometryMessages.length - 1]?.message as unknown as OdometryData;
            if (odometryData?.pose?.pose?.orientation) {
              const { roll, pitch, yaw } = quaternionToEuler(odometryData.pose.pose.orientation);
              next.roll = roll;
              next.pitch = pitch;
              next.heading = (yaw + 360) % 360;
              dataUpdated = true;
            }
          }

          return dataUpdated ? next : prev;
        });
      }
    };

    context.watch("topics");
    context.watch("currentFrame");
    context.watch("colorScheme");
    context.watch("didSeek");
  }, [context, selectedImuTopic]);

  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  // Filter IMU topics
  const imuTopics = availableTopics.filter((t) =>
    IMU_SCHEMA_NAMES.some((schema) => t.schemaName === schema),
  );
  const allImuTopicNames = Array.from(
    new Set([...imuTopics.map((t) => t.name), ...(selectedImuTopic ? [selectedImuTopic] : [])]),
  );

  const handleImuTopicChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedImuTopic(e.target.value);
    },
    [],
  );

  // Responsive layout: two instruments on top when space allows; IMU spans full width below
  const isCompact = containerWidth < 480;
  const isMedium = containerWidth >= 480 && containerWidth < 800;
  const isWide = containerWidth >= 800;

  const shortSide = Math.min(containerWidth, containerHeight);
  const baseFont = Math.round(Math.max(11, Math.min(24, shortSide * 0.038 + 4)));

  const calculateComponentSize = () => {
    let baseSize: number;
    if (isWide) {
      baseSize = Math.min((containerWidth - 48) / 2.2, (containerHeight - 100) * 0.42);
    } else if (isMedium) {
      baseSize = Math.min((containerWidth - 40) / 2.2, (containerHeight - 100) * 0.4);
    } else {
      baseSize = Math.min(containerWidth * 0.72, (containerHeight - 160) * 0.38);
    }
    return Math.max(88, Math.min(baseSize, 300));
  };

  const componentSize = calculateComponentSize();
  const imuBlockSize = Math.min(280, Math.max(componentSize, Math.min(containerWidth * 0.35, shortSide * 0.5)));

  // Acceleration magnitude
  const accelMag = Math.sqrt(
    Math.pow(droneData.imuAcceleration.x, 2) +
    Math.pow(droneData.imuAcceleration.y, 2) +
    Math.pow(droneData.imuAcceleration.z, 2),
  );

  // --- Styles (Foxglove-aware) ---
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
  };

  const topBarStyle: React.CSSProperties = {
    display: "flex",
    alignItems: isCompact ? "stretch" : "center",
    flexDirection: isCompact ? "column" : "row",
    gap: "6px",
    marginBottom: isCompact ? "6px" : "8px",
    padding: "5px 8px",
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: "4px",
    flexShrink: 0,
  };

  const selectStyle: React.CSSProperties = {
    flex: 1,
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
  };

  const labelStyle: React.CSSProperties = {
    fontSize: `${Math.max(10, baseFont - 2)}px`,
    color: theme.textMuted,
    whiteSpace: "nowrap",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isCompact ? "1fr" : "repeat(2, 1fr)",
    gap: isWide ? "10px" : isMedium ? "8px" : "6px",
  };

  const cardStyle: React.CSSProperties = {
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

  const imuCardStyle: React.CSSProperties = {
    ...cardStyle,
    gridColumn: "1 / -1",
    alignItems: "stretch",
  };

  const cardHeaderStyle: React.CSSProperties = {
    fontSize: `${Math.round(baseFont * 1.05)}px`,
    fontWeight: 600,
    marginBottom: "6px",
    color: theme.text,
    alignSelf: "center",
    textAlign: "center" as const,
  };

  const valueColumnStyle: React.CSSProperties = {
    marginTop: "6px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
    width: "100%",
  };

  const valueRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "center",
    gap: "6px",
    flexWrap: "wrap",
  };

  const valueFootnoteStyle: React.CSSProperties = {
    fontSize: `${Math.max(9, Math.round(baseFont * 0.72))}px`,
    color: theme.textDim,
    fontWeight: 400,
    lineHeight: 1.35,
    maxWidth: "22rem",
    padding: "0 4px",
  };

  const valueLabelStyle: React.CSSProperties = {
    fontSize: `${Math.max(9, baseFont - 3)}px`,
    color: theme.textDim,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  const valueNumberStyle: React.CSSProperties = {
    fontSize: `${Math.max(13, Math.round(baseFont * 1.15))}px`,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontWeight: 600,
    color: theme.text,
  };

  const valueUnitStyle: React.CSSProperties = {
    fontSize: `${Math.max(9, baseFont - 3)}px`,
    color: theme.textDim,
    fontWeight: 400,
  };

  const topicHintStyle: React.CSSProperties = {
    fontSize: `${Math.max(9, baseFont - 3)}px`,
    marginLeft: "6px",
    fontWeight: 400,
  };

  return (
    <div ref={containerRef} style={containerStyle}>
      {/* Topic picker bar */}
      <div style={topBarStyle}>
        <span style={labelStyle}>IMU Topic</span>
        <select
          style={selectStyle}
          value={selectedImuTopic}
          onChange={handleImuTopicChange}
        >
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

      {/* Main instrument grid */}
      <div style={gridStyle}>
        <div style={cardStyle}>
          <h2 style={cardHeaderStyle}>Attitude</h2>
          <AttitudeIndicator
            roll={droneData.roll}
            pitch={droneData.pitch}
            darkMode={theme.isDark}
            size={componentSize}
          />
          <div style={valueColumnStyle}>
            <div style={valueRowStyle}>
              <span style={valueLabelStyle}>GNSS altitude</span>
              <span style={valueNumberStyle}>
                {droneData.gnssAltitudeValid ? droneData.altitude.toFixed(1) : "—"}
              </span>
              <span style={valueUnitStyle}>m</span>
            </div>
            <span style={valueFootnoteStyle}>
              Ellipsoidal height from <code style={{ color: theme.textMuted }}>/fix</code>{" "}
              (sensor_msgs/NavSatFix). Not barometric AGL.
            </span>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={cardHeaderStyle}>Heading</h2>
          <Compass heading={droneData.heading} darkMode={theme.isDark} size={componentSize} />
          <div style={valueColumnStyle}>
            <div style={valueRowStyle}>
              <span style={valueLabelStyle}>Heading (yaw)</span>
              <span style={valueNumberStyle}>{droneData.heading.toFixed(1)}</span>
              <span style={valueUnitStyle}>°</span>
            </div>
            <span style={valueFootnoteStyle}>From IMU orientation if an IMU topic is selected; otherwise from odometry pose.</span>
          </div>
        </div>

        <div style={imuCardStyle}>
          <h2 style={cardHeaderStyle}>
            IMU Data
            {selectedImuTopic ? (
              <span style={{ ...topicHintStyle, color: theme.textDim }}>
                {selectedImuTopic}
              </span>
            ) : (
              <span style={{ ...topicHintStyle, color: theme.danger }}>No topic selected</span>
            )}
          </h2>
          <IMUDisplay
            acceleration={droneData.imuAcceleration}
            gyro={droneData.imuGyro}
            fontPx={baseFont}
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
            size={imuBlockSize}
          />
          <div style={valueColumnStyle}>
            <div style={valueRowStyle}>
              <span style={valueLabelStyle}>‖a‖ magnitude</span>
              <span style={valueNumberStyle}>{accelMag.toFixed(2)}</span>
              <span style={valueUnitStyle}>m/s²</span>
            </div>
            <span style={valueFootnoteStyle}>
              Euclidean norm of linear acceleration: √(x²+y²+z²). Includes gravity (~9.81 m/s² on
              Z when level); not specific force without a gravity model.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function initMinimalDashboardPanel(context: PanelExtensionContext): () => void {
  const root = createRoot(context.panelElement);
  root.render(<MinimalDashboardPanel context={context} />);
  return () => {
    root.unmount();
  };
}
