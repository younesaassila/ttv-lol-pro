import { TWITCH_URL_REGEX } from "../common/ts/regexes";
import store from "../store";

store.addEventListener("load", () => {
  const match = TWITCH_URL_REGEX.exec(location.href);
  if (match == null) return;
  const [_, streamId] = match;
  if (streamId == null) return;

  if (store.state.streamStatuses[streamId] != null) {
    // Clear errors for stream on page load/reload.
    store.state.streamStatuses[streamId].errors = [];
  }
});
