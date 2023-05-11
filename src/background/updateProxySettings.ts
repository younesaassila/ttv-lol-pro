import isChrome from "../common/ts/isChrome";
import store from "../store";

export default function updateProxySettings() {
  if (store.readyState !== "complete")
    return store.addEventListener("load", updateProxySettings);

  if (isChrome) {
    let proxies = store.state.servers.map(host => `PROXY ${host}`).join(";");
    if (proxies.length === 0) proxies = "DIRECT";
    const config = {
      mode: "pac_script",
      pacScript: {
        data:
          "function FindProxyForURL(url, host) {\n" +
          "  const hostRegex = /^video-weaver\\.\\w+\\.hls\\.ttvnw\\.net$/i;\n" +
          "  if (hostRegex.test(host)) {\n" +
          `    return ${JSON.stringify(proxies)};\n` +
          "  }\n" +
          "  return 'DIRECT';\n" +
          "}",
      },
    };
    chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {
      console.log(
        `Proxying video-weaver requests through one of: [${store.state.servers.toString()}]`
      );
    });
  }
}
