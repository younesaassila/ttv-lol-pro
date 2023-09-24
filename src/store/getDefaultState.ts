import isChromium from "../common/ts/isChromium";
import type { State } from "./types";

export default function getDefaultState() {
  const state: State = {
    adLog: [],
    adLogEnabled: true,
    adLogLastSent: 0,
    chromiumProxyActive: false,
    dnsResponses: [],
    normalProxies: ["chrome.api.cdn-perfprod.com:4023"],
    openedTwitchTabs: [],
    optimizedProxies: isChromium ? [] : ["firefox.api.cdn-perfprod.com:2023"],
    optimizedProxiesEnabled: !isChromium,
    proxyTwitchWebpage: false,
    proxyUsherRequests: true,
    streamStatuses: {},
    videoWeaverUrlsByChannel: {},
    whitelistedChannels: [],
  };
  return state;
}
