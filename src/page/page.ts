import type { MediaPlayer } from "amazon-ivs-player";
import $ from "../common/ts/$";
import log from "../common/ts/log";
import type {
  Constraint,
  FiberNode,
  FiberNodeDOMContainer,
  Instance,
} from "./types";

type WorkerFunction = {
  name: string;
  functionBody: string;
};
type WorkerFunctions = {
  onVideoWeaverResponse: WorkerFunction;
};

namespace TTV_LOL_PRO {
  const REAL_WORKER = window.Worker;
  let twitchMainWorker: Worker | null = null;

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

      const volume = player.getVolume();
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

  function onMidroll() {
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

  function onVideoWeaverResponse(responseText: string) {
    const AD_SIGNIFIER = "stitched"; // From https://github.com/cleanlock/VideoAdBlockForTwitch/blob/145921a822e830da62d39e36e8aafb8ef22c7be6/firefox/content.js#L87
    const START_DATE_REGEX =
      /START-DATE="(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+(?:[+-][0-2]\d:[0-5]\d|Z))"/i; // From https://stackoverflow.com/a/3143231

    // From https://github.com/cleanlock/VideoAdBlockForTwitch/blob/145921a822e830da62d39e36e8aafb8ef22c7be6/firefox/content.js#L523-L527
    const hasAdTags = (text: string) => text.includes(AD_SIGNIFIER);
    const isMidroll = (text: string) =>
      text.includes('"MIDROLL"') || text.includes('"midroll"');

    const responseTextLines = responseText.split("\n");
    const midrollLine = responseTextLines.find(
      line => hasAdTags(line) && isMidroll(line)
    );
    if (!midrollLine) return;

    const startDateMatch = midrollLine.match(START_DATE_REGEX);
    if (!startDateMatch) return;
    const [, startDateString] = startDateMatch;
    if (!startDateString) return;

    // @ts-ignore
    const lastStartDateString = self.lastStartDateString;
    // Prevent multiple midroll messages from being sent for the same midroll.
    const isSameMidroll = startDateString === lastStartDateString;
    if (!isSameMidroll) {
      self.postMessage({ type: "midroll" });
      // @ts-ignore
      self.lastStartDateString = startDateString;
    }
  }

  function filterResponseData(functions: WorkerFunctions) {
    const { onVideoWeaverResponse } = functions;

    const REAL_FETCH = self.fetch;
    const VIDEO_WEAVER_URL_REGEX =
      /^https?:\/\/video-weaver\.(?:[a-z0-9-]+\.)*ttvnw\.net\//i;

    self.fetch = async function (Url, options) {
      const urlString = Url instanceof Request ? Url.url : Url.toString();

      if (VIDEO_WEAVER_URL_REGEX.test(urlString)) {
        return new Promise((resolve, reject) => {
          REAL_FETCH(Url, options)
            .then(async response => {
              const responseText = await response.text();
              const newResponse = new Response(responseText);
              self[onVideoWeaverResponse.name]?.(responseText);
              resolve(newResponse);
            })
            .catch(error => {
              reject(error);
            });
        });
      }

      return REAL_FETCH.apply(this, arguments);
    };

    console.log("[TTV LOL PRO] Hooked into fetch.");
  }

  function importFunctions(functions: WorkerFunctions) {
    return Object.values(functions).map(fn => fn.functionBody);
  }

  // From https://github.com/cleanlock/VideoAdBlockForTwitch/blob/145921a822e830da62d39e36e8aafb8ef22c7be6/chrome/remove_video_ads.js#L296-L301
  function getWasmWorkerUrl(twitchBlobUrl: string) {
    var req = new XMLHttpRequest();
    req.open("GET", twitchBlobUrl, false);
    req.send();
    return req.responseText.split("'")[1];
  }

  // From https://github.com/cleanlock/VideoAdBlockForTwitch/blob/145921a822e830da62d39e36e8aafb8ef22c7be6/chrome/remove_video_ads.js#L95-L135
  export class Worker extends REAL_WORKER {
    constructor(Url: string | URL) {
      const twitchBlobUrl = Url.toString();
      const isBlobUrl = (url: string) => url.toLowerCase().startsWith("blob:");
      if (twitchMainWorker != null || !isBlobUrl(twitchBlobUrl)) {
        super(Url);
        return;
      }

      // Minification requires us to pass the function names to the worker.
      const functions = {
        onVideoWeaverResponse: {
          name: onVideoWeaverResponse.name,
          functionBody: onVideoWeaverResponse.toString(),
        },
      } as WorkerFunctions;

      const ttvlolBlobPart = `
        ${importFunctions(functions)}
        ${filterResponseData.toString()}
        ${filterResponseData.name}(${JSON.stringify(functions)});
        importScripts('${twitchBlobUrl}');
      ` as BlobPart;
      const ttvlolBlobUrl = URL.createObjectURL(new Blob([ttvlolBlobPart]));
      // Prevents VideoAdBlockForTwitch from throwing an error.
      const workerBlobPart = `
        try {
          importScripts('${ttvlolBlobUrl}');
        } catch (error) {
          console.error('[TTV LOL PRO] Error importing worker:', error);
          importScripts('${getWasmWorkerUrl(twitchBlobUrl)}');
        }
      ` as BlobPart;
      const workerBlobUrl = URL.createObjectURL(new Blob([workerBlobPart]));

      super(workerBlobUrl);
      twitchMainWorker = this;

      let lastResetsTimestamps = [] as number[];

      // Listen for messages from the worker.
      this.addEventListener("message", event => {
        switch (event.data?.type) {
          case "midroll":
            const recentResets = lastResetsTimestamps.filter(
              timestamp => Date.now() - timestamp < 15000 // 15 seconds
            );
            if (recentResets.length >= 3) return; // Limit to 3 player resets per 15 seconds.
            lastResetsTimestamps = [...recentResets, Date.now()];
            onMidroll();
            break;
        }
      });
    }
  }
}

log("Page script running.");

window.Worker = TTV_LOL_PRO.Worker;
