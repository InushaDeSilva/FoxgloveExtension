import type { Topic } from "@foxglove/extension";

/** GPS data structure based on NavSatFix message */
export interface GpsData {
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

/** IMU data structure based on IMU message */
export interface ImuData {
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

/** Odometry data structure */
export interface OdometryData {
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

export interface MinimalDroneData {
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

export function makeInitialDroneData(): MinimalDroneData {
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

export const IMU_SCHEMA_NAMES = [
  "sensor_msgs/Imu",
  "sensor_msgs/msg/Imu",
  "sensor_msgs/IMU",
] as const;

/** Foxglove-style chrome (tracks app light/dark via renderState.colorScheme) */
export interface FoxTheme {
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

export const DARK: FoxTheme = {
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

export const LIGHT: FoxTheme = {
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

export function quaternionToEuler(quat: { x: number; y: number; z: number; w: number }) {
  const { x, y, z, w } = quat;
  const sinr_cosp = 2 * (w * x + y * z);
  const cosr_cosp = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinr_cosp, cosr_cosp) * (180 / Math.PI);
  const sinp = 2 * (w * y - z * x);
  const pitch =
    Math.abs(sinp) >= 1 ? Math.sign(sinp) * 90 : Math.asin(sinp) * (180 / Math.PI);
  const siny_cosp = 2 * (w * z + x * y);
  const cosy_cosp = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(siny_cosp, cosy_cosp) * (180 / Math.PI);
  return { roll, pitch, yaw };
}

function readVec3(
  obj: unknown,
  label: string,
): { ok: true; v: { x: number; y: number; z: number } } | { ok: false; error: string } {
  if (!obj || typeof obj !== "object") {
    return { ok: false, error: `Missing ${label} (expected sensor_msgs/Imu).` };
  }
  const o = obj as Record<string, unknown>;
  const x = Number(o.x);
  const y = Number(o.y);
  const z = Number(o.z);
  if (![x, y, z].every((n) => Number.isFinite(n))) {
    return { ok: false, error: `${label} must have finite numeric x, y, z.` };
  }
  return { ok: true, v: { x, y, z } };
}

/**
 * Validates and parses a message as sensor_msgs/Imu-style data for the ISL panels.
 * Wrong schema or bad quaternions return `ok: false` instead of throwing.
 */
export function parseImuMessagePayload(
  message: unknown,
):
  | {
      ok: true;
      roll: number;
      pitch: number;
      yaw: number;
      linear_acceleration: ImuData["linear_acceleration"];
      angular_velocity: ImuData["angular_velocity"];
    }
  | { ok: false; error: string } {
  if (message == undefined || typeof message !== "object") {
    return { ok: false, error: "Message is missing or not an object (not sensor_msgs/Imu)." };
  }
  const m = message as Record<string, unknown>;
  const orient = m.orientation;
  if (!orient || typeof orient !== "object") {
    return {
      ok: false,
      error:
        "No orientation field — this topic does not look like sensor_msgs/Imu. Pick an Imu topic in panel settings.",
    };
  }
  const qrec = orient as Record<string, unknown>;
  const quat = {
    x: Number(qrec.x),
    y: Number(qrec.y),
    z: Number(qrec.z),
    w: Number(qrec.w),
  };
  if (![quat.x, quat.y, quat.z, quat.w].every((n) => Number.isFinite(n))) {
    return { ok: false, error: "Orientation quaternion has invalid (non-finite) components." };
  }
  let roll: number;
  let pitch: number;
  let yaw: number;
  try {
    ({ roll, pitch, yaw } = quaternionToEuler(quat));
  } catch {
    return { ok: false, error: "Failed to convert orientation quaternion to Euler angles." };
  }
  if (![roll, pitch, yaw].every((n) => Number.isFinite(n))) {
    return { ok: false, error: "Computed roll/pitch/yaw is not finite." };
  }

  const la = readVec3(m.linear_acceleration, "linear_acceleration");
  if (!la.ok) {
    return la;
  }
  const av = readVec3(m.angular_velocity, "angular_velocity");
  if (!av.ok) {
    return av;
  }

  return {
    ok: true,
    roll,
    pitch,
    yaw,
    linear_acceleration: la.v,
    angular_velocity: av.v,
  };
}

/** Parse geometry_msgs/Pose orientation (or Imu.orientation) without throwing. */
export function parseOrientationOnly(
  orientation: unknown,
): { ok: true; roll: number; pitch: number; yaw: number } | { ok: false; error: string } {
  if (!orientation || typeof orientation !== "object") {
    return { ok: false, error: "Missing orientation." };
  }
  const qrec = orientation as Record<string, unknown>;
  const quat = {
    x: Number(qrec.x),
    y: Number(qrec.y),
    z: Number(qrec.z),
    w: Number(qrec.w),
  };
  if (![quat.x, quat.y, quat.z, quat.w].every((n) => Number.isFinite(n))) {
    return { ok: false, error: "Invalid orientation quaternion." };
  }
  try {
    const { roll, pitch, yaw } = quaternionToEuler(quat);
    if (![roll, pitch, yaw].every((n) => Number.isFinite(n))) {
      return { ok: false, error: "Computed orientation is not finite." };
    }
    return { ok: true, roll, pitch, yaw };
  } catch {
    return { ok: false, error: "Could not parse orientation." };
  }
}

export function pickDefaultImuTopic(topics: readonly Topic[]): string | undefined {
  const match = topics.find((t) =>
    IMU_SCHEMA_NAMES.some((schema) => t.schemaName === schema),
  );
  return match?.name;
}

export function buildImuTopicOptionLists(
  availableTopics: readonly Topic[],
  selectedImuTopic: string,
): { imuTopics: Topic[]; allImuTopicNames: string[] } {
  const imuTopics = availableTopics.filter((t) =>
    IMU_SCHEMA_NAMES.some((schema) => t.schemaName === schema),
  );
  const allImuTopicNames = Array.from(
    new Set([...imuTopics.map((t) => t.name), ...(selectedImuTopic ? [selectedImuTopic] : [])]),
  );
  return { imuTopics, allImuTopicNames };
}

/** Options for Foxglove panel settings `select` (IMU + other topics). */
export function buildImuTopicSelectOptions(
  availableTopics: readonly Topic[],
  allImuTopicNames: string[],
): Array<{ label: string; value: undefined | string }> {
  const opts: Array<{ label: string; value: undefined | string }> = [
    { label: "— None —", value: undefined },
  ];
  const seen = new Set<string | undefined>([undefined]);
  for (const name of allImuTopicNames) {
    if (!seen.has(name)) {
      seen.add(name);
      opts.push({ label: name, value: name });
    }
  }
  for (const t of availableTopics) {
    if (!seen.has(t.name)) {
      seen.add(t.name);
      opts.push({ label: `${t.name} (${t.schemaName})`, value: t.name });
    }
  }
  return opts;
}

/** Largest square that fits in the inner box (instruments). */
export function maxSquareInstrumentSize(innerWidth: number, innerHeight: number, max = 800): number {
  const side = Math.min(Math.max(0, innerWidth), Math.max(0, innerHeight));
  return Math.max(56, Math.min(side, max));
}

export interface PanelImuTopicState {
  selectedImuTopic?: string;
}
