import { WebRequest } from "webextension-polyfill";
import findChannelFromVideoWeaverUrl from "../../common/ts/findChannelFromVideoWeaverUrl";
import getHostFromUrl from "../../common/ts/getHostFromUrl";
import {
  passportHostRegex,
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
    if (!proxy) {
      setStreamStatus(channelName, {
        proxied: false,
        reason: "Not proxied",
      });
      console.log(
        `❌ Did not proxy ${details.url} (${channelName ?? "unknown"})`
      );
      return;
    }
    setStreamStatus(channelName, {
      proxied: true,
      reason: `Proxied through ${proxy}`,
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

function setStreamStatus(
  channelName: string | null,
  streamStatus: StreamStatus
): boolean {
  if (!channelName) return false;
  store.state.streamStatuses[channelName] = streamStatus;
  return true;
}
