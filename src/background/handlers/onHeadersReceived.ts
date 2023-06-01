import { WebRequest } from "webextension-polyfill";
import findChannelFromVideoWeaverUrl from "../../common/ts/findChannelFromVideoWeaverUrl";
import getHostFromUrl from "../../common/ts/getHostFromUrl";
import {
  passportHostRegex,
  twitchGqlHostRegex,
  usherHostRegex,
  videoWeaverHostRegex,
} from "../../common/ts/regexes";
import store from "../../store";
import type { ProxyInfo, StreamStatus } from "../../types";

export default function onHeadersReceived(
  details: WebRequest.OnHeadersReceivedDetailsType & {
    proxyInfo?: ProxyInfo;
  }
): void | WebRequest.BlockingResponseOrPromise {
  const host = getHostFromUrl(details.url);
  if (!host) return;

  const proxy = getProxyFromDetails(details);

  // Twitch webpage requests.
  if (store.state.proxyTwitchWebpage && host === "www.twitch.tv") {
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
    if (!proxy) {
      let reason = "Not proxied";
      if (streamStatus?.stats != null) {
        streamStatus.stats.notProxied++;
        reason = `Not proxied (Proxied: ${streamStatus.stats.proxied} | Not proxied: ${streamStatus.stats.notProxied})`;
      }
      setStreamStatus(channelName, {
        proxied: false,
        reason: reason,
        stats: streamStatus?.stats ?? { proxied: 0, notProxied: 1 },
      });
      console.log(
        `❌ Did not proxy ${details.url} (${channelName ?? "unknown"})`
      );
      return;
    }
    let reason = `Proxied through ${proxy}`;
    if (streamStatus?.stats != null) {
      streamStatus.stats.proxied++;
      reason = `Proxied through ${proxy} (Proxied: ${streamStatus.stats.proxied} | Not proxied: ${streamStatus.stats.notProxied})`;
    }
    setStreamStatus(channelName, {
      proxied: true,
      reason: reason,
      stats: streamStatus?.stats ?? { proxied: 1, notProxied: 0 },
    });
    console.log(
      `✅ Proxied ${details.url} (${channelName ?? "unknown"}) through ${proxy}`
    );
  }
}

function getProxyFromDetails(
  details: WebRequest.OnHeadersReceivedDetailsType & {
    proxyInfo?: ProxyInfo;
  }
): string | null {
  const proxyInfo = details.proxyInfo; // Firefox only.
  if (!proxyInfo || proxyInfo.type === "direct") return null;
  return `${proxyInfo.host}:${proxyInfo.port}`;
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
