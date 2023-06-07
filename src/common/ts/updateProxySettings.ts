import store from "../../store";
import getProxyInfoFromUrl from "./getProxyInfoFromUrl";
import {
  passportHostRegex,
  twitchGqlHostRegex,
  usherHostRegex,
  videoWeaverHostRegex,
} from "./regexes";

export default function updateProxySettings() {
  const proxies = store.state.optimizedProxiesEnabled
    ? store.state.optimizedProxies
    : store.state.normalProxies;
  const proxyInfo = getProxyInfoStringFromUrls(proxies);
  const proxyInfoStringified = JSON.stringify(proxyInfo);

  const config = {
    mode: "pac_script",
    pacScript: {
      data: `
          function FindProxyForURL(url, host) {
            // Regexes
            const twitchGqlHostRegex = ${twitchGqlHostRegex.toString()};
            const passportHostRegex = ${passportHostRegex.toString()};
            const usherHostRegex = ${usherHostRegex.toString()};
            const videoWeaverHostRegex = ${videoWeaverHostRegex.toString()};

            if (${
              store.state.proxyTwitchWebpage
            } && (host === "www.twitch.tv" || twitchGqlHostRegex.test(host))) {
              return ${proxyInfoStringified};
            }
            if (${
              store.state.proxyUsherRequests
            } && (passportHostRegex.test(host) || usherHostRegex.test(host))) {
              return ${proxyInfoStringified};
            }
            if (videoWeaverHostRegex.test(host)) {
              return ${proxyInfoStringified};
            }
            return "DIRECT";
          }`,
    },
  };

  chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {
    console.log(
      `⚙️ Proxying requests through one of: ${proxies.toString() || "<empty>"}`
    );
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
