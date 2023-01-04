import pageScript from "url:../page/page.ts";
import log from "../common/ts/log";
import { TWITCH_URL_REGEX } from "../common/ts/regexes";
import store from "../store";

log("Content script running.");

if (store.readyState === "complete") onStoreReady();
else store.addEventListener("load", onStoreReady);

function onStoreReady() {
  // Clear errors for stream on page load/reload.
  clearErrors();
  // Inject page script into page.
  if (store.state.resetPlayerOnMidroll) {
    if (document.readyState === "complete") injectPageScript();
    else document.addEventListener("DOMContentLoaded", injectPageScript);
  }
}

function clearErrors() {
  const match = TWITCH_URL_REGEX.exec(location.href);
  if (!match) return;
  const [, streamId] = match;
  if (!streamId) return;

  if (store.state.streamStatuses.hasOwnProperty(streamId)) {
    store.state.streamStatuses[streamId].errors = [];
  }
}

function injectPageScript() {
  // From https://stackoverflow.com/a/9517879
  const script = document.createElement("script");
  script.src = pageScript;
  script.onload = () => script.remove();
  document.head.append(script);
}
