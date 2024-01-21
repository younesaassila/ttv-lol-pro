import type { State } from "./types";

export default function getDefaultState() {
  const state: State = {
    adLog: [],
    adLogEnabled: true,
    adLogLastSent: 0,
    anonymousMode: true,
    chromiumProxyActive: false,
    dnsResponses: [],
    normalProxies: [],
    openedTwitchTabs: [],
    optimizedProxies: ["firefox.api.cdn-perfprod.com:2023"],
    optimizedProxiesEnabled: true,
    passportLevel: 0,
    streamStatuses: {},
    videoWeaverUrlsByChannel: {},
    whitelistedChannels: [],
  };
  return state;
}
