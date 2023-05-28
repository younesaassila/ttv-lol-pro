import type { State } from "./types";

export default function getDefaultState() {
  return {
    adLog: [],
    adLogEnabled: true,
    adLogLastSent: 0,
    proxyTwitchWebpage: false,
    proxyUsherRequests: true,
    streamStatuses: {},
    videoWeaverProxies: ["dev.ttvlolpro.perfprod.com:2023"],
    videoWeaverUrlsByChannel: {},
    whitelistedChannels: [],
  } as State;
}
