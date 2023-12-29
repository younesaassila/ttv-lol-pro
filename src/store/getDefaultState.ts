import isChromium from "../common/ts/isChromium";
import type { State } from "./types";

export default function getDefaultState() {
  const state: State = {
    adLog: [],
    adLogEnabled: true,
    adLogLastSent: 0,
    anonymousMode: false,
    chromiumProxyActive: false,
    dnsResponses: [],
    normalProxies: [],
    openedTwitchTabs: [],
    optimizedProxies: isChromium
      ? ["chrome.api.cdn-perfprod.com:4023"]
      : ["firefox.api.cdn-perfprod.com:2023"],
    optimizedProxiesEnabled: !isChromium,
    passportLevel: isChromium ? 0 : 1,
    streamStatuses: {},
    videoWeaverUrlsByChannel: {},
    whitelistedChannels: [],
  };
  return state;
}
