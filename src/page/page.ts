import findChannelFromTwitchTvUrl from "../common/ts/findChannelFromTwitchTvUrl";
import { MessageType } from "../types";
import { getFetch } from "./getFetch";
import type { FetchOptions } from "./types";

console.info("[TTV LOL PRO] 🚀 Page script running.");

const params = JSON.parse(document.currentScript!.dataset.params!);
const fetchOptions: FetchOptions = {
  scope: "page",
  shouldWaitForStore: params.isChromium === false,
};

const NATIVE_WORKER = window.Worker;

window.fetch = getFetch(fetchOptions);

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
        window.postMessage(event.data.message);
      }
    });
    fetchOptions.twitchWorker = this;
  }
};

window.addEventListener("message", event => {
  if (event.data?.type === MessageType.PageScriptMessage) {
    const message = event.data.message;
    if (message.type === MessageType.StoreReady) {
      console.log(
        "[TTV LOL PRO] 📦 Page received store state from content script."
      );
      // Mutate the options object.
      fetchOptions.state = message.state;
      fetchOptions.shouldWaitForStore = false;
    }
  }
});

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
  window.postMessage({ type: MessageType.ClearStats });
  fetchOptions.twitchWorker?.postMessage({ type: MessageType.ClearStats });
});

document.currentScript!.remove();
