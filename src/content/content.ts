import { TWITCH_URL_REGEX } from "../common/ts/regexes";
import store from "../store";

store.addEventListener("load", () => {
  const match = TWITCH_URL_REGEX.exec(location.href);
  if (!match) return;
  const [, streamId] = match;
  if (!streamId) return;

  if (store.state.streamStatuses[streamId]) {
    // Clear errors for stream on page load/reload.
    store.state.streamStatuses[streamId].errors = [];
  }
});
