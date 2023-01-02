import type { MediaPlayer } from "amazon-ivs-player";
import $ from "../common/ts/$";
import log from "../common/ts/log";
import type {
  Constraint,
  FiberNode,
  FiberNodeDOMContainer,
  Instance,
} from "./types";

namespace TTV_LOL_PRO {
  let rootElement: Element | null = null;
  let rootFiberNode: FiberNode | null = null;
  let playerInstance: Instance | null = null;
  let playerSourceInstance: Instance | null = null;

  // From https://github.com/bendtherules/react-fiber-traverse/blob/fdfd267d9583163d0d53b061f20d4b505985dc81/src/utils.ts#L65-L74
  function doesElementContainRootFiberNode(
    element: Element
  ): element is FiberNodeDOMContainer {
    return (
      element.hasOwnProperty("_reactRootContainer") &&
      (
        element as Element & {
          _reactRootContainer: any;
        }
      )._reactRootContainer.hasOwnProperty("_internalRoot")
    );
  }

  function getRootFiberNode(rootElement: Element): FiberNode | null {
    if (doesElementContainRootFiberNode(rootElement)) {
      return rootElement._reactRootContainer._internalRoot.current;
    }
    return null;
  }

  // From https://github.com/cleanlock/VideoAdBlockForTwitch/blob/145921a822e830da62d39e36e8aafb8ef22c7be6/chrome/remove_video_ads.js#L751-L764
  function findReactInstance(
    root: FiberNode,
    constraint: Constraint
  ): Instance | null {
    if (root.stateNode && constraint(root.stateNode)) {
      return root.stateNode;
    }
    let node = root.child;
    while (node) {
      const result = findReactInstance(node, constraint);
      if (result) {
        return result;
      }
      node = node.sibling;
    }
    return null;
  }

  function findReactInstanceWrapper(constraint: Constraint): Instance | null {
    rootElement ??= $("#root");
    if (!rootElement) {
      return null;
    }
    rootFiberNode ??= getRootFiberNode(rootElement);
    if (!rootFiberNode) {
      return null;
    }
    return findReactInstance(rootFiberNode, constraint);
  }

  // From https://github.com/FrankerFaceZ/FrankerFaceZ/blob/14400e16bcf8413af92942e1754ea794d5f9e6ce/src/sites/shared/player.jsx#L2031-L2098
  function resetPlayer(
    playerInstance: Instance,
    playerSourceInstance: Instance
  ) {
    log("Resetting player…");

    const player = playerInstance.props.mediaPlayerInstance as MediaPlayer & {
      core: any;
    };

    let position = -1;
    const duration = player.getDuration?.() ?? Infinity;
    const isVOD = isFinite(duration) && !isNaN(duration) && duration > 0;
    if (isVOD) {
      position = player.getPosition();
    }

    if (player.attachHTMLVideoElement != null) {
      const video = player.core?.mediaSinkManager?.video as HTMLVideoElement;
      const newVideo = document.createElement("video");

      const volume = video?.volume ?? player.getVolume();
      const muted = player.isMuted();
      newVideo.volume = muted ? 0 : volume;
      newVideo.playsInline = true;

      video?.replaceWith(newVideo);
      player.attachHTMLVideoElement(newVideo);
      setTimeout(() => {
        player.setVolume(volume);
        player.setMuted(muted);
      }, 0);
    }

    playerSourceInstance.setSrc({ isNewMediaPlayerInstance: false });

    if (position > 0) {
      setTimeout(() => player.seekTo(position), 250);
    }
  }

  export function onResetPlayerMessage() {
    // From https://github.com/FrankerFaceZ/FrankerFaceZ/blob/14400e16bcf8413af92942e1754ea794d5f9e6ce/src/sites/player/player.jsx#L17-L25
    const playerConstraint: Constraint = (instance: Instance) =>
      instance.setPlayerActive &&
      instance.props?.playerEvents &&
      instance.props?.mediaPlayerInstance;
    const playerSourceConstraint: Constraint = (instance: Instance) =>
      instance.setSrc && instance.setInitialPlaybackSettings;

    playerInstance ??= findReactInstanceWrapper(playerConstraint);
    if (!playerInstance) {
      return log("Error: Could not find player instance.");
    }
    playerSourceInstance ??= findReactInstanceWrapper(playerSourceConstraint);
    if (!playerSourceInstance) {
      return log("Error: Could not find player source instance.");
    }

    resetPlayer(playerInstance, playerSourceInstance);
  }
}

log("Page script running.");

// Notify the content script that the page script has been injected.
window.postMessage({ type: "pageScriptInjected" }, "*");

// Listen for messages from the content script.
window.addEventListener("message", event => {
  if (event.source !== window || !event.data) return;

  switch (event.data.type) {
    case "resetPlayer":
      TTV_LOL_PRO.onResetPlayerMessage();
      break;
  }
});
