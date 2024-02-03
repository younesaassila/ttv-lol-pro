import { twitchChannelNameRegex } from "./regexes";

/**
 * Returns the channel name from a Twitch.tv URL in lowercase.
 * Returns `null` if the URL is not a valid Twitch.tv URL.
 * @param twitchTvUrl
 * @returns
 */
export default function findChannelFromTwitchTvUrl(
  twitchTvUrl: string | undefined
): string | null {
  if (!twitchTvUrl) return null;
  const match = twitchChannelNameRegex.exec(twitchTvUrl);
  if (!match) return null;
  const [, channelName] = match;
  return channelName.toLowerCase();
}
