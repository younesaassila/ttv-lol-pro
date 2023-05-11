import browser from "webextension-polyfill";
import isChrome from "../common/ts/isChrome";
import onBeforeRequest from "./handlers/onBeforeRequest";
import onHeadersReceived from "./handlers/onHeadersReceived";
import onProxyRequest from "./handlers/onProxyRequest";
import onStartupStoreCleanup from "./handlers/onStartupStoreCleanup";
import onStartupUpdateCheck from "./handlers/onStartupUpdateCheck";
import updateProxySettings from "./updateProxySettings";

console.info("🚀 Background script running.");

// Cleanup the session-related data in the store on startup.
browser.runtime.onStartup.addListener(onStartupStoreCleanup);

// Check for updates on startup.
browser.runtime.onStartup.addListener(onStartupUpdateCheck);

if (!isChrome) {
  // Proxy video-weaver requests.
  browser.proxy.onRequest.addListener(onProxyRequest, {
    urls: ["https://*.ttvnw.net/*"], // Filtered to video-weaver requests in the handler.
  });

  // Map channel names to video-weaver URLs.
  browser.webRequest.onBeforeRequest.addListener(
    onBeforeRequest,
    {
      urls: ["https://usher.ttvnw.net/api/channel/hls/*"],
    },
    ["blocking"]
  );

  // Monitor video-weaver responses.
  browser.webRequest.onHeadersReceived.addListener(onHeadersReceived, {
    urls: ["https://*.ttvnw.net/*"], // Filtered to video-weaver requests in the handler.
  });
} else updateProxySettings();
