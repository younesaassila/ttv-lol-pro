import { WebRequest } from "webextension-polyfill";
import getHostFromUrl from "../../common/ts/getHostFromUrl";
import { videoWeaverHostRegex } from "../../common/ts/regexes";
import { ProxyInfo } from "../../types";

export default function onHeadersReceived(
  details: WebRequest.OnHeadersReceivedDetailsType & {
    proxyInfo?: ProxyInfo;
  }
): void {
  // Filter to video-weaver responses.
  const host = getHostFromUrl(details.url);
  if (!host || !videoWeaverHostRegex.test(host)) return;

  const proxyInfo = details.proxyInfo; // Firefox only.
  if (!proxyInfo || proxyInfo.type === "direct")
    return console.log(`❌ Failed to proxy ${details.url}`);

  console.log(
    `✅ Proxied ${details.url} through ${proxyInfo.host}:${proxyInfo.port} (${proxyInfo.type})`
  );
}
