import type { PanelExtensionContext, SettingsTree, Topic } from "@foxglove/extension";
import { useEffect } from "react";

import { buildImuTopicSelectOptions } from "./telemetryShared";

/**
 * Registers the Foxglove sidebar "Panel" settings editor with an IMU topic dropdown.
 */
export function useImuTopicPanelSettings(
  context: PanelExtensionContext,
  availableTopics: readonly Topic[],
  allImuTopicNames: string[],
  selectedImuTopic: string,
  setSelectedImuTopic: (topic: string) => void,
  helpText: string,
): void {
  useEffect(() => {
    const options = buildImuTopicSelectOptions(availableTopics, allImuTopicNames);

    const tree: SettingsTree = {
      actionHandler: (action) => {
        if (action.action !== "update") {
          return;
        }
        if (action.payload.input !== "select") {
          return;
        }
        const path = action.payload.path;
        if (path.length !== 2 || path[0] !== "general" || path[1] !== "imuTopic") {
          return;
        }
        const raw = action.payload.value;
        const next = Array.isArray(raw) ? raw[0] : raw;
        setSelectedImuTopic(next === undefined || next === null ? "" : String(next));
      },
      nodes: {
        general: {
          label: "Topic",
          fields: {
            imuTopic: {
              label: "IMU message topic",
              input: "select",
              value: selectedImuTopic === "" ? undefined : selectedImuTopic,
              options,
              help: helpText,
            },
          },
        },
      },
    };

    context.updatePanelSettingsEditor(tree);
  }, [context, availableTopics, allImuTopicNames, selectedImuTopic, setSelectedImuTopic, helpText]);
}
