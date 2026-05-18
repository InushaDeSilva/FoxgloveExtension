import type { PanelExtensionContext, Topic } from "@foxglove/extension";
import {
  useCallback,
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
  pickDefaultImuTopic,
  type GpsData,
  type ImuData,
  type MinimalDroneData,
  type OdometryData,
  type PanelImuTopicState,
  quaternionToEuler,
} from "./telemetryShared";

export function useIslTelemetryPanel(context: PanelExtensionContext) {
  const [droneData, setDroneData] = useState<MinimalDroneData>(() => makeInitialDroneData());
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();
  const [availableTopics, setAvailableTopics] = useState<readonly Topic[]>([]);
  const [colorScheme, setColorScheme] = useState<"dark" | "light">("dark");
  const [selectedImuTopic, setSelectedImuTopic] = useState<string>(
    () => (context.initialState as PanelImuTopicState | undefined)?.selectedImuTopic ?? "",
  );

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

  const { allImuTopicNames } = buildImuTopicOptionLists(availableTopics, selectedImuTopic);

  const handleImuTopicChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedImuTopic(e.target.value);
  }, []);

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
    handleImuTopicChange,
    baseFont,
    shortSide,
  };
}
