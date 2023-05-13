import type { State } from "./types";

export default function getDefaultState() {
  return {
    proxies: [],
    streamStatuses: {},
    videoWeaverUrlsByChannel: {},
    whitelistedChannels: [],
  } as State;
}
