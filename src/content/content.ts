import store from "../store";

store.addEventListener("load", () => {
  const twitchUrlRegex =
    /^https?:\/\/(?:www\.)?twitch\.tv\/(?:videos\/)?([a-z0-9-_]+)/gi;

  const match = twitchUrlRegex.exec(location.href);
  if (match == null) return;

  const [_, streamId] = match;
  if (streamId == null) return;

  if (store.state.streamStatuses[streamId] != null) {
    console.log(`${streamId}: Status errors have been reset`);
    store.state.streamStatuses[streamId].errors = [];
  }
});
