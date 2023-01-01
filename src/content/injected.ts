/**
 * This code is based on the work of FrankerFaceZ:
 *  GitHub: https://github.com/FrankerFaceZ/FrankerFaceZ
 *  Website: https://www.frankerfacez.com/
 */

import type { MediaPlayer } from "amazon-ivs-player";
import log from "../common/ts/log";

//#region Types
type DOMContainerElement = Element & { _reactRootContainer?: any };
type Instances = {
  playerInstance: any;
  playerSourceInstance: any;
};
type MediaPlayerInstance =
  | MediaPlayer & {
      core: any;
      requestCaptureAnalytics: any;
      startCapture: any;
      stopCapture: any;
    };
type SearchOutput = {
  cls: Function | null;
  instances: Set<any>;
  depth: number | null;
};
type SearchData = {
  seen: Set<Function>;
  classes: (Function | null)[];
  output: SearchOutput[];
  maxDepth: number;
};
//#endregion

(function () {
  log("Injected into Twitch.");

  // Notify the content script that the script has been injected.
  window.postMessage({ type: "injectedScriptInjected" }, "*");

  let react: any = null;
  let accessor: string | null = null;
  let instances: Instances | null = null;

  // Listen for messages from the content script.
  window.addEventListener("message", event => {
    if (event.source !== window) return;
    if (!event.data) return;

    if (event.data.type === "resetPlayer") {
      log("Received `resetPlayer` message.");
      if (!instances) instances = getInstances();
      if (!instances.playerInstance || !instances.playerSourceInstance) {
        log("Player instance not found.");
        return;
      }
      resetPlayer(instances);
    }
  });

  /**
   * Get the root element's React instance from the page.
   * @param rootSelector
   * @returns
   */
  function getReact(rootSelector = "body #root") {
    const rootElement = document.querySelector(
      rootSelector
    ) as DOMContainerElement;
    const reactRootContainer = rootElement?._reactRootContainer;
    const internalRoot = reactRootContainer?._internalRoot;
    const react = internalRoot?.current?.child;
    return react;
  }

  /**
   * Find the accessor (key) of the element's React instance.
   * @param element
   * @returns
   */
  function findAccessor(element): string | null {
    for (const key in element) {
      if (key.startsWith("__reactInternalInstance$")) return key;
    }
    return null;
  }

  /**
   * Get the element's React instance.
   * @param element
   * @returns
   */
  function getReactInstance(element) {
    if (!accessor) accessor = findAccessor(element);
    if (!accessor) return;

    return (
      element[accessor] ||
      (element._reactRootContainer &&
        element._reactRootContainer._internalRoot &&
        element._reactRootContainer._internalRoot.current) ||
      (element._reactRootContainer && element._reactRootContainer.current)
    );
  }

  /**
   * Get all React instances matching at least one of the given criterias.
   * @param node
   * @param criterias
   * @param maxDepth
   * @param depth
   * @param data
   * @param traverseRoots
   * @returns
   */
  function searchAll(
    node: any,
    criterias: Function[],
    maxDepth = 15,
    depth = 0,
    data: SearchData | null = null,
    traverseRoots = true
  ): SearchOutput[] {
    if (!node) node = react;
    else if (node._reactInternalFiber) node = node._reactInternalFiber;
    else if (node instanceof Node) node = getReactInstance(node);

    // If no search data was provided, create a new object to store search progress.
    if (!data) {
      data = {
        seen: new Set(),
        classes: criterias.map(() => null),
        output: criterias.map(() => ({
          cls: null,
          instances: new Set(),
          depth: null,
        })),
        maxDepth: depth,
      };
    }

    // If the node is not valid, or if the search has exceeded the maximum depth, return the search output.
    if (!node || node._ffz_no_scan || depth > maxDepth) return data.output;
    // Update the maximum depth reached during the search, if necessary.
    if (depth > data.maxDepth) data.maxDepth = depth;

    const instance = node.stateNode;
    if (instance) {
      const cls = instance.constructor;
      const idx = data.classes.indexOf(cls);

      if (idx !== -1) {
        // If the constructor function has already been seen, add the current React instance to the matching instances
        // for the corresponding criteria function.
        data.output[idx].instances.add(instance);
      } else if (!data.seen.has(cls)) {
        // If the constructor function has not yet been seen, check if any of the criteria functions match the current React instance.
        let i = criterias.length;
        while (i-- > 0) {
          if (criterias[i](instance)) {
            // Match found.
            data.classes[i] = data.output[i].cls = cls;
            data.output[i].instances.add(instance);
            data.output[i].depth = depth;
            break;
          }
        }
        data.seen.add(cls);
      }
    }

    // Search for matching React instances in the children of the current node.
    let child = node.child;
    while (child) {
      searchAll(child, criterias, maxDepth, depth + 1, data, traverseRoots);
      child = child.sibling;
    }

    // If the search should traverse root nodes, and the current React instance has a root prop,
    // search for matching instances in the root node.
    if (traverseRoots && instance && instance.props && instance.props.root) {
      const root = instance.props.root._reactRootContainer;
      if (root) {
        let child =
          (root._internalRoot && root._internalRoot.current) || root.current;
        while (child) {
          searchAll(child, criterias, maxDepth, depth + 1, data, traverseRoots);
          child = child.sibling;
        }
      }
    }

    return data.output;
  }

  /**
   * Get the player and player source instances.
   * @returns
   */
  function getInstances(): Instances {
    const playerCriteria = instance =>
      instance.setPlayerActive &&
      instance.props?.playerEvents &&
      instance.props?.mediaPlayerInstance;
    const playerSourceCriteria = instance =>
      instance.setSrc && instance.setInitialPlaybackSettings;
    const criterias = [playerCriteria, playerSourceCriteria];

    if (!react) react = getReact();
    const results = searchAll(react, criterias, 1000);
    const instances = results
      .map(result => Array.from(result.instances.values()))
      .flat();

    return {
      playerInstance: instances.find(playerCriteria),
      playerSourceInstance: instances.find(playerSourceCriteria),
    };
  }

  /**
   * Reset the player.
   * @param instances
   */
  function resetPlayer(instances: Instances) {
    const { playerInstance, playerSourceInstance } = instances;

    log("Resetting player.");

    const player = playerInstance.props
      .mediaPlayerInstance as MediaPlayerInstance;

    // Are we dealing with a VOD?
    const duration = player.getDuration?.() ?? Infinity;
    let position = -1;

    if (isFinite(duration) && !isNaN(duration) && duration > 0) {
      position = player.getPosition();
    }

    const video = player.core?.mediaSinkManager?.video as HTMLVideoElement;
    if (player.attachHTMLVideoElement) {
      const newVideo = document.createElement("video");
      const volume = video?.volume ?? player.getVolume();
      const muted = player.isMuted();

      newVideo.volume = muted ? 0 : volume;
      newVideo.playsInline = true;

      video.replaceWith(newVideo);
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
})();
