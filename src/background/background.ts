import browser from "webextension-polyfill";
import isChrome from "../common/ts/isChrome";
import log from "../common/ts/log";
import onBeforeHlsRequest from "./handlers/onBeforeHlsRequest";
import onBeforeVodRequest from "./handlers/onBeforeVodRequest";
import onHeadersReceived from "./handlers/onHeadersReceived";
import onProxyRequest from "./handlers/onProxyRequest";
import onStartupStoreCleanup from "./handlers/onStartupStoreCleanup";
import onStartupUpdateCheck from "./handlers/onStartupUpdateCheck";
import updateProxySettings from "./updateProxySettings";

log("🚀 Background script running.");

// Cleanup the session-related data in the store on startup.
browser.runtime.onStartup.addListener(onStartupStoreCleanup);

// Check for updates on startup.
browser.runtime.onStartup.addListener(onStartupUpdateCheck);

if (!isChrome) {
  // Proxy video-weaver requests.
  browser.proxy.onRequest.addListener(onProxyRequest, {
    urls: ["https://*.ttvnw.net/*"], // Filtered to video-weaver requests in the handler.
  });

  // TODO: Map channel names to HLS playlists.
  browser.webRequest.onBeforeRequest.addListener(onBeforeHlsRequest, {
    urls: ["https://usher.ttvnw.net/api/channel/hls/*"],
  });

  // TODO: Excluded from proxying.
  browser.webRequest.onBeforeRequest.addListener(onBeforeVodRequest, {
    urls: ["https://usher.ttvnw.net/vod/*"],
  });

  // Monitor video-weaver responses.
  browser.webRequest.onHeadersReceived.addListener(onHeadersReceived, {
    urls: ["https://*.ttvnw.net/*"], // Filtered to video-weaver requests in the handler.
  });
} else updateProxySettings();
