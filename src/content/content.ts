import pageScript from "url:../page/page.ts";
import workerScript from "url:../page/worker.ts";
import { twitchChannelNameRegex } from "../common/ts/regexes";
import store from "../store";

console.info("[TTV LOL PRO] 🚀 Content script running.");

if (store.readyState === "complete") onStoreReady();
else store.addEventListener("load", onStoreReady);

function onStoreReady() {
  // Clear stats for stream on page load/reload.
  clearStats();
  // Inject page script into page.
  injectScript(pageScript);
}

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

function injectScript(src: string) {
  // From https://stackoverflow.com/a/9517879
  const script = document.createElement("script");
  script.src = src;
  // TODO: Find a better way to pass data to the script, preferably hidden from page.
  script.dataset.params = JSON.stringify({
    proxyTwitchWebpage: store.state.proxyTwitchWebpage,
    workerScriptURL: workerScript,
  });
  script.onload = () => script.remove();
  // Note: Despite what the TS types say, `document.head` can be `null`.
  (document.head || document.documentElement).append(script);
}
