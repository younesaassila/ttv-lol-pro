/**
 * This code is based on the work of FrankerFaceZ:
 *  GitHub: https://github.com/FrankerFaceZ/FrankerFaceZ
 *  Website: https://www.frankerfacez.com/
 */

console.log("[TTV LOL PRO] Injected into Twitch");

//#region Types
type DOMContainerElement = Element & { _reactRootContainer?: any };
type Instances = {
  playerInstance: any;
  playerSourceInstance: any;
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

function tlp_searchAll(
  node,
  criterias: Function[],
  max_depth = 15,
  depth = 0,
  data: any = undefined,
  traverse_roots = true
) {
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
      max_depth: depth,
    };

  if (!node || node._ffz_no_scan || depth > max_depth) return data.out;

  if (depth > data.max_depth) data.max_depth = depth;

  const inst = node.stateNode;
  if (inst) {
    const cls = inst.constructor,
      idx = data.classes.indexOf(cls);

    if (idx !== -1) data.out[idx].instances.add(inst);
    else if (!data.seen.has(cls)) {
      let i = criterias.length;
      while (i-- > 0)
        if (criterias[i](inst)) {
          data.classes[i] = data.out[i].cls = cls;
          data.out[i].instances.add(inst);
          data.out[i].depth = depth;
          break;
        }

      data.seen.add(cls);
    }
  }

  let child = node.child;
  while (child) {
    tlp_searchAll(child, criterias, max_depth, depth + 1, data, traverse_roots);
    child = child.sibling;
  }

  if (traverse_roots && inst && inst.props && inst.props.root) {
    const root = inst.props.root._reactRootContainer;
    if (root) {
      let child =
        (root._internalRoot && root._internalRoot.current) || root.current;
      while (child) {
        tlp_searchAll(
          child,
          criterias,
          max_depth,
          depth + 1,
          data,
          traverse_roots
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

function tlp_resetPlayer(instances: Instances) {
  const { playerInstance, playerSourceInstance } = instances;
  const mediaPlayer = playerInstance.props.mediaPlayerInstance;

  // Are we dealing with a VOD?
  const duration = mediaPlayer.getDuration?.() ?? Infinity;
  let position = -1;

  if (isFinite(duration) && !isNaN(duration) && duration > 0)
    position = mediaPlayer.getPosition();

  const video = mediaPlayer.core?.mediaSinkManager?.video;
  if (mediaPlayer.attachHTMLVideoElement) {
    const newVideo = document.createElement("video");
    const volume = video?.volume ?? mediaPlayer.getVolume();
    const muted = mediaPlayer.isMuted();

    newVideo.volume = muted ? 0 : volume;
    newVideo.playsInline = true;

    video.replaceWith(newVideo);
    mediaPlayer.attachHTMLVideoElement(newVideo);
    setTimeout(() => {
      mediaPlayer.setVolume(volume);
      mediaPlayer.setMuted(muted);
    }, 0);
  }

  playerSourceInstance.setSrc({ isNewMediaPlayerInstance: false });

  if (position > 0) setTimeout(() => mediaPlayer.seekTo(position), 250);
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
