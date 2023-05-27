import store from "../../store";
import {
  passportHostRegex,
  usherHostRegex,
  videoWeaverHostRegex,
} from "./regexes";

export default function updateProxySettings() {
  const videoWeaverProxies = store.state.videoWeaverProxies;
  const videoWeaverProxyInfo = getProxyInfoFromHosts(videoWeaverProxies);

  const config = {
    mode: "pac_script",
    pacScript: {
      data: `
          function FindProxyForURL(url, host) {
            const proxyTwitchWebpage = ${store.state.proxyTwitchWebpage};
            const proxyUsherRequests = ${store.state.proxyUsherRequests};

            const passportHostRegex = ${passportHostRegex.toString()};
            const usherHostRegex = ${usherHostRegex.toString()};
            const videoWeaverHostRegex = ${videoWeaverHostRegex.toString()};

            if (proxyTwitchWebpage && host === "www.twitch.tv") {
              return ${JSON.stringify(videoWeaverProxyInfo)};
            }
            if (proxyUsherRequests && (passportHostRegex.test(host) || usherHostRegex.test(host))) {
              return ${JSON.stringify(videoWeaverProxyInfo)};
            }
            if (videoWeaverHostRegex.test(host)) {
              return ${JSON.stringify(videoWeaverProxyInfo)};
            }
            return "DIRECT";
          }`,
    },
  };

  chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {
    if (store.state.proxyUsherRequests) {
      console.log(
        `⚙️ Proxying usher requests through one of: ${
          videoWeaverProxies.toString() || "<empty>"
        }`
      );
    }
    console.log(
      `⚙️ Proxying video-weaver requests through one of: ${
        videoWeaverProxies.toString() || "<empty>"
      }`
    );
  });
}

function getProxyInfoFromHosts(hosts: string[]): string {
  return [...hosts.map(host => `PROXY ${host}`), "DIRECT"].join("; ");
}
