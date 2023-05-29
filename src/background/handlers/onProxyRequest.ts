import { Proxy } from "webextension-polyfill";
import findChannelFromVideoWeaverUrl from "../../common/ts/findChannelFromVideoWeaverUrl";
import getHostFromUrl from "../../common/ts/getHostFromUrl";
import isChannelWhitelisted from "../../common/ts/isChannelWhitelisted";
import isFlaggedRequest from "../../common/ts/isFlaggedRequest";
import { passportHostRegex, usherHostRegex } from "../../common/ts/regexes";
import store from "../../store";
import type { ProxyInfo } from "../../types";

export default async function onProxyRequest(
  details: Proxy.OnRequestDetailsType
): Promise<ProxyInfo | ProxyInfo[]> {
  const host = getHostFromUrl(details.url);
  if (!host) return { type: "direct" };

  // Wait for the store to be ready.
  if (store.readyState !== "complete") {
    await new Promise(resolve => {
      const listener = () => {
        store.removeEventListener("load", listener);
        resolve(onProxyRequest(details));
      };
      store.addEventListener("load", listener);
    });
  }

  // Twitch webpage requests.
  if (
    store.state.proxyTwitchWebpage &&
    host === "www.twitch.tv" &&
    !details.url.endsWith(".js") &&
    details.url.split("/").length <= 4
  ) {
    const proxies = store.state.videoWeaverProxies;
    const proxyInfoArray = getProxyInfoArrayFromHosts(proxies);
    console.log(`⌛ Proxying ${details.url} through one of: <empty>`);
    return proxyInfoArray;
  }

  // Passport & Usher requests.
  if (
    store.state.proxyUsherRequests &&
    (passportHostRegex.test(host) || usherHostRegex.test(host))
  ) {
    // TODO: Check if channel is whitelisted.
    const proxies = store.state.videoWeaverProxies;
    const proxyInfoArray = getProxyInfoArrayFromHosts(proxies);
    console.log(
      `⌛ Proxying ${details.url} through one of: ${
        proxies.toString() || "<empty>"
      }`
    );
    return proxyInfoArray;
  }

  // Video-weaver requests.
  if (isFlaggedRequest(details.requestHeaders)) {
    const proxies = store.state.videoWeaverProxies;
    const proxyInfoArray = getProxyInfoArrayFromHosts(proxies);
    // Don't proxy whitelisted channels.
    const channelName = findChannelFromVideoWeaverUrl(details.url);
    if (isChannelWhitelisted(channelName)) {
      console.log(`✋ Channel '${channelName}' is whitelisted.`);
      return { type: "direct" };
    }
    console.log(
      `⌛ Proxying ${details.url} (${
        channelName ?? "unknown"
      }) through one of: ${proxies.toString() || "<empty>"}`
    );
    return proxyInfoArray;
  }

  return { type: "direct" };
}

function getProxyInfoArrayFromHosts(hosts: string[]): ProxyInfo[] {
  return [
    ...hosts.map(host => {
      const [hostname, port] = host.split(":");
      return {
        type: "http",
        host: hostname,
        port: Number(port) ?? 3128,
      } as ProxyInfo;
    }),
    { type: "direct" } as ProxyInfo, // Fallback to direct connection if all proxies fail.
  ];
}
