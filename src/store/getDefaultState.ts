import isChromium from "../common/ts/isChromium";
import type { State } from "./types";

export default function getDefaultState() {
  return {
    adLog: [],
    adLogEnabled: true,
    adLogLastSent: 0,
    normalProxies: isChromium ? ["chrome.api.cdn-perfprod.com:4023"] : [],
    optimizedProxies: isChromium ? [] : ["firefox.api.cdn-perfprod.com:2023"],
    optimizedProxiesEnabled: !isChromium,
    proxyTwitchWebpage: false,
    proxyUsherRequests: true,
    streamStatuses: {},
    videoWeaverUrlsByChannel: {},
    whitelistedChannels: [],
  } as State;
}
