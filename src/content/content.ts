import log from "../common/ts/log";
import { TWITCH_URL_REGEX } from "../common/ts/regexes";
import store from "../store";

log("🚀 Content script running.");

if (store.readyState === "complete") clearErrors();
else store.addEventListener("load", clearErrors);

// Clear errors for stream on page load/reload.
function clearErrors() {
  const match = TWITCH_URL_REGEX.exec(location.href);
  if (!match) return;
  const [, streamId] = match;
  if (!streamId) return;

  if (store.state.streamStatuses.hasOwnProperty(streamId)) {
    store.state.streamStatuses[streamId].errors = [];
  }
}
