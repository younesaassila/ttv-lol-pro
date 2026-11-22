import isChromium from "../common/ts/isChromium";
import type { State } from "./types";

export default function getDefaultState() {
  const state: State = {
    activeChannelSubscriptions: [],
    adLog: [],
    adLogEnabled: true,
    adLogLastSent: 0,
    allowOtherProxyProtocols: false,
    anonymousMode: true,
    chromiumProxyActive: false,
    completedSetupVersion: 0,
    customPassport: {
      passport: false,
      usher: false,
      videoWeaver: false,
      graphQLToken: false,
      graphQLIntegrity: false,
      graphQLAll: false,
      twitchWebpage: false,
    },
    customPassportEnabled: false,
    dnsResponses: [],
    dnsServer: "https://cloudflare-dns.com/dns-query",
    lastStoreCleanupTimestamp: 0,
    normalProxies: getDefaultNormalProxies(),
    openedTwitchTabs: [],
    optimizedProxies: getDefaultOptimizedProxies(),
    optimizedProxiesEnabled: true,
    passportLevel: 0,
    streamStatuses: {},
    userExperienceMode: "blockAds",
    userExperienceOverridenOptions: {},
    videoWeaverUrlsByChannel: {},
    whitelistChannelSubscriptions: true,
    whitelistedChannels: [],
  };
  return state;
}

function getDefaultNormalProxies(): string[] {
  const normalProxies: string[] = [];
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_NORMAL_PROXIES
  ) {
    normalProxies.unshift(
      ...process.env.DEV_NORMAL_PROXIES.split(",")
        .map(s => s.trim())
        .filter(s => !!s)
    );
  }
  return normalProxies;
}

function getDefaultOptimizedProxies(): string[] {
  const optimizedProxies: string[] = isChromium
    ? ["chromium.api.cdn-perfprod.com:2023"]
    : ["firefox.api.cdn-perfprod.com:2023"];
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_OPTIMIZED_PROXIES
  ) {
    optimizedProxies.unshift(
      ...process.env.DEV_OPTIMIZED_PROXIES.split(",")
        .map(s => s.trim())
        .filter(s => !!s)
    );
  }
  return optimizedProxies;
}
