import type { State } from "./types";

export default function getDefaultState() {
  return {
    adLog: [],
    adLogEnabled: true,
    adLogLastSent: 0,
    proxyUsherRequests: false,
    streamStatuses: {},
    usherProxies: ["stable.ttvlolpro.perfprod.com:8019"],
    videoWeaverProxies: ["stable.ttvlolpro.perfprod.com:8019"],
    videoWeaverUrlsByChannel: {},
    whitelistedChannels: [],
  } as State;
}
