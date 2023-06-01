import store from "../../store";
import {
  passportHostRegex,
  twitchGqlHostRegex,
  usherHostRegex,
  videoWeaverHostRegex,
} from "./regexes";

export default function updateProxySettings() {
  const proxies = store.state.normalProxies;
  const proxyInfo = getProxyInfoFromHosts(proxies);
  const proxyInfoStringified = JSON.stringify(proxyInfo);

  const config = {
    mode: "pac_script",
    pacScript: {
      data: `
          function FindProxyForURL(url, host) {
            // Settings
            const proxyTwitchWebpage = ${store.state.proxyTwitchWebpage};
            const proxyUsherRequests = ${store.state.proxyUsherRequests};
            // Regexes
            const twitchGqlHostRegex = ${twitchGqlHostRegex.toString()};
            const passportHostRegex = ${passportHostRegex.toString()};
            const usherHostRegex = ${usherHostRegex.toString()};
            const videoWeaverHostRegex = ${videoWeaverHostRegex.toString()};

            if (proxyTwitchWebpage && (host === "www.twitch.tv" || twitchGqlHostRegex.test(host))) {
              return ${proxyInfoStringified};
            }
            if (proxyUsherRequests && (passportHostRegex.test(host) || usherHostRegex.test(host))) {
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

function getProxyInfoFromHosts(hosts: string[]): string {
  return [...hosts.map(host => `PROXY ${host}`), "DIRECT"].join("; ");
}
