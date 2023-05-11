import { twitchWatchPageUrlRegex } from "../common/ts/regexes";
import store from "../store";

console.info("[TTV LOL PRO] 🚀 Content script running.");

if (store.readyState === "complete") clearErrors();
else store.addEventListener("load", clearErrors);

// Clear errors for stream on page load/reload.
function clearErrors() {
  const match = twitchWatchPageUrlRegex.exec(location.href);
  if (!match) return;
  const [, streamId] = match;
  if (!streamId) return;

  if (store.state.streamStatuses.hasOwnProperty(streamId)) {
    store.state.streamStatuses[streamId].errors = [];
  }
}
