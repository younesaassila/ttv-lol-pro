import store from "../../store";

export default function isChannelWhitelisted(
  channelName: string | null
): boolean {
  if (!channelName) return false;
  const whitelistedChannelsLower = store.state.whitelistedChannels.map(
    channel => channel.toLowerCase()
  );
  return whitelistedChannelsLower.includes(channelName.toLowerCase());
}
