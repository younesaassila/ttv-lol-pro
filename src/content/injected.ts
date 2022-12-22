/**
 * This code is based on the work of FrankerFaceZ:
 *  GitHub: https://github.com/FrankerFaceZ/FrankerFaceZ
 *  Website: https://www.frankerfacez.com/
 */

import type { MediaPlayer } from "amazon-ivs-player";

console.log("[TTV LOL PRO] Injected into Twitch");

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

const REACT = tlp_getReact();
let accessor: string | null = null;

/**
 * Get the root element's React instance from the page.
 * @param rootSelector
 * @returns
 */
function tlp_getReact(rootSelector = "body #root") {
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
function tlp_findAccessor(element): string | null {
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
function tlp_getReactInstance(element) {
  if (!accessor) accessor = tlp_findAccessor(element);
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
function tlp_searchAll(
  node,
  criterias: Function[],
  maxDepth = 15,
  depth = 0,
  data: SearchData | null = null,
  traverseRoots = true
): SearchOut[] {
  if (!node) node = REACT;
  else if (node._reactInternalFiber) node = node._reactInternalFiber;
  else if (node instanceof Node) node = tlp_getReactInstance(node);

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
    tlp_searchAll(child, criterias, maxDepth, depth + 1, data, traverseRoots);
    child = child.sibling;
  }

  if (traverseRoots && inst && inst.props && inst.props.root) {
    const root = inst.props.root._reactRootContainer;
    if (root) {
      let child =
        (root._internalRoot && root._internalRoot.current) || root.current;
      while (child) {
        tlp_searchAll(
          child,
          criterias,
          maxDepth,
          depth + 1,
          data,
          traverseRoots
        );
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
function tlp_getInstances(): Instances {
  const playerCriteria = instance =>
    instance.setPlayerActive &&
    instance.props?.playerEvents &&
    instance.props?.mediaPlayerInstance;
  const playerSourceCriteria = instance =>
    instance.setSrc && instance.setInitialPlaybackSettings;
  const criterias = [playerCriteria, playerSourceCriteria];

  const results = tlp_searchAll(REACT, criterias, 1000);
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
function tlp_resetPlayer(instances: Instances) {
  const { playerInstance, playerSourceInstance } = instances;

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

function tlp_main() {
  const instances = tlp_getInstances();
  console.log(instances);
  if (!instances.playerInstance || !instances.playerSourceInstance) return;
  tlp_resetPlayer(instances);
}

// TODO: Find a better way to detect when the player is ready
setTimeout(tlp_main, 10_000);

// TODO: Detect when an ad is playing and reset the player
// TODO: Test Reset feature once user has navigated to a new stream without reloading the page
