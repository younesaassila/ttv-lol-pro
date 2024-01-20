import { Proxy } from "webextension-polyfill";
import findChannelFromTwitchTvUrl from "../../common/ts/findChannelFromTwitchTvUrl";
import findChannelFromUsherUrl from "../../common/ts/findChannelFromUsherUrl";
import findChannelFromVideoWeaverUrl from "../../common/ts/findChannelFromVideoWeaverUrl";
import getHostFromUrl from "../../common/ts/getHostFromUrl";
import getProxyInfoFromUrl from "../../common/ts/getProxyInfoFromUrl";
import isChannelWhitelisted from "../../common/ts/isChannelWhitelisted";
import isFlaggedRequest from "../../common/ts/isFlaggedRequest";
import isRequestTypeProxied from "../../common/ts/isRequestTypeProxied";
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

  const documentHost = details.documentUrl
    ? getHostFromUrl(details.documentUrl)
    : null;
  const isFromTwitchTvHost =
    documentHost && twitchTvHostRegex.test(documentHost);

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

  const proxies = store.state.optimizedProxiesEnabled
    ? store.state.optimizedProxies
    : store.state.normalProxies;
  const proxyInfoArray = getProxyInfoArrayFromUrls(proxies);

  const params = {
    isChromium: false,
    optimizedProxiesEnabled: store.state.optimizedProxiesEnabled,
    passportLevel: store.state.passportLevel,
    isFlagged: isFlaggedRequest(details.requestHeaders),
  };
  const proxyPassportRequest = isRequestTypeProxied("passport", params);
  const proxyUsherRequest = isRequestTypeProxied("usher", params);
  const proxyVideoWeaverRequest = isRequestTypeProxied("weaver", params);
  const proxyGraphQLRequest = isRequestTypeProxied("gql", params);
  const proxyTwitchWebpageRequest = isRequestTypeProxied("www", params);

  // Passport requests.
  if (proxyPassportRequest && passportHostRegex.test(host)) {
    console.log(
      `⌛ Proxying ${details.url} through one of: ${
        proxies.toString() || "<empty>"
      }`
    );
    return proxyInfoArray;
  }

  // Usher requests.
  if (proxyUsherRequest && usherHostRegex.test(host)) {
    // Don't proxy Usher requests from non-supported hosts.
    if (!isFromTwitchTvHost) {
      console.log(
        `✋ '${details.url}' from host '${documentHost}' is not supported.`
      );
      return { type: "direct" };
    }
    // Don't proxy VOD requests.
    if (details.url.includes("/vod/")) {
      console.log(`✋ '${details.url}' is a VOD request.`);
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
  if (proxyVideoWeaverRequest && videoWeaverHostRegex.test(host)) {
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

  // Twitch GraphQL requests.
  if (proxyGraphQLRequest && twitchGqlHostRegex.test(host)) {
    console.log(
      `⌛ Proxying ${details.url} through one of: ${
        proxies.toString() || "<empty>"
      }`
    );
    return proxyInfoArray;
  }

  // Twitch webpage requests.
  if (proxyTwitchWebpageRequest && twitchTvHostRegex.test(host)) {
    console.log(`⌛ Proxying ${details.url} through one of: <empty>`);
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
