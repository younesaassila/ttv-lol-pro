import { WebRequest } from "webextension-polyfill";
import findChannelFromVideoWeaverUrl from "../../common/ts/findChannelFromVideoWeaverUrl";
import getHostFromUrl from "../../common/ts/getHostFromUrl";
import getProxyInfoFromUrl from "../../common/ts/getProxyInfoFromUrl";
import isChromium from "../../common/ts/isChromium";
import {
  passportHostRegex,
  twitchGqlHostRegex,
  twitchTvHostRegex,
  usherHostRegex,
  videoWeaverHostRegex,
} from "../../common/ts/regexes";
import store from "../../store";
import type { ProxyInfo, StreamStatus } from "../../types";

export default function onResponseStarted(
  details: WebRequest.OnResponseStartedDetailsType & {
    proxyInfo?: ProxyInfo;
  }
): void {
  const host = getHostFromUrl(details.url);
  if (!host) return;

  const proxy = getProxyFromDetails(details);

  // Twitch webpage requests.
  if (store.state.proxyTwitchWebpage && twitchTvHostRegex.test(host)) {
    if (!proxy) return console.log(`❌ Did not proxy ${details.url}`);
    console.log(`✅ Proxied ${details.url} through ${proxy}`);
  }

  // Twitch GraphQL requests.
  if (store.state.proxyTwitchWebpage && twitchGqlHostRegex.test(host)) {
    if (!proxy && store.state.optimizedProxiesEnabled) return; // Expected for most requests.
    if (!proxy) return console.log(`❌ Did not proxy ${details.url}`);
    console.log(`✅ Proxied ${details.url} through ${proxy}`);
  }

  // Passport & Usher requests.
  if (
    store.state.proxyUsherRequests &&
    (passportHostRegex.test(host) || usherHostRegex.test(host))
  ) {
    if (!proxy) return console.log(`❌ Did not proxy ${details.url}`);
    console.log(`✅ Proxied ${details.url} through ${proxy}`);
  }

  // Video-weaver requests.
  if (videoWeaverHostRegex.test(host)) {
    const channelName = findChannelFromVideoWeaverUrl(details.url);
    const streamStatus = getStreamStatus(channelName);
    const stats = streamStatus?.stats ?? { proxied: 0, notProxied: 0 };
    if (!proxy) {
      stats.notProxied++;
      setStreamStatus(channelName, {
        proxied: false,
        proxyHost: streamStatus?.proxyHost ? streamStatus.proxyHost : undefined,
        proxyCountry: streamStatus?.proxyCountry,
        reason: `Proxied: ${stats.proxied} | [Not proxied]: ${stats.notProxied}`,
        stats,
      });
      console.log(
        `❌ Did not proxy ${details.url} (${channelName ?? "unknown"})`
      );
      return;
    }
    stats.proxied++;
    setStreamStatus(channelName, {
      proxied: true,
      proxyHost: proxy,
      proxyCountry: streamStatus?.proxyCountry,
      reason: `[Proxied]: ${stats.proxied} | Not proxied: ${stats.notProxied}`,
      stats,
    });
    console.log(
      `✅ Proxied ${details.url} (${channelName ?? "unknown"}) through ${proxy}`
    );
  }
}

function getProxyFromDetails(
  details: WebRequest.OnResponseStartedDetailsType & {
    proxyInfo?: ProxyInfo;
  }
): string | null {
  if (isChromium) {
    const ip = details.ip;
    if (!ip) return null;
    const dnsResponse = store.state.dnsResponses.find(
      dnsResponse => dnsResponse.ips.indexOf(ip) !== -1
    );
    if (!dnsResponse) return null;
    const proxies = [
      ...store.state.optimizedProxies,
      ...store.state.normalProxies,
    ];
    const proxyInfoArray = proxies.map(getProxyInfoFromUrl);
    const possibleProxies = proxyInfoArray.filter(
      proxy => proxy.host === dnsResponse.host
    );
    if (possibleProxies.length === 1)
      return `${possibleProxies[0].host}:${possibleProxies[0].port}`;
    return dnsResponse.host;
  } else {
    const proxyInfo = details.proxyInfo; // Firefox only.
    if (!proxyInfo || proxyInfo.type === "direct") return null;
    return `${proxyInfo.host}:${proxyInfo.port}`;
  }
}

function getStreamStatus(channelName: string | null): StreamStatus | null {
  if (!channelName) return null;
  return store.state.streamStatuses[channelName] ?? null;
}

function setStreamStatus(
  channelName: string | null,
  streamStatus: StreamStatus
): boolean {
  if (!channelName) return false;
  store.state.streamStatuses[channelName] = streamStatus;
  return true;
}
