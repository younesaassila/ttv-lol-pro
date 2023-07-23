import pageScriptURL from "url:../page/page.ts";
import workerScriptURL from "url:../page/worker.ts";
import { twitchChannelNameRegex } from "../common/ts/regexes";
import { getStreamStatus, setStreamStatus } from "../common/ts/streamStatus";
import store from "../store";

console.info("[TTV LOL PRO] 🚀 Content script running.");

injectPageScript();

if (store.readyState === "complete") clearStats();
else store.addEventListener("load", clearStats);

window.addEventListener("message", onMessage);

function injectPageScript() {
  // From https://stackoverflow.com/a/9517879
  const script = document.createElement("script");
  script.src = pageScriptURL; // src/page/page.ts
  script.dataset.params = JSON.stringify({
    workerScriptURL: workerScriptURL, // src/page/worker.ts
  });
  script.onload = () => script.remove();
  // ---------------------------------------
  // 🦊 Attention Firefox Addon Reviewer 🦊
  // ---------------------------------------
  // Please note that this does NOT involve remote code execution. The injected scripts are bundled
  // with the extension. The `url:` imports above are used to get the runtime URLs of the respective scripts.
  // Additionally, there is no custom Content Security Policy (CSP) in use.
  (document.head || document.documentElement).append(script); // Note: Despite what the TS types say, `document.head` can be `null`.
}

/**
 * Clear stats for stream on page load/reload.
 * @returns
 */
function clearStats() {
  const match = twitchChannelNameRegex.exec(location.href);
  if (!match) return;
  const [, streamId] = match;
  if (!streamId) return;

  if (store.state.streamStatuses.hasOwnProperty(streamId)) {
    store.state.streamStatuses[streamId].stats = {
      proxied: 0,
      notProxied: 0,
    };
  }
}

function onMessage(event: MessageEvent) {
  if (event.source !== window) return;
  if (event.data?.type === "UsherResponse") {
    const { channel, videoWeaverUrls, proxyCountry } = event.data;
    // Update Video Weaver URLs.
    if (store.state.videoWeaverUrlsByChannel.hasOwnProperty(channel)) {
      store.state.videoWeaverUrlsByChannel.push(videoWeaverUrls);
    } else {
      store.state.videoWeaverUrlsByChannel[channel] = videoWeaverUrls;
    }
    // Update proxy country.
    const streamStatus = getStreamStatus(channel);
    setStreamStatus(channel, {
      ...(streamStatus ?? { proxied: false, reason: "" }),
      proxyCountry,
    });
  }
}
