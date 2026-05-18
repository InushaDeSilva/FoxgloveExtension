import { PanelExtensionContext, Topic } from "@foxglove/extension";
import { ReactElement, useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";

import { Compass } from "./components/compass2";
import { IMUDisplay } from "./components/imu-display";
import { AttitudeIndicator } from "./components/attitude-indicator";
import "./styles.css";

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
    status?: number; // STATUS_GBAS_FIX=2
    service?: number; // SERVICE_GPS=1
  };
}

// IMU data structure based on IMU message
interface ImuData {
  orientation: {
    x: number;
    y: number;
    z: number;
    w: number;
  };
  orientation_covariance?: number[];
  angular_velocity: {
    x: number;
    y: number;
    z: number;
  };
  angular_velocity_covariance?: number[];
  linear_acceleration: {
    x: number;
    y: number;
    z: number;
  };
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
      position?: {
        x: number;
        y: number;
        z: number;
      };
      orientation?: {
        x: number;
        y: number;
        z: number;
        w: number;
      };
    };
  };
  header?: {
    seq?: number;
    stamp?: { sec: number; nsec: number };
    frame_id?: string;
  };
}

// Sample data structure for drone telemetry
interface MinimalDroneData {
  altitude: number; // meters
  heading: number; // degrees
  roll: number; // degrees
  pitch: number; // degrees
  imuAcceleration: {
    x: number; // m/s²
    y: number; // m/s²
    z: number; // m/s²
  };
  imuGyro: {
    x: number; // deg/s
    y: number; // deg/s
    z: number; // deg/s
  };
  imuMag: {
    x: number; // μT
    y: number; // μT
    z: number; // μT
  };
  latitude?: number;
  longitude?: number;
}

// Default initial data
const initialData: MinimalDroneData = {
  altitude: 0,
  heading: 0,
  roll: 0,
  pitch: 0,
  imuAcceleration: { x: 0, y: 0, z: 9.8 },
  imuGyro: { x: 0, y: 0, z: 0 },
  imuMag: { x: 0, y: 0, z: 0 },
};

// IMU-compatible schema names
const IMU_SCHEMA_NAMES = [
  "sensor_msgs/Imu",
  "sensor_msgs/msg/Imu",
  "sensor_msgs/IMU",
];

// Helper function to convert quaternion to Euler angles
function quaternionToEuler(quat: { x: number; y: number; z: number; w: number }): {
  roll: number;
  pitch: number;
  yaw: number;
} {
  const { x, y, z, w } = quat;

  // Convert quaternion to Euler angles (roll, pitch, yaw)
  // Roll (x-axis rotation)
  const sinr_cosp = 2 * (w * x + y * z);
  const cosr_cosp = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinr_cosp, cosr_cosp) * (180 / Math.PI);

  // Pitch (y-axis rotation)
  const sinp = 2 * (w * y - z * x);
  const pitch =
    Math.abs(sinp) >= 1
      ? Math.sign(sinp) * 90 // Use 90 degrees if out of range
      : Math.asin(sinp) * (180 / Math.PI);

  // Yaw (z-axis rotation)
  const siny_cosp = 2 * (w * z + x * y);
  const cosy_cosp = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(siny_cosp, cosy_cosp) * (180 / Math.PI);

  return { roll, pitch, yaw };
}

// Persisted panel state
interface PanelState {
  selectedImuTopic?: string;
}

