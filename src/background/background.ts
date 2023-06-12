import browser from "webextension-polyfill";
import isChromium from "../common/ts/isChromium";
import updateProxySettings from "../common/ts/updateProxySettings";
import store from "../store";
import onAuthRequired from "./handlers/onAuthRequired";
import onBeforeSendHeaders from "./handlers/onBeforeSendHeaders";
import onBeforeUsherRequest from "./handlers/onBeforeUsherRequest";
import onBeforeVideoWeaverRequest from "./handlers/onBeforeVideoWeaverRequest";
import onHeadersReceived from "./handlers/onHeadersReceived";
import onProxyRequest from "./handlers/onProxyRequest";
import onStartupStoreCleanup from "./handlers/onStartupStoreCleanup";

console.info("🚀 Background script loaded.");

// Cleanup the session-related data in the store on startup.
browser.runtime.onStartup.addListener(onStartupStoreCleanup);

// Handle proxy authentication.
browser.webRequest.onAuthRequired.addListener(
  onAuthRequired,
  { urls: ["https://*.ttvnw.net/*", "https://*.twitch.tv/*"] },
  ["blocking"]
);

if (isChromium) {
  const setProxySettings = () => {
    if (store.readyState !== "complete")
      return store.addEventListener("load", setProxySettings);
    updateProxySettings();
  };
  setProxySettings();
} else {
  // Block tracking pixels.
  browser.webRequest.onBeforeRequest.addListener(
    () => ({ cancel: true }),
    { urls: ["https://*.twitch.tv/r/s/*", "https://*.twitch.tv/r/c/*"] },
    ["blocking"]
  );

  // Map channel names to Video Weaver URLs.
  browser.webRequest.onBeforeRequest.addListener(
    onBeforeUsherRequest,
    {
      urls: ["https://usher.ttvnw.net/api/channel/hls/*"],
    },
    ["blocking"]
  );

  // Proxy requests.
  browser.proxy.onRequest.addListener(
    onProxyRequest,
    {
      urls: ["https://*.ttvnw.net/*", "https://*.twitch.tv/*"],
    },
    ["requestHeaders"]
  );

  // Remove the Accept flag from flagged requests.
  browser.webRequest.onBeforeSendHeaders.addListener(
    onBeforeSendHeaders,
    {
      urls: ["https://*.ttvnw.net/*", "https://*.twitch.tv/*"],
    },
    ["blocking", "requestHeaders"]
  );

  // Check for ads in Video Weaver responses.
  browser.webRequest.onBeforeRequest.addListener(
    onBeforeVideoWeaverRequest,
    {
      urls: ["https://*.ttvnw.net/*"],
    },
    ["blocking"]
  );

  // Monitor responses of proxied requests.
  browser.webRequest.onHeadersReceived.addListener(onHeadersReceived, {
    urls: ["https://*.ttvnw.net/*", "https://*.twitch.tv/*"],
  });
}
