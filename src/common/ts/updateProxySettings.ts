import store from "../../store";
import { usherHostRegex, videoWeaverHostRegex } from "./regexes";

export default function updateProxySettings() {
  const usherProxies = store.state.usherProxies;
  const usherProxyInfo = getProxyInfoFromHosts(usherProxies);
  const videoWeaverProxies = store.state.videoWeaverProxies;
  const videoWeaverProxyInfo = getProxyInfoFromHosts(videoWeaverProxies);

  const config = {
    mode: "pac_script",
    pacScript: {
      data: `
          function FindProxyForURL(url, host) {
            const proxyUsherRequests = ${store.state.proxyUsherRequests};
            const usherHostRegex = ${usherHostRegex.toString()};
            const videoWeaverHostRegex = ${videoWeaverHostRegex.toString()};
            if (proxyUsherRequests && usherHostRegex.test(host)) {
              return ${JSON.stringify(usherProxyInfo)};
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
          usherProxies.toString() || "<empty>"
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
