import { twitchApiChannelNameRegex } from "./regexes";

export default function findChannelFromUsherUrl(
  usherUrl: string
): string | null {
  const match = twitchApiChannelNameRegex.exec(usherUrl);
  if (!match) return null;
  const [, channelName] = match;
  return channelName;
}
