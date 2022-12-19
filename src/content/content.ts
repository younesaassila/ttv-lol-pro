import { TWITCH_URL_REGEX } from "../common/ts/regexes";
import store from "../store";

if (store.readyState === "complete") main();
else store.addEventListener("load", main);

function main() {
  const match = TWITCH_URL_REGEX.exec(location.href);
  if (!match) return;
  const [, streamId] = match;
  if (!streamId) return;

  if (store.state.streamStatuses.hasOwnProperty(streamId)) {
    // Clear errors for stream on page load/reload.
    store.state.streamStatuses[streamId].errors = [];
  }
}
