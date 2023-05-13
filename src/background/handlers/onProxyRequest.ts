import { Proxy } from "webextension-polyfill";
import findChannelFromVideoWeaverUrl from "../../common/ts/findChannelFromVideoWeaverUrl";
import getHostFromUrl from "../../common/ts/getHostFromUrl";
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
  const isWhitelisted = (channelName: string) => {
    const whitelistedChannelsLower = store.state.whitelistedChannels.map(
      channel => channel.toLowerCase()
    );
    return whitelistedChannelsLower.includes(channelName.toLowerCase());
  };
  if (channelName != null && isWhitelisted(channelName)) {
    console.log(`✋ Channel ${channelName} is whitelisted.`);
    return { type: "direct" };
  }

  const proxies = store.state.proxies;
  const proxyInfoArray: ProxyInfo[] = proxies.map(host => {
    const [hostname, port] = host.split(":");
    return {
      type: "http",
      host: hostname,
      port: Number(port) ?? 3128,
    } as ProxyInfo;
  });
  console.log(
    `⌛ Proxying ${details.url} (${channelName ?? "unknown"}) through one of: ${
      proxies.toString() || "<empty>"
    }`
  );
  if (proxyInfoArray.length === 0) return { type: "direct" };
  return proxyInfoArray;
}
