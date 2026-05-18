import { ExtensionContext } from "@foxglove/extension";
// import { initExamplePanel } from "./ExamplePanel";
// import { initDroneDashboardPanel } from "./DroneDashboardPanel";
import { initHeadingPanel } from "./panels/HeadingPanel";
import { initHorizonPanel } from "./panels/HorizonPanel";
import { initImuPanel } from "./panels/ImuPanel";

/**
 * Updates visualization marker mesh resource URL
 */
// function updateMeshResource(message: {
//   markers: Array<{
//     mesh_resource: string;
//     [key: string]: unknown;
//   }>;
// }): {
//   markers: Array<{
//     mesh_resource: string;
//     [key: string]: unknown;
//     updated: boolean;
//   }>;
// } {
//   // Create a deep copy of the message
//   const updatedMessage = JSON.parse(JSON.stringify(message));
  
//   // Update mesh_resource URL for each marker
//   updatedMessage.markers = updatedMessage.markers.map((marker: { mesh_resource: string; [key: string]: unknown }) => ({
//     ...marker,
//     mesh_resource: "http://raw.githubusercontent.com/TentacleSama4254/Assets/main/M600.stl",
//     updated: true
//   }));
  
//   return updatedMessage;
// }

/**
 * Convert visualization marker array to foxglove scene update
 */
function convertToSceneUpdate(message: {
  markers: Array<{
    header: {
      seq: number;
      stamp: { sec: number; nsec: number };
      frame_id: string;
    };
    id: number;
    mesh_resource: string;
    pose: {
      position: { x: number; y: number; z: number };
      orientation: { x: number; y: number; z: number; w: number };
    };
    scale: { x: number; y: number; z: number };
    color: { r: number; g: number; b: number; a: number };
    lifetime: { sec: number; nsec: number };
    frame_locked: boolean;
    [key: string]: unknown;
  }>;
}): {
  deletions: never[];
  entities: Array<{
    timestamp: { sec: number; nsec: number };
    frame_id: string;
    id: string;
    lifetime: { sec: number; nsec: number };
    frame_locked: boolean;
    models: Array<{
      pose: {
        position: { x: number; y: number; z: number };
        orientation: { x: number; y: number; z: number; w: number };
      };
      scale: { x: number; y: number; z: number };
      color: { r: number; g: number; b: number; a: number };
      url: string;
    }>;
    metadata: never[];
    arrows: never[];
    cubes: never[];
    spheres: never[];
    cylinders: never[];
    lines: never[];
    triangles: never[];
    texts: never[];
  }>;
} {
  const entities = message.markers.map((marker) => ({
    timestamp: marker.header.stamp,
    frame_id: marker.header.frame_id,
    id: `model_${marker.id}`,
    lifetime: marker.lifetime,
    frame_locked: marker.frame_locked,
    models: [{
      pose: marker.pose,
      scale:  { x: 0.002, y: 0.002, z: 0.002 },
      color: marker.color,
      url: "http://raw.githubusercontent.com/TentacleSama4254/Assets/main/M600.dae"
    }],
    metadata: [],
    arrows: [],
    cubes: [],
    spheres: [],
    cylinders: [],
    lines: [],
    triangles: [],
    texts: [],
  }));

  return {
    deletions: [],
    entities,
  };
}

export function activate(extensionContext: ExtensionContext): void {
  // extensionContext.registerPanel({ name: "example-panel", initPanel: initExamplePanel });
  // extensionContext.registerPanel({ name: "drone-dashboard", initPanel: initDroneDashboardPanel });
  extensionContext.registerPanel({ name: "horizon", initPanel: initHorizonPanel });
  extensionContext.registerPanel({ name: "heading", initPanel: initHeadingPanel });
  extensionContext.registerPanel({ name: "imu", initPanel: initImuPanel });

  // Register a topic alias that converts directly to SceneUpdate
  extensionContext.registerTopicAliases((_args) => [
    {
      sourceTopicName: "/globalEstimator/car_model",
      name: "/globalEstimator/drone_model",
      schemaName: "foxglove.SceneUpdate",
    },
  ]);

  // Register message converter for SceneUpdate
  extensionContext.registerMessageConverter({
    fromSchemaName: "visualization_msgs/MarkerArray",
    toSchemaName: "foxglove.SceneUpdate",
    converter: (message: {
      markers: Array<{
        header: {
          seq: number;
          stamp: { sec: number; nsec: number };
          frame_id: string;
        };
        id: number;
        mesh_resource: string;
        pose: {
          position: { x: number; y: number; z: number };
          orientation: { x: number; y: number; z: number; w: number };
        };
        scale: { x: number; y: number; z: number };
        color: { r: number; g: number; b: number; a: number };
        lifetime: { sec: number; nsec: number };
        frame_locked: boolean;
        [key: string]: unknown;
      }>;
    }, event: { topic: string }) => {
      // Only convert the car_model topic
      if (event.topic === "/globalEstimator/car_model") {
        return convertToSceneUpdate(message);
      }
      return {};
    },
  });
}