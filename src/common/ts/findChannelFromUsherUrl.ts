import { twitchApiChannelNameRegex } from "./regexes";

/**
 * Returns the channel name from a Twitch Usher URL.
 * Returns `null` if the URL is not a valid Usher URL.
 * @param usherUrl
 * @returns
 */
export default function findChannelFromUsherUrl(
  usherUrl: string
): string | null {
  const match = twitchApiChannelNameRegex.exec(usherUrl);
  if (!match) return null;
  const [, channelName] = match;
  return channelName;
}
