import pageScriptURL from "url:../page/page.ts";
import workerScriptURL from "url:../page/worker.ts";
import browser, { Storage } from "webextension-polyfill";
import findChannelFromTwitchTvUrl from "../common/ts/findChannelFromTwitchTvUrl";
import isChromium from "../common/ts/isChromium";
import { getStreamStatus, setStreamStatus } from "../common/ts/streamStatus";
import store from "../store";
import { MessageType } from "../types";

console.info("[TTV LOL PRO] 🚀 Content script running.");

if (isChromium) injectPageScript();
// Firefox uses FilterResponseData to inject the page script.

if (store.readyState === "complete") onStoreReady();
else store.addEventListener("load", onStoreReady);

browser.runtime.onMessage.addListener(onBackgroundMessage);
window.addEventListener("message", onPageMessage);

function injectPageScript() {
  // From https://stackoverflow.com/a/9517879
  const script = document.createElement("script");
  script.src = pageScriptURL; // src/page/page.ts
  script.dataset.params = JSON.stringify({
    isChromium,
    workerScriptURL, // src/page/worker.ts
  });
  script.onload = () => script.remove();
  // ---------------------------------------
  // 🦊 Attention Firefox Addon Reviewer 🦊
  // ---------------------------------------
  // Please note that this does NOT involve remote code execution. The injected scripts are bundled
  // with the extension. The `url:` imports above are used to get the runtime URLs of the respective scripts.
  // Additionally, there is no custom Content Security Policy (CSP) in use.
  (document.head || document.documentElement).prepend(script); // Note: Despite what the TS types say, `document.head` can be `null`.
}

function onStoreReady() {
  // Clear stats for stream on page load/reload.
  clearStats();
}

/**
 * Clear stats for stream on page load/reload.
 * @returns
 */
function clearStats() {
  const channelName = findChannelFromTwitchTvUrl(location.href);
  if (!channelName) return;

  if (store.state.streamStatuses.hasOwnProperty(channelName)) {
    store.state.streamStatuses[channelName].stats = {
      proxied: 0,
      notProxied: 0,
    };
  }
  console.log(`[TTV LOL PRO] 📊 Stats cleared for channel: ${channelName}`);
}

function onBackgroundMessage(message: any) {
  switch (message.type) {
    case MessageType.EnableFullModeResponse:
      window.postMessage({
        type: MessageType.PageScriptMessage,
        message,
      });
      window.postMessage({
        type: MessageType.WorkerScriptMessage,
        message,
      });
      break;
  }
}

function onPageMessage(event: MessageEvent) {
  if (event.data?.type !== MessageType.ContentScriptMessage) return;

  const message = event.data?.message;
  if (!message) return;

  switch (message.type) {
    case MessageType.GetStoreState:
      const sendStoreState = () => {
        window.postMessage({
          type: MessageType.PageScriptMessage,
          message: {
            type: MessageType.GetStoreStateResponse,
            state: JSON.parse(JSON.stringify(store.state)),
          },
        });
      };
      if (store.readyState === "complete") sendStoreState();
      else store.addEventListener("load", sendStoreState);
      break;
    case MessageType.EnableFullMode:
      // Send message to background script to update proxy settings.
      browser.runtime.sendMessage({
        type: MessageType.EnableFullMode,
      });
      break;
    case MessageType.UsherResponse:
      const { channel, videoWeaverUrls, proxyCountry } = message;
      // Update Video Weaver URLs.
      store.state.videoWeaverUrlsByChannel[channel] = [
        ...(store.state.videoWeaverUrlsByChannel[channel] ?? []),
        ...videoWeaverUrls,
      ];
      // Update proxy country.
      const streamStatus = getStreamStatus(channel);
      setStreamStatus(channel, {
        ...(streamStatus ?? { proxied: false, reason: "" }),
        proxyCountry,
      });
      break;
    case MessageType.ClearStats:
      clearStats();
      break;
  }
}

store.addEventListener(
  "change",
  (changes: Record<string, Storage.StorageChange>) => {
    const changedKeys = Object.keys(changes);
    if (changedKeys.length === 1 && changedKeys[0] === "streamStatuses") return;
    console.log("[TTV LOL PRO] 📦 Store changed.");
    window.postMessage({
      type: MessageType.PageScriptMessage,
      message: {
        type: MessageType.GetStoreStateResponse,
        state: JSON.parse(JSON.stringify(store.state)),
      },
    });
  }
);
