import store from "../../store";
import getProxyInfoFromUrl from "./getProxyInfoFromUrl";
import isRequestTypeProxied from "./isRequestTypeProxied";
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

  const proxyPassportRequests = isRequestTypeProxied("passport", {
    isChromium: true,
    optimizedProxiesEnabled: optimizedProxiesEnabled,
    passportLevel: passportLevel,
    fullModeEnabled: mode === "full",
  });
  const proxyUsherRequests = isRequestTypeProxied("usher", {
    isChromium: true,
    optimizedProxiesEnabled: optimizedProxiesEnabled,
    passportLevel: passportLevel,
    fullModeEnabled: mode === "full",
  });
  const proxyVideoWeaverRequests = isRequestTypeProxied("weaver", {
    isChromium: true,
    optimizedProxiesEnabled: optimizedProxiesEnabled,
    passportLevel: passportLevel,
    fullModeEnabled: mode === "full",
  });
  const proxyGraphQLRequests = isRequestTypeProxied("gql", {
    isChromium: true,
    optimizedProxiesEnabled: optimizedProxiesEnabled,
    passportLevel: passportLevel,
    fullModeEnabled: mode === "full",
  });
  const proxyTwitchWebpageRequests = isRequestTypeProxied("www", {
    isChromium: true,
    optimizedProxiesEnabled: optimizedProxiesEnabled,
    passportLevel: passportLevel,
    fullModeEnabled: mode === "full",
  });

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
          // Video Weaver requests.
          if (${proxyVideoWeaverRequests} && ${videoWeaverHostRegex}.test(host)) {
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
    store.state.chromiumProxyActive = true;
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
    store.state.chromiumProxyActive = false;
  });
}
