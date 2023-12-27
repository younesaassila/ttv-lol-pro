import findChannelFromTwitchTvUrl from "../common/ts/findChannelFromTwitchTvUrl";
import { MessageType } from "../types";
import { getFetch } from "./getFetch";
import type { FetchOptions } from "./types";

console.info("[TTV LOL PRO] 🚀 Page script running.");

const params = JSON.parse(document.currentScript!.dataset.params!);
const fetchOptions: FetchOptions = {
  scope: "page",
  shouldWaitForStore: params.isChromium === false,
  twitchWorker: undefined,
};

window.fetch = getFetch(fetchOptions);

const NATIVE_WORKER = window.Worker;
window.Worker = class Worker extends NATIVE_WORKER {
  constructor(scriptURL: string | URL, options?: WorkerOptions) {
    const isTwitchWorker = scriptURL.toString().includes("twitch.tv");
    if (!isTwitchWorker) {
      super(scriptURL, options);
      return;
    }
    const url = scriptURL.toString();
    let script = "";
    // Fetch Twitch's script, since Firefox Nightly errors out when trying to
    // import a blob URL directly.
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.send();
    if (200 <= xhr.status && xhr.status < 300) {
      script = xhr.responseText;
    } else {
      console.warn(
        `[TTV LOL PRO] ❌ Failed to fetch script: ${xhr.statusText}`
      );
      script = `importScripts("${url}");`; // Will fail on Firefox Nightly.
    }
    // ---------------------------------------
    // 🦊 Attention Firefox Addon Reviewer 🦊
    // ---------------------------------------
    // Please note that this does NOT involve remote code execution. The injected script is bundled
    // with the extension. Additionally, there is no custom Content Security Policy (CSP) in use.
    const newScript = `
      try {
        importScripts("${params.workerScriptURL}");
      } catch {
        console.error("[TTV LOL PRO] ❌ Failed to load worker script: ${params.workerScriptURL}");
      }
      ${script}
    `;
    const newScriptURL = URL.createObjectURL(
      new Blob([newScript], { type: "text/javascript" })
    );
    super(newScriptURL, options);
    this.addEventListener("message", event => {
      if (
        event.data?.type === MessageType.ContentScriptMessage ||
        event.data?.type === MessageType.PageScriptMessage
      ) {
        window.postMessage(event.data);
      }
    });
    fetchOptions.twitchWorker = this;
  }
};

window.addEventListener("message", event => {
  if (event.data?.type !== MessageType.PageScriptMessage) return;

  const message = event.data?.message;
  if (!message) return;

  switch (message.type) {
    case MessageType.GetStoreStateResponse:
      console.log("[TTV LOL PRO] Received store state from content script.");
      const state = message.state;
      fetchOptions.state = state;
      fetchOptions.shouldWaitForStore = false;
      sendMessageToWorkerScript({
        type: MessageType.GetStoreStateResponse,
        state,
      });
      break;
  }
});

function sendMessageToContentScript(message: any) {
  window.postMessage({
    type: MessageType.ContentScriptMessage,
    message,
  });
}

function sendMessageToWorkerScript(message: any) {
  fetchOptions.twitchWorker?.postMessage({
    type: MessageType.WorkerScriptMessage,
    message,
  });
}

sendMessageToContentScript({ type: MessageType.GetStoreState });

function toAbsoluteUrl(url: string) {
  try {
    const Url = new URL(url, location.href);
    return Url.href;
  } catch {
    return url;
  }
}

function onChannelChange(callback: (channelName: string) => void) {
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
    // TODO: Check on m.twitch.tv if miniplayer is a thing too. -> It's not!!!!
    if (newChannelName != null && newChannelName !== channelName) {
      channelName = newChannelName;
      callback(channelName);
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
      channelName = newChannelName;
      callback(channelName);
    }
    return NATIVE_REPLACE_STATE.call(window.history, data, unused, url);
  }
  window.history.replaceState = replaceState;

  window.addEventListener("popstate", () => {
    const newChannelName = findChannelFromTwitchTvUrl(location.href);
    if (newChannelName != null && newChannelName !== channelName) {
      channelName = newChannelName;
      callback(channelName);
    }
  });
}

onChannelChange(() => {
  sendMessageToContentScript({ type: MessageType.ClearStats });
  sendMessageToWorkerScript({ type: MessageType.ClearStats });
});

document.currentScript!.remove();
