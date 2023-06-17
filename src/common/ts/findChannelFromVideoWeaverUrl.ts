import store from "../../store";

/**
 * Returns the channel name from a Video Weaver URL.
 * Returns `null` if the URL is not a valid Video Weaver URL.
 * @param videoWeaverUrl
 * @returns
 */
export default function findChannelFromVideoWeaverUrl(videoWeaverUrl: string) {
  const channelName = Object.keys(store.state.videoWeaverUrlsByChannel).find(
    channelName =>
      store.state.videoWeaverUrlsByChannel[channelName].includes(videoWeaverUrl)
  );
  return channelName ?? null;
}
