import type { MediaPlayer } from "amazon-ivs-player";

console.log("[TTV LOL PRO] Injected into Twitch");

// From https://stackoverflow.com/a/39165137
function lol_getReactInstance(element: Element, traverseUp = 0) {
  const key = Object.keys(element).find(key => {
    return (
      key.startsWith("__reactFiber$") || // React 17+
      key.startsWith("__reactInternalInstance$") // React <17
    );
  });
  if (key == null) return null;
  const elementFiber = element[key];
  if (elementFiber == null) return null;

  // React <16
  if (elementFiber._currentElement) {
    let componentFiber = elementFiber._currentElement._owner;
    for (let i = 0; i < traverseUp; i++) {
      componentFiber = componentFiber._currentElement._owner;
    }
    return componentFiber._instance;
  }

  // React 16+
  const lol_getComponentFiber = fiber => {
    let parentFiber = fiber.return;
    while (typeof parentFiber.type == "string") {
      parentFiber = parentFiber.return;
    }
    return parentFiber;
  };
  let componentFiber = lol_getComponentFiber(elementFiber);
  for (let i = 0; i < traverseUp; i++) {
    componentFiber = lol_getComponentFiber(componentFiber);
  }
  return componentFiber.stateNode;
}

function lol_getReactSubInstances(
  element: Element,
  traverseUp = 0,
  depth = 0,
  maxDepth = 15, // Prevent infinite recursion
  _subInstances: any[] = []
) {
  const instance = lol_getReactInstance(element, traverseUp);
  if (instance && !_subInstances.includes(instance)) {
    _subInstances.push(instance);
  }
  if (depth >= maxDepth) return _subInstances;
  for (const child of element.children) {
    _subInstances = lol_getReactSubInstances(
      child,
      traverseUp,
      depth + 1,
      maxDepth,
      _subInstances
    );
  }
  return _subInstances;
}

function lol_getMediaPlayerInstance() {
  const resizeDetectorElement = document.querySelector(
    'div[data-test-selector="video-player__video-container"] > .resize-detector'
  );
  if (!resizeDetectorElement) return null;

  const instances = lol_getReactSubInstances(resizeDetectorElement);
  console.log(`[TTV LOL PRO] Found ${instances.length} React instances`);
  console.log(instances);

  let mediaPlayerInstance: MediaPlayer | null = null;
  for (const instance of instances) {
    const value =
      instance._reactInternalFiber?.return?.memoizedProps?.mediaPlayerInstance;
    if (value != null) {
      mediaPlayerInstance = value;
      break;
    }
  }
  return mediaPlayerInstance;
}

function lol_main() {
  const mediaPlayerInstance = lol_getMediaPlayerInstance();
  if (!mediaPlayerInstance) {
    console.log("[TTV LOL PRO] No media player instance found");
    return;
  }

  console.log("[TTV LOL PRO] Found media player instance:");
  console.log(mediaPlayerInstance);
}

// TODO: Find a better way to detect when the player is ready
setTimeout(lol_main, 10_000);

// TODO: Detect when an ad is playing and reset the player
// TODO: Test Reset feature once user has navigated to a new stream without reloading the page
