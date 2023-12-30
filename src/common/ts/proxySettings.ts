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

export function updateProxySettings(mode?: "limited" | "full") {
  const { optimizedProxiesEnabled, passportLevel } = store.state;

  mode ??= optimizedProxiesEnabled ? "limited" : "full";

  const proxies = optimizedProxiesEnabled
    ? store.state.optimizedProxies
    : store.state.normalProxies;
  const proxyInfoString = getProxyInfoStringFromUrls(proxies);

  const proxyPassportRequests = passportLevel >= 0;
  const proxyUsherRequests = passportLevel >= 0;
  const proxyGraphQLRequests = mode === "full" && passportLevel >= 1;
  const proxyTwitchWebpageRequests = mode === "full" && passportLevel >= 2;
  const proxyVideoWeaverRequests = mode === "full";

  const config = {
    mode: "pac_script",
    pacScript: {
      data: `
        function FindProxyForURL(url, host) {
          // Passport requests.
          if (${proxyPassportRequests} && ${passportHostRegex}.test(host)) {
            return "${proxyInfoString}";
          }
          // Usher requests.
          if (${proxyUsherRequests} && ${usherHostRegex}.test(host)) {
            return "${proxyInfoString}";
          }
          // GraphQL requests.
          if (${proxyGraphQLRequests} && ${twitchGqlHostRegex}.test(host)) {
            return "${proxyInfoString}";
          }
          // Twitch webpage requests.
          if (${proxyTwitchWebpageRequests} && ${twitchTvHostRegex}.test(host)) {
            return "${proxyInfoString}";
          }
          // Video Weaver requests.
          if (${proxyVideoWeaverRequests} && ${videoWeaverHostRegex}.test(host)) {
            return "${proxyInfoString}";
          }
          return "DIRECT";
        }
      `,
    },
  };

  chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {
    console.log(
      `⚙️ Proxying requests through one of: ${
        proxies.toString() || "<empty>"
      } (${mode})`
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

export function clearProxySettings() {
  chrome.proxy.settings.clear({ scope: "regular" }, function () {
    console.log("⚙️ Proxy settings cleared");
  });
}
