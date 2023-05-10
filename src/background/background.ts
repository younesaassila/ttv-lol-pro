import browser from "webextension-polyfill";
import isChrome from "../common/ts/isChrome";
import store from "../store";
// import onApiHeadersReceived from "./handlers/onApiHeadersReceived";
// import onBeforeManifestRequest from "./handlers/onBeforeManifestRequest";
// import onBeforeSendApiHeaders from "./handlers/onBeforeSendApiHeaders";
import onStartupStoreCleanup from "./handlers/onStartupStoreCleanup";
import onStartupUpdateCheck from "./handlers/onStartupUpdateCheck";
import updateProxySettings from "./updateProxySettings";

// Cleanup the session-related data in the store on startup.
browser.runtime.onStartup.addListener(onStartupStoreCleanup);

// Check for updates on startup.
browser.runtime.onStartup.addListener(onStartupUpdateCheck);

// // Redirect the HLS master manifest request to TTV LOL's API.
// browser.webRequest.onBeforeRequest.addListener(
//   onBeforeManifestRequest,
//   {
//     urls: [
//       "https://usher.ttvnw.net/api/channel/hls/*",
//       "https://usher.ttvnw.net/vod/*",
//     ],
//   },
//   ["blocking"]
// );

// // Add the `X-Donate-To` header to API requests.
// browser.webRequest.onBeforeSendHeaders.addListener(
//   onBeforeSendApiHeaders,
//   { urls: ["https://api.ttv.lol/playlist/*", "https://api.ttv.lol/vod/*"] },
//   ["blocking", "requestHeaders"]
// );

// // Monitor API error responses.
// browser.webRequest.onHeadersReceived.addListener(
//   onApiHeadersReceived,
//   { urls: ["https://api.ttv.lol/playlist/*", "https://api.ttv.lol/vod/*"] },
//   ["blocking"]
// );

if (isChrome) {
  updateProxySettings();
} else {
  browser.proxy.onRequest.addListener(
    async details => {
      const hostRegex = /^video-weaver\.\w+\.hls\.ttvnw\.net$/i;
      try {
        const Url = new URL(details.url);
        const host = Url.host;
        if (hostRegex.test(host)) {
          let proxies = store.state.servers.map(host => {
            const [hostname, port] = host.split(":");
            return { type: "http", host: hostname, port: Number(port) ?? 3128 };
          }) as { type: string; host?: string; port?: number }[];
          if (proxies.length === 0) proxies = [{ type: "direct" }];
          console.log(
            `Proxying ${
              details.url
            } through one of: ${store.state.servers.toString()}`
          );
          return proxies;
        }
      } catch (error) {
        console.error(error);
      }
      return { type: "direct" };
    },
    { urls: ["https://*.ttvnw.net/*"] }
  );
}
