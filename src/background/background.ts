import browser from "webextension-polyfill";
import isChromium from "../common/ts/isChromium";
import checkForOpenedTwitchTabs from "./handlers/checkForOpenedTwitchTabs";
import onAuthRequired from "./handlers/onAuthRequired";
import onBeforeSendHeaders from "./handlers/onBeforeSendHeaders";
import onBeforeVideoWeaverRequest from "./handlers/onBeforeVideoWeaverRequest";
import onProxyRequest from "./handlers/onProxyRequest";
import onResponseStarted from "./handlers/onResponseStarted";
import onStartupStoreCleanup from "./handlers/onStartupStoreCleanup";
import onTabCreated from "./handlers/onTabCreated";
import onTabRemoved from "./handlers/onTabRemoved";
import onTabUpdated from "./handlers/onTabUpdated";

console.info("🚀 Background script loaded.");

// Cleanup the session-related data in the store on startup.
onStartupStoreCleanup(); // FIXME: Might be cleared every time background script is reloaded.

// Handle proxy authentication.
browser.webRequest.onAuthRequired.addListener(
  onAuthRequired,
  { urls: ["https://*.ttvnw.net/*", "https://*.twitch.tv/*"] },
  ["blocking"]
);

// Monitor proxied status of requests.
browser.webRequest.onResponseStarted.addListener(onResponseStarted, {
  urls: ["https://*.ttvnw.net/*", "https://*.twitch.tv/*"],
});

if (isChromium) {
  // Check if there are any opened Twitch tabs on startup.
  checkForOpenedTwitchTabs();

  // Keep track of opened Twitch tabs to enable/disable the PAC script.
  browser.tabs.onCreated.addListener(onTabCreated);
  browser.tabs.onUpdated.addListener(onTabUpdated);
  browser.tabs.onRemoved.addListener(onTabRemoved);
} else {
  // Block tracking pixels.
  browser.webRequest.onBeforeRequest.addListener(
    () => ({ cancel: true }),
    { urls: ["https://*.twitch.tv/r/s/*", "https://*.twitch.tv/r/c/*"] },
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
}
