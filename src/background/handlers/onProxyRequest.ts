import { Proxy } from "webextension-polyfill";
import findChannelFromVideoWeaverUrl from "../../common/ts/findChannelFromVideoWeaverUrl";
import getHostFromUrl from "../../common/ts/getHostFromUrl";
import isChannelWhitelisted from "../../common/ts/isChannelWhitelisted";
import { videoWeaverHostRegex } from "../../common/ts/regexes";
import store from "../../store";
import type { ProxyInfo } from "../../types";

export default function onProxyRequest(
  details: Proxy.OnRequestDetailsType
): ProxyInfo | ProxyInfo[] | Promise<ProxyInfo | ProxyInfo[]> {
  // Filter to video-weaver requests.
  const host = getHostFromUrl(details.url);
  if (!host || !videoWeaverHostRegex.test(host)) return { type: "direct" };

  // Check if the channel is whitelisted.
  const channelName = findChannelFromVideoWeaverUrl(details.url);
  if (isChannelWhitelisted(channelName)) {
    console.log(`✋ Channel ${channelName} is whitelisted.`);
    return { type: "direct" };
  }

  const proxies = store.state.proxies;
  const proxyInfoArray: ProxyInfo[] = [
    ...proxies.map(host => {
      const [hostname, port] = host.split(":");
      return {
        type: "http",
        host: hostname,
        port: Number(port) ?? 3128,
      } as ProxyInfo;
    }),
    { type: "direct" } as ProxyInfo,
  ];
  console.log(
    `⌛ Proxying ${details.url} (${channelName ?? "unknown"}) through one of: ${
      proxies.toString() || "<empty>"
    }`
  );
  return proxyInfoArray;
}
