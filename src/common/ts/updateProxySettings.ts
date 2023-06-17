import store from "../../store";
import getProxyInfoFromUrl from "./getProxyInfoFromUrl";
import {
  passportHostRegex,
  twitchGqlHostRegex,
  twitchTvHostRegex,
  usherHostRegex,
  videoWeaverHostRegex,
} from "./regexes";
import updateDnsResponses from "./updateDnsResponses";

export default function updateProxySettings() {
  const { proxyTwitchWebpage, proxyUsherRequests } = store.state;

  const proxies = store.state.optimizedProxiesEnabled
    ? store.state.optimizedProxies
    : store.state.normalProxies;
  const proxyInfoString = getProxyInfoStringFromUrls(proxies);

  const config = {
    mode: "pac_script",
    pacScript: {
      data: `
        function FindProxyForURL(url, host) {
          // Twitch webpage & GraphQL requests.
          if (${proxyTwitchWebpage} && (${twitchTvHostRegex}.test(host) || ${twitchGqlHostRegex}.test(host))) {
            return "${proxyInfoString}";
          }
          // Passport & Usher requests.
          if (${proxyUsherRequests} && (${passportHostRegex}.test(host) || ${usherHostRegex}.test(host))) {
            return "${proxyInfoString}";
          }
          // Video Weaver requests.
          if (${videoWeaverHostRegex}.test(host)) {
            return "${proxyInfoString}";
          }
          return "DIRECT";
        }
      `,
    },
  };

  chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {
    console.log(
      `⚙️ Proxying requests through one of: ${proxies.toString() || "<empty>"}`
    );
    updateDnsResponses();
  });
}

function getProxyInfoStringFromUrls(urls: string[]): string {
  return [
    ...urls.map(url => {
      const proxyInfo = getProxyInfoFromUrl(url);
      return `PROXY ${proxyInfo.host}:${proxyInfo.port}`;
    }),
    "DIRECT",
  ].join("; ");
}
