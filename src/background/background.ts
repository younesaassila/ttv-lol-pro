import browser from "webextension-polyfill";
import isChromium from "../common/ts/isChromium";
import onBeforeRequest from "./handlers/onBeforeRequest";
import onHeadersReceived from "./handlers/onHeadersReceived";
import onProxyRequest from "./handlers/onProxyRequest";
import onStartupStoreCleanup from "./handlers/onStartupStoreCleanup";
import updateProxySettings from "./updateProxySettings";

console.info("🚀 Background script loaded.");

// Cleanup the session-related data in the store on startup.
browser.runtime.onStartup.addListener(onStartupStoreCleanup);

if (!isChromium) {
  // Map channel names to video-weaver URLs.
  browser.webRequest.onBeforeRequest.addListener(
    onBeforeRequest,
    {
      urls: ["https://usher.ttvnw.net/api/channel/hls/*"],
    },
    ["blocking"]
  );

  // Proxy video-weaver requests.
  browser.proxy.onRequest.addListener(onProxyRequest, {
    urls: ["https://*.ttvnw.net/*"], // Filtered to video-weaver requests in the handler.
  });

  // Monitor video-weaver responses.
  browser.webRequest.onHeadersReceived.addListener(onHeadersReceived, {
    urls: ["https://*.ttvnw.net/*"], // Filtered to video-weaver requests in the handler.
  });
} else updateProxySettings();
