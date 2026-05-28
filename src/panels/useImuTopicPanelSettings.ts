import type { PanelExtensionContext, SettingsTree, SettingsTreeAction, SettingsTreeNodes, Topic } from "@foxglove/extension";
import { useEffect } from "react";

import { buildImuTopicSelectOptions } from "./telemetryShared";

export interface ExtraPanelSettingsOptions {
  extraNodes?: SettingsTreeNodes;
  onExtraFieldUpdate?: (action: SettingsTreeAction) => void;
}

/**
 * Registers the Foxglove sidebar "Panel" settings editor with an IMU topic
 * dropdown plus optional extra node sections (e.g. Display / debug controls).
 */
export function useImuTopicPanelSettings(
  context: PanelExtensionContext,
  availableTopics: readonly Topic[],
  allImuTopicNames: string[],
  selectedImuTopic: string,
  setSelectedImuTopic: (topic: string) => void,
  helpText: string,
  extra?: ExtraPanelSettingsOptions,
): void {
  useEffect(() => {
    const options = buildImuTopicSelectOptions(availableTopics, allImuTopicNames);

    const tree: SettingsTree = {
      actionHandler: (action) => {
        if (action.action !== "update") {
          return;
        }
        const path = action.payload.path;
        if (path.length < 2) {
          return;
        }

        if (path[0] === "general" && path[1] === "imuTopic") {
          const raw = action.payload.value;
          const next = Array.isArray(raw) ? raw[0] : raw;
          setSelectedImuTopic(next === undefined || next === null ? "" : String(next));
          return;
        }

        extra?.onExtraFieldUpdate?.(action);
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
        ...extra?.extraNodes,
      },
    };

    context.updatePanelSettingsEditor(tree);
  }, [context, availableTopics, allImuTopicNames, selectedImuTopic, setSelectedImuTopic, helpText, extra]);
}
