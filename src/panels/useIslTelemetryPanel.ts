import type { PanelExtensionContext, Topic } from "@foxglove/extension";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  buildImuTopicOptionLists,
  DARK,
  LIGHT,
  makeInitialDroneData,
  parseImuMessagePayload,
  parseOrientationOnly,
  pickDefaultImuTopic,
  type GpsData,
  type MinimalDroneData,
  type OdometryData,
  type PanelImuTopicState,
} from "./telemetryShared";

export function useIslTelemetryPanel(context: PanelExtensionContext) {
  const [droneData, setDroneData] = useState<MinimalDroneData>(() => makeInitialDroneData());
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();
  const [availableTopics, setAvailableTopics] = useState<readonly Topic[]>([]);
  const [colorScheme, setColorScheme] = useState<"dark" | "light">("dark");
  const [selectedImuTopic, setSelectedImuTopic] = useState<string>(
    () => (context.initialState as PanelImuTopicState | undefined)?.selectedImuTopic ?? "",
  );

  const [imuIngestError, setImuIngestError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(400);
  const [containerHeight, setContainerHeight] = useState(400);
  const didAutoPickImuRef = useRef(false);

  const theme = colorScheme === "dark" ? DARK : LIGHT;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    context.saveState({ selectedImuTopic } satisfies PanelImuTopicState);
  }, [context, selectedImuTopic]);

  useEffect(() => {
    if (didAutoPickImuRef.current || selectedImuTopic !== "") {
      return;
    }
    const pick = pickDefaultImuTopic(availableTopics);
    if (pick) {
      setSelectedImuTopic(pick);
      didAutoPickImuRef.current = true;
    }
  }, [availableTopics, selectedImuTopic]);

  useEffect(() => {
    if (selectedImuTopic === "") {
      setImuIngestError(null);
    }
  }, [selectedImuTopic]);

  useEffect(() => {
    const subs: { topic: string }[] = [{ topic: "/fix" }, { topic: "/Odometry" }];
    if (selectedImuTopic) {
      subs.push({ topic: selectedImuTopic });
    }
    context.subscribe(subs);
  }, [context, selectedImuTopic]);

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
        setImuIngestError(null);
      }

      if (renderState.currentFrame) {
        const frame = renderState.currentFrame;

        let imuParseResult: ReturnType<typeof parseImuMessagePayload> | null = null;
        if (selectedImuTopic) {
          const imuMessages = frame.filter((msg) => msg.topic === selectedImuTopic);
          if (imuMessages.length > 0) {
            const raw = imuMessages[imuMessages.length - 1]?.message;
            imuParseResult = parseImuMessagePayload(raw);
            if (!imuParseResult.ok) {
              setImuIngestError(imuParseResult.error);
            } else {
              setImuIngestError(null);
            }
          }
        }

        setDroneData((prev) => {
          const next = { ...prev };
          let dataUpdated = false;

          const gpsMessages = frame.filter((msg) => msg.topic === "/fix");
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
          if (selectedImuTopic && imuParseResult?.ok) {
            next.roll = imuParseResult.roll;
            next.pitch = imuParseResult.pitch;
            next.heading = (imuParseResult.yaw + 360) % 360;
            next.imuAcceleration = { ...imuParseResult.linear_acceleration };
            next.imuGyro = { ...imuParseResult.angular_velocity };
            dataUpdated = true;
            imuUpdatedThisFrame = true;
          }

          const odometryMessages = frame.filter((msg) => msg.topic.includes("/Odometry"));
          if (odometryMessages.length > 0 && !imuUpdatedThisFrame) {
            const odometryData = odometryMessages[odometryMessages.length - 1]?.message as unknown as OdometryData;
            const orient = odometryData?.pose?.pose?.orientation;
            if (orient) {
              const parsed = parseOrientationOnly(orient);
              if (parsed.ok) {
                next.roll = parsed.roll;
                next.pitch = parsed.pitch;
                next.heading = (parsed.yaw + 360) % 360;
                dataUpdated = true;
              }
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

  const { allImuTopicNames } = buildImuTopicOptionLists(availableTopics, selectedImuTopic);

  const shortSide = Math.min(containerWidth, containerHeight);
  const baseFont = Math.round(Math.max(11, Math.min(24, shortSide * 0.038 + 4)));

  return {
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
    shortSide,
    imuIngestError,
  };
}
