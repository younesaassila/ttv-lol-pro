import type { State } from "./types";

export default function getDefaultState() {
  return {
    proxies: [
      "stable.ttvlolpro.perfprod.com:8019",
      "asia.ttvlolpro.perfprod.com:9019",
    ],
    streamStatuses: {},
    videoWeaverUrlsByChannel: {},
    whitelistedChannels: [],
  } as State;
}
