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
type SearchOut = {
  cls: Function | null;
  instances: Set<any>;
  depth: number | null;
};
type SearchData = {
  seen: Set<Function>;
  classes: (Function | null)[];
  out: SearchOut[];
  maxDepth: number;
};
//#endregion

(function () {
  log("Injected into Twitch.");

  const REACT = getReact();
  let accessor: string | null = null;
  let instances: Instances | null = null;

  window.addEventListener(
    "message",
    event => {
      // Only accept messages from this window to itself (i.e. not from any iframes)
      if (event.source !== window) return;
      if (event.data?.type !== "resetPlayer") return;

      log("Received resetPlayer message");
      if (!instances) instances = getInstances();
      if (!instances.playerInstance || !instances.playerSourceInstance) return;
      resetPlayer(instances);
    },
    false
  );

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
    node,
    criterias: Function[],
    maxDepth = 15,
    depth = 0,
    data: SearchData | null = null,
    traverseRoots = true
  ): SearchOut[] {
    if (!node) node = REACT;
    else if (node._reactInternalFiber) node = node._reactInternalFiber;
    else if (node instanceof Node) node = getReactInstance(node);

    if (!data)
      data = {
        seen: new Set(),
        classes: criterias.map(() => null),
        out: criterias.map(() => ({
          cls: null,
          instances: new Set(),
          depth: null,
        })),
        maxDepth: depth,
      };

    if (!node || node._ffz_no_scan || depth > maxDepth) return data.out;

    if (depth > data.maxDepth) data.maxDepth = depth;

    const inst = node.stateNode;
    if (inst) {
      const cls = inst.constructor;
      const idx = data.classes.indexOf(cls);

      if (idx !== -1) data.out[idx].instances.add(inst);
      else if (!data.seen.has(cls)) {
        let i = criterias.length;
        while (i-- > 0) {
          if (criterias[i](inst)) {
            data.classes[i] = data.out[i].cls = cls;
            data.out[i].instances.add(inst);
            data.out[i].depth = depth;
            break;
          }
        }
        data.seen.add(cls);
      }
    }

    let child = node.child;
    while (child) {
      searchAll(child, criterias, maxDepth, depth + 1, data, traverseRoots);
      child = child.sibling;
    }

    if (traverseRoots && inst && inst.props && inst.props.root) {
      const root = inst.props.root._reactRootContainer;
      if (root) {
        let child =
          (root._internalRoot && root._internalRoot.current) || root.current;
        while (child) {
          searchAll(child, criterias, maxDepth, depth + 1, data, traverseRoots);
          child = child.sibling;
        }
      }
    }

    return data.out;
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

    const results = searchAll(REACT, criterias, 1000);
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

    log("Resetting player");

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
