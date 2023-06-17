import store from "../../store";
import { twitchApiChannelNameRegex } from "./regexes";

/**
 * Returns the channel name from a Twitch Usher URL.
 * Returns `null` if the URL is not a valid Usher URL.
 * @param usherUrl
 * @returns
 */
export function findChannelFromUsherUrl(usherUrl: string): string | null {
  const match = twitchApiChannelNameRegex.exec(usherUrl);
  if (!match) return null;
  const [, channelName] = match;
  return channelName;
}

/**
 * Returns the channel name from a Video Weaver URL.
 * Returns `null` if the URL is not a valid Video Weaver URL.
 * @param videoWeaverUrl
 * @returns
 */
export function findChannelFromVideoWeaverUrl(videoWeaverUrl: string) {
  const channelName = Object.keys(store.state.videoWeaverUrlsByChannel).find(
    channelName =>
      store.state.videoWeaverUrlsByChannel[channelName].includes(videoWeaverUrl)
  );
  return channelName ?? null;
}
