import type { State } from "./types";

export default function getDefaultState() {
  return {
    servers: [],
    streamStatuses: {},
    videoWeaverUrlsByChannel: {},
    whitelistedChannels: [],
  } as State;
}
