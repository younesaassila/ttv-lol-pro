import { Proxy } from "webextension-polyfill";
import findChannelFromTwitchTvUrl from "../../common/ts/findChannelFromTwitchTvUrl";
import findChannelFromUsherUrl from "../../common/ts/findChannelFromUsherUrl";
import findChannelFromVideoWeaverUrl from "../../common/ts/findChannelFromVideoWeaverUrl";
import getHostFromUrl from "../../common/ts/getHostFromUrl";
import getProxyInfoFromUrl from "../../common/ts/getProxyInfoFromUrl";
import isChannelWhitelisted from "../../common/ts/isChannelWhitelisted";
import isFlaggedRequest from "../../common/ts/isFlaggedRequest";
import {
  passportHostRegex,
  twitchGqlHostRegex,
  twitchTvHostRegex,
  usherHostRegex,
  videoWeaverHostRegex,
} from "../../common/ts/regexes";
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

  const isFlagged =
    (store.state.optimizedProxiesEnabled &&
      isFlaggedRequest(details.requestHeaders)) ||
    !store.state.optimizedProxiesEnabled;
  const proxies = store.state.optimizedProxiesEnabled
    ? store.state.optimizedProxies
    : store.state.normalProxies;
  const proxyInfoArray = getProxyInfoArrayFromUrls(proxies);

  // Twitch webpage requests.
  if (store.state.proxyTwitchWebpage && twitchTvHostRegex.test(host)) {
    console.log(`⌛ Proxying ${details.url} through one of: <empty>`);
    return proxyInfoArray;
  }

  // Twitch GraphQL requests.
  if (
    store.state.proxyTwitchWebpage &&
    twitchGqlHostRegex.test(host) &&
    isFlagged
  ) {
    console.log(
      `⌛ Proxying ${details.url} through one of: ${
        proxies.toString() || "<empty>"
      }`
    );
    return proxyInfoArray;
  }

  // Passport requests.
  if (store.state.proxyUsherRequests && passportHostRegex.test(host)) {
    console.log(
      `⌛ Proxying ${details.url} through one of: ${
        proxies.toString() || "<empty>"
      }`
    );
    return proxyInfoArray;
  }

  const documentHost = details.documentUrl
    ? getHostFromUrl(details.documentUrl)
    : null;
  const isFromTwitchTvHost =
    documentHost && twitchTvHostRegex.test(documentHost);

  // Usher requests.
  if (store.state.proxyUsherRequests && usherHostRegex.test(host)) {
    // Don't proxy Usher requests from non-supported hosts.
    if (!isFromTwitchTvHost) {
      console.log(
        `✋ '${details.url}' from host '${documentHost}' is not supported.`
      );
      return { type: "direct" };
    }
    // Don't proxy whitelisted channels.
    const channelName = findChannelFromUsherUrl(details.url);
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

  // Video Weaver requests.
  if (videoWeaverHostRegex.test(host) && isFlagged) {
    // Don't proxy Video Weaver requests from non-supported hosts.
    if (!isFromTwitchTvHost) {
      console.log(
        `✋ '${details.url}' from host '${documentHost}' is not supported.`
      );
      return { type: "direct" };
    }
    // Don't proxy whitelisted channels.
    const channelName =
      findChannelFromVideoWeaverUrl(details.url) ??
      findChannelFromTwitchTvUrl(details.documentUrl);
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

function getProxyInfoArrayFromUrls(urls: string[]): ProxyInfo[] {
  return [
    ...urls.map(getProxyInfoFromUrl),
    { type: "direct" } as ProxyInfo, // Fallback to direct connection if all proxies fail.
  ];
}