function MinimalDashboardPanel({ context }: { context: PanelExtensionContext }): ReactElement {
  const [droneData, setDroneData] = useState<MinimalDroneData>(initialData);
  const [darkMode] = useState(true);
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

  // Available topics from the data source
  const [availableTopics, setAvailableTopics] = useState<readonly Topic[]>([]);

  // Selected IMU topic — restored from saved panel state
  const [selectedImuTopic, setSelectedImuTopic] = useState<string>(
    () => (context.initialState as PanelState | undefined)?.selectedImuTopic ?? "",
  );

  // Container size from ResizeObserver (replaces window.innerWidth)
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(400);
  const [containerHeight, setContainerHeight] = useState(400);

  // --- ResizeObserver for panel-aware sizing ---
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerWidth(width);
        setContainerHeight(height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // --- Persist selected IMU topic ---
  useEffect(() => {
    context.saveState({ selectedImuTopic } satisfies PanelState);
  }, [context, selectedImuTopic]);

  // --- Dynamic subscriptions based on selected IMU topic ---
  useEffect(() => {
    const subs: { topic: string }[] = [
      { topic: "/fix" }, // GPS data
      { topic: "/Odometry" }, // Odometry data
    ];
    if (selectedImuTopic) {
      subs.push({ topic: selectedImuTopic });
    }
    context.subscribe(subs);
  }, [context, selectedImuTopic]);

  // --- Render handler & topic watching ---
  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);

      // Capture available topics
      if (renderState.topics) {
        setAvailableTopics(renderState.topics);
      }

      // Process messages in the current frame
      if (renderState.currentFrame) {
        const newDroneData = { ...droneData };
        let dataUpdated = false;

        // Process GPS data from NavSatFix messages
        const gpsMessages = renderState.currentFrame.filter((msg) => msg.topic === "/fix");

        if (gpsMessages.length > 0) {
          const gpsMessage = gpsMessages[gpsMessages.length - 1];
          const gpsData = gpsMessage?.message as unknown as GpsData;

          if (gpsData) {
            newDroneData.latitude = gpsData.latitude;
            newDroneData.longitude = gpsData.longitude;
            newDroneData.altitude = gpsData.altitude;
            dataUpdated = true;
          }
        }

        // Process IMU data from the user-selected topic
        if (selectedImuTopic) {
          const imuMessages = renderState.currentFrame.filter(
            (msg) => msg.topic === selectedImuTopic,
          );

          if (imuMessages.length > 0) {
            const imuMessage = imuMessages[imuMessages.length - 1];
            const imuData = imuMessage?.message as unknown as ImuData;

            if (imuData) {
              // Convert quaternion to Euler angles
              const { roll, pitch, yaw } = quaternionToEuler(imuData.orientation);

              newDroneData.roll = roll;
              newDroneData.pitch = pitch;
              newDroneData.heading = (yaw + 360) % 360; // Convert to 0-360 range

              // Update acceleration and angular velocity
              newDroneData.imuAcceleration = imuData.linear_acceleration;
              newDroneData.imuGyro = imuData.angular_velocity;

              dataUpdated = true;
            }
          }
        }

        // Process Odometry data
        const odometryMessages = renderState.currentFrame.filter((msg) =>
          msg.topic.includes("/Odometry"),
        );

        if (odometryMessages.length > 0) {
          const odometryMessage = odometryMessages[odometryMessages.length - 1];
          const odometryData = odometryMessage?.message as unknown as OdometryData;

          if (odometryData?.pose?.pose) {
            // Use odometry data as a fallback for missing IMU data
            if (odometryData.pose.pose.orientation && !dataUpdated) {
              const { roll, pitch, yaw } = quaternionToEuler(odometryData.pose.pose.orientation);

              newDroneData.roll = roll;
              newDroneData.pitch = pitch;
              newDroneData.heading = (yaw + 360) % 360;

              dataUpdated = true;
            }
          }
        }

        // Update state only if data changed
        if (dataUpdated) {
          setDroneData(newDroneData);
        }
      }
    };

    // Watch for topic updates and messages
    context.watch("topics");
    context.watch("currentFrame");
  }, [context, droneData, selectedImuTopic]);

  // Call the done callback after render
  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  // --- Filter topics that look like IMU topics ---
  const imuTopics = availableTopics.filter((t) =>
    IMU_SCHEMA_NAMES.some((schema) => t.schemaName === schema),
  );
  // Also include any topic the user might have selected that's not in the filtered list
  // (covers edge cases where schema name doesn't match our list)
  const allImuTopicNames = Array.from(
    new Set([...imuTopics.map((t) => t.name), ...(selectedImuTopic ? [selectedImuTopic] : [])]),
  );

  const handleImuTopicChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedImuTopic(e.target.value);
    },
    [],
  );

  // --- Responsive layout calculations based on container size ---
  const isCompact = containerWidth < 480;
  const isMedium = containerWidth >= 480 && containerWidth < 800;
  const isWide = containerWidth >= 800;

  const calculateComponentSize = () => {
    let baseSize: number;
    if (isWide) {
      baseSize = Math.min((containerWidth - 80) / 3.5, (containerHeight - 140) * 0.55);
    } else if (isMedium) {
      baseSize = Math.min((containerWidth - 60) / 2.5, (containerHeight - 140) * 0.45);
    } else {
      baseSize = Math.min(containerWidth * 0.55, (containerHeight - 160) * 0.35);
    }
    // Clamp between 80px and 260px
    return Math.max(80, Math.min(baseSize, 260));
  };

  const componentSize = calculateComponentSize();

  // --- Styles ---
  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    overflow: "auto",
    backgroundColor: "#111827",
    color: "white",
    padding: isCompact ? "0.375rem" : "0.75rem",
    boxSizing: "border-box",
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  };

  const topBarStyle: React.CSSProperties = {
    display: "flex",
    alignItems: isCompact ? "flex-start" : "center",
    flexDirection: isCompact ? "column" : "row",
    gap: "0.5rem",
    marginBottom: isCompact ? "0.5rem" : "0.75rem",
    padding: "0.375rem 0.5rem",
    backgroundColor: "#1f2937",
    borderRadius: "0.375rem",
    flexShrink: 0,
  };

  const selectStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: "0.3rem 0.5rem",
    backgroundColor: "#374151",
    color: "white",
    border: "1px solid #4b5563",
    borderRadius: "0.25rem",
    fontSize: isCompact ? "0.75rem" : "0.8125rem",
    fontFamily: "monospace",
    cursor: "pointer",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: isCompact ? "0.6875rem" : "0.75rem",
    color: "#9ca3af",
    whiteSpace: "nowrap",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns:
      isWide ? "repeat(3, 1fr)" : isMedium ? "repeat(2, 1fr)" : "1fr",
    gap: isWide ? "1rem" : isMedium ? "0.75rem" : "0.5rem",
    flex: 1,
    minHeight: 0,
  };

  const cardStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f2937",
    borderRadius: "0.5rem",
    padding: isCompact ? "0.5rem" : "0.75rem",
    minHeight: 0,
    overflow: "hidden",
  };

  const imuCardStyle: React.CSSProperties = {
    ...cardStyle,
    gridColumn: isMedium ? "span 2" : "auto",
  };

  const cardHeaderStyle: React.CSSProperties = {
    fontSize: isCompact ? "0.8125rem" : "0.9375rem",
    fontWeight: 600,
    marginBottom: "0.25rem",
    color: "#e5e7eb",
  };

  const valueContainerStyle: React.CSSProperties = {
    marginTop: "0.25rem",
    textAlign: "center",
    fontSize: "0.8125rem",
  };

  const valueStyle: React.CSSProperties = {
    fontSize: isCompact ? "0.9375rem" : "1.125rem",
    fontFamily: "monospace",
    color: "#f9fafb",
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
          {/* Show all available topics in a separate group for manual override */}
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
          <h2 style={cardHeaderStyle}>Horizon</h2>
          <AttitudeIndicator
            roll={droneData.roll}
            pitch={droneData.pitch}
            darkMode={darkMode}
            size={componentSize}
          />
          <div style={valueContainerStyle}>
            <span style={valueStyle}>{droneData.altitude.toFixed(1)} m</span>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={cardHeaderStyle}>Compass</h2>
          <Compass heading={droneData.heading} darkMode={darkMode} size={componentSize} />
          <div style={valueContainerStyle}>
            <span style={valueStyle}>{droneData.heading.toFixed(1)}°</span>
          </div>
        </div>

        <div style={imuCardStyle}>
          <h2 style={cardHeaderStyle}>
            IMU Data
            {selectedImuTopic ? (
              <span style={{ fontSize: "0.6875rem", color: "#6b7280", marginLeft: "0.5rem", fontWeight: 400 }}>
                {selectedImuTopic}
              </span>
            ) : (
              <span style={{ fontSize: "0.6875rem", color: "#ef4444", marginLeft: "0.5rem", fontWeight: 400 }}>
                No topic selected
              </span>
            )}
          </h2>
          <IMUDisplay
            acceleration={droneData.imuAcceleration}
            gyro={droneData.imuGyro}
            mag={droneData.imuMag}
            darkMode={darkMode}
            size={componentSize}
          />
          <div style={valueContainerStyle}>
            <span style={{ fontFamily: "monospace" }}>
              Accel:{" "}
              {Math.sqrt(
                Math.pow(droneData.imuAcceleration.x, 2) +
                  Math.pow(droneData.imuAcceleration.y, 2) +
                  Math.pow(droneData.imuAcceleration.z, 2),
              ).toFixed(2)}{" "}
              m/s²
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

  // Return a function to run when the panel is removed
  return () => {
    root.unmount();
  };
}
