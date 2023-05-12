import { WebRequest } from "webextension-polyfill";
import findChannelFromVideoWeaverUrl from "../../common/ts/findChannelFromVideoWeaverUrl";
import getHostFromUrl from "../../common/ts/getHostFromUrl";
import { videoWeaverHostRegex } from "../../common/ts/regexes";
import store from "../../store";
import { ProxyInfo, StreamStatus } from "../../types";

export default function onHeadersReceived(
  details: WebRequest.OnHeadersReceivedDetailsType & {
    proxyInfo?: ProxyInfo;
  }
): void | WebRequest.BlockingResponseOrPromise {
  // Filter to video-weaver responses.
  const host = getHostFromUrl(details.url);
  if (!host || !videoWeaverHostRegex.test(host)) return;

  const channelName = findChannelFromVideoWeaverUrl(details.url);

  const proxyInfo = details.proxyInfo; // Firefox only.
  if (!proxyInfo || proxyInfo.type === "direct") {
    setStreamStatus(channelName, {
      proxied: false,
      reason: "Not proxied",
      errors: [],
    });
    return console.log(
      `❌ Did not proxy ${details.url} (${channelName ?? "unknown"})`
    );
  }

  console.log(
    `✅ Proxied ${details.url} (${channelName ?? "unknown"}) through ${
      proxyInfo.host
    }:${proxyInfo.port}`
  );

  setStreamStatus(channelName, {
    proxied: true,
    reason: `Proxied through ${proxyInfo.host}:${proxyInfo.port}`,
    errors: [],
  });
}

function setStreamStatus(
  channelName: string | null,
  streamStatus: StreamStatus
): boolean {
  if (!channelName) return false;
  store.state.streamStatuses[channelName] = streamStatus;
  return true;
}
