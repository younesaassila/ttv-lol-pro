import browser from "webextension-polyfill";
import isChromium from "../common/ts/isChromium";
import checkForOpenedTwitchTabs from "./handlers/checkForOpenedTwitchTabs";
import onAuthRequired from "./handlers/onAuthRequired";
import onBeforeSendHeaders from "./handlers/onBeforeSendHeaders";
import onBeforeTwitchTvRequest from "./handlers/onBeforeTwitchTvRequest";
import onBeforeVideoWeaverRequest from "./handlers/onBeforeVideoWeaverRequest";
import onProxyRequest from "./handlers/onProxyRequest";
import onProxySettingsChange from "./handlers/onProxySettingsChanged";
import onResponseStarted from "./handlers/onResponseStarted";
import onStartupStoreCleanup from "./handlers/onStartupStoreCleanup";
import onTabCreated from "./handlers/onTabCreated";
import onTabRemoved from "./handlers/onTabRemoved";
import onTabReplaced from "./handlers/onTabReplaced";
import onTabUpdated from "./handlers/onTabUpdated";

console.info("🚀 Background script loaded.");

// Cleanup the session-related data in the store on startup.
browser.runtime.onStartup.addListener(onStartupStoreCleanup);

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
  // Listen to whether proxy is set or not.
  browser.proxy.settings.onChange.addListener(onProxySettingsChange);

  // Check if there are any opened Twitch tabs on startup.
  checkForOpenedTwitchTabs();

  // Keep track of opened Twitch tabs to enable/disable the PAC script.
  browser.tabs.onCreated.addListener(onTabCreated);
  browser.tabs.onUpdated.addListener(onTabUpdated);
  browser.tabs.onRemoved.addListener(onTabRemoved);
  browser.tabs.onReplaced.addListener(onTabReplaced);
} else {
  // Inject page script.
  browser.webRequest.onBeforeRequest.addListener(
    onBeforeTwitchTvRequest,
    {
      urls: ["https://www.twitch.tv/*", "https://m.twitch.tv/*"],
      types: ["main_frame"],
    },
    ["blocking"]
  );

  // Block tracking pixels.
  browser.webRequest.onBeforeRequest.addListener(
    () => ({ cancel: true }),
    {
      urls: [
        "https://*.twitch.tv/r/s/*",
        "https://*.twitch.tv/r/c/*",
        "https://*.ads.twitch.tv/*",
      ],
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
}
