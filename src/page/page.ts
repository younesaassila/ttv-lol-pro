import { Mutex } from "async-mutex";
import findChannelFromTwitchTvUrl from "../common/ts/findChannelFromTwitchTvUrl";
import Logger from "../common/ts/Logger";
import toAbsoluteUrl from "../common/ts/toAbsoluteUrl";
import { MessageType, ProxyRequestType } from "../types";
import getFetch from "./getFetch";
import getWorker from "./getWorker";
import {
  getSendMessageToContentScript,
  getSendMessageToContentScriptAndWaitForResponse,
  getSendMessageToPageScript,
  getSendMessageToPageScriptAndWaitForResponse,
  getSendMessageToWorkerScripts,
  getSendMessageToWorkerScriptsAndWaitForResponse,
} from "./sendMessage";
import type { PageState } from "./types";

const logger = new Logger("Page");
type PageRuntime = {
  state: "initializing" | "ready";
  broadcastChannelName: string;
};

declare global {
  interface Window {
    __TTV_LOL_PRO_PAGE_RUNTIME__?: PageRuntime;
  }
}

const performanceNavigationEntry =
  performance.getEntriesByType("navigation")[0];
if (performanceNavigationEntry) {
  logger.log(
    `Page script running (injected after ${(
      performance.now() - performanceNavigationEntry.startTime
    ).toFixed(0)}ms since navigation start).`
  );
} else {
  logger.log("Page script running.");
}

if (!document.documentElement.dataset.tlpParams) {
  logger.log("Waiting for params from content script…");
  waitForParams()
    .then(params => {
      if (performanceNavigationEntry) {
        logger.log(
          `Received params from content script (after ${(
            performance.now() - performanceNavigationEntry.startTime
          ).toFixed(0)}ms since navigation start).`
        );
      } else {
        logger.log("Received params from content script.");
      }
      main(params);
    })
    .catch(error => {
      logger.error("Failed to get params:", error);
    });
} else {
  try {
    main(JSON.parse(document.documentElement.dataset.tlpParams));
  } catch (error) {
    logger.error("Failed to parse params:", error);
  }
}

async function waitForParams(): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      observer.disconnect();
      reject(new Error("Timed out waiting for params."));
    }, 10000); // 10 seconds timeout
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-tlp-params" &&
          document.documentElement.dataset.tlpParams
        ) {
          clearTimeout(timeout);
          observer.disconnect();
          try {
            const params = JSON.parse(
              document.documentElement.dataset.tlpParams
            );
            resolve(params);
          } catch (error) {
            reject(error);
          }
        }
      }
    });
    observer.observe(document.documentElement, {
      attributeFilter: ["data-tlp-params"],
    });
  });
}

