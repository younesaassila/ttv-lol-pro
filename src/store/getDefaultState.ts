import type { State } from "./types";

export default function getDefaultState() {
  return {
    ignoredChannelSubscriptions: [], // Some channels might show ads even if you're subscribed to them.
    servers: [],
    streamStatuses: {},
    videoWeaverUrlsByChannel: {},
    whitelistedChannels: [],
  } as State;
}
