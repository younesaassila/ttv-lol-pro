import store from "../../store";
import { videoWeaverHostRegex } from "./regexes";

export default function updateProxySettings() {
  const proxies = store.state.proxies;
  let proxyInfo = proxies.map(host => `PROXY ${host}`).join(";");
  if (proxyInfo.length === 0) proxyInfo = "DIRECT";

  const config = {
    mode: "pac_script",
    pacScript: {
      data: `
          function FindProxyForURL(url, host) {
            const hostRegex = ${videoWeaverHostRegex.toString()};
            if (hostRegex.test(host)) {
              return ${JSON.stringify(proxyInfo)};
            }
            return "DIRECT";
          }`,
    },
  };

  chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {
    console.log(
      `⚙️ Proxying video-weaver requests through one of: ${
        proxies.toString() || "<empty>"
      }`
    );
  });
}
