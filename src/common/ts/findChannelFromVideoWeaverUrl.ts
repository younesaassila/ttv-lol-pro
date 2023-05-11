import store from "../../store";

export default function findChannelFromVideoWeaverUrl(videoWeaverUrl: string) {
  const channelName = Object.keys(store.state.videoWeaverUrlsByChannel).find(
    channelName =>
      store.state.videoWeaverUrlsByChannel[channelName].includes(videoWeaverUrl)
  );
  return channelName ?? null;
}