async function main(params: any) {
  // Twitch is a single-page application and can reinject the page script when
  // navigating between views. Replacing fetch/Worker and adding history/channel
  // listeners more than once retains the previous closures and causes player
  // EventEmitter listeners to accumulate. Keep one runtime per document.
  if (window.__TTV_LOL_PRO_PAGE_RUNTIME__) {
    logger.debug(
      "Page script already initialized; skipping duplicate initialization."
    );
    return;
  }
  const runtime: PageRuntime = {
    state: "initializing",
    broadcastChannelName: params.broadcastChannelName,
  };
  window.__TTV_LOL_PRO_PAGE_RUNTIME__ = runtime;

  delete document.documentElement.dataset.tlpParams;

  const broadcastChannel = new BroadcastChannel(params.broadcastChannelName);
  const sendMessageToContentScript =
    getSendMessageToContentScript(broadcastChannel);
  const sendMessageToContentScriptAndWaitForResponse =
    getSendMessageToContentScriptAndWaitForResponse(broadcastChannel);
  const sendMessageToPageScript = getSendMessageToPageScript(broadcastChannel);
  const sendMessageToPageScriptAndWaitForResponse =
    getSendMessageToPageScriptAndWaitForResponse(broadcastChannel);
  const sendMessageToWorkerScripts =
    getSendMessageToWorkerScripts(broadcastChannel);
  const sendMessageToWorkerScriptsAndWaitForResponse =
    getSendMessageToWorkerScriptsAndWaitForResponse(broadcastChannel);

  const pageState: PageState = {
    params: params,
    isChromium: params.isChromium,
    scope: "page",
    state: undefined,
    requestTypeMutexes: {
      [ProxyRequestType.Passport]: new Mutex(),
      [ProxyRequestType.Usher]: new Mutex(),
      [ProxyRequestType.VideoWeaver]: new Mutex(),
      [ProxyRequestType.GraphQL]: new Mutex(),
      [ProxyRequestType.GraphQLToken]: new Mutex(),
      [ProxyRequestType.GraphQLIntegrity]: new Mutex(),
      [ProxyRequestType.GraphQLAll]: new Mutex(),
      [ProxyRequestType.TwitchWebpage]: new Mutex(),
    },
    twitchWorkers: [], // No longer used. Might be useful in the future?
    sendMessageToContentScript,
    sendMessageToContentScriptAndWaitForResponse,
    sendMessageToPageScript,
    sendMessageToPageScriptAndWaitForResponse,
    sendMessageToWorkerScripts,
    sendMessageToWorkerScriptsAndWaitForResponse,
  };

  const originalFetch = window.fetch;
  const newFetch = getFetch(pageState);
  window.fetch = newFetch;
  if (window.fetch !== newFetch) {
    logger.error("Failed to replace fetch.");
    sendMessageToContentScript({
      type: MessageType.ExtensionError,
      errorMessage:
        "Failed to replace fetch. Are you using another Twitch extension?",
    });
  } else {
    logger.log("fetch replaced successfully.");
  }

  const newWorker = getWorker(pageState);
  if (newWorker !== null) {
    window.Worker = newWorker;
    if (window.Worker !== newWorker) {
      logger.error("Failed to replace Worker.");
      sendMessageToContentScript({
        type: MessageType.ExtensionError,
        errorMessage:
          "Failed to replace Worker. Are you using another Twitch ad blocker?",
      });
    } else {
      logger.log("Worker replaced successfully.");
    }
  }
  if (newWorker === null || window.Worker !== newWorker) {
    if (window.fetch === newFetch) {
      logger.warn(
        "Reverting fetch replacement due to Worker replacement failure."
      );
      window.fetch = originalFetch;
    }
  }

  broadcastChannel.addEventListener("message", event => {
    if (!event.data || event.data.type !== MessageType.PageScriptMessage) {
      return;
    }

    const { message } = event.data;
    if (!message) return;

    switch (message.type) {
      case MessageType.GetStoreStateResponse:
        if (pageState.state == null) {
          logger.log("Received store state from content script.");
        } else {
          logger.debug("Received store state from content script.");
        }
        const state = message.state;
        pageState.state = state;
        break;
    }
  });
  sendMessageToContentScript({
    type: MessageType.GetStoreState,
    from: pageState.scope,
  });

  function onChannelChange(
    callback: (channelName: string, oldChannelName: string | null) => void
  ) {
    let channelName: string | null = findChannelFromTwitchTvUrl(location.href);

    const NATIVE_PUSH_STATE = window.history.pushState;
    function pushState(
      data: any,
      unused: string,
      url?: string | URL | null | undefined
    ) {
      if (!url) return NATIVE_PUSH_STATE.call(window.history, data, unused);
      const fullUrl = toAbsoluteUrl(url.toString());
      const newChannelName = findChannelFromTwitchTvUrl(fullUrl);
      if (newChannelName != null && newChannelName !== channelName) {
        const oldChannelName = channelName;
        channelName = newChannelName;
        callback(channelName, oldChannelName);
      }
      return NATIVE_PUSH_STATE.call(window.history, data, unused, url);
    }
    window.history.pushState = pushState;

    const NATIVE_REPLACE_STATE = window.history.replaceState;
    function replaceState(
      data: any,
      unused: string,
      url?: string | URL | null | undefined
    ) {
      if (!url) return NATIVE_REPLACE_STATE.call(window.history, data, unused);
      const fullUrl = toAbsoluteUrl(url.toString());
      const newChannelName = findChannelFromTwitchTvUrl(fullUrl);
      if (newChannelName != null && newChannelName !== channelName) {
        const oldChannelName = channelName;
        channelName = newChannelName;
        callback(channelName, oldChannelName);
      }
      return NATIVE_REPLACE_STATE.call(window.history, data, unused, url);
    }
    window.history.replaceState = replaceState;

    window.addEventListener("popstate", () => {
      const newChannelName = findChannelFromTwitchTvUrl(location.href);
      if (newChannelName != null && newChannelName !== channelName) {
        const oldChannelName = channelName;
        channelName = newChannelName;
        callback(channelName, oldChannelName);
      }
    });
  }
  onChannelChange((_channelName, oldChannelName) => {
    sendMessageToContentScript({
      type: MessageType.ClearStats,
      channelName: oldChannelName,
    });
    sendMessageToPageScript({
      type: MessageType.ClearStats,
      channelName: oldChannelName,
    });
    sendMessageToWorkerScripts({
      type: MessageType.ClearStats,
      channelName: oldChannelName,
    });
  });

  runtime.state = "ready";
}
