import browser from "webextension-polyfill";
import onApiHeadersReceived from "./handlers/onApiHeadersReceived";
import onBeforeManifestRequest from "./handlers/onBeforeManifestRequest";
import onBeforeSendApiHeaders from "./handlers/onBeforeSendApiHeaders";
import onStartupStoreCleanup from "./handlers/onStartupStoreCleanup";
import onStartupUpdateCheck from "./handlers/onStartupUpdateCheck";

// Cleanup the session-related data in the store on startup.
browser.runtime.onStartup.addListener(onStartupStoreCleanup);

// Check for updates on startup.
browser.runtime.onStartup.addListener(onStartupUpdateCheck);

// Redirect the HLS master manifest request to TTV LOL's API.
browser.webRequest.onBeforeRequest.addListener(
  onBeforeManifestRequest,
  {
    urls: [
      "https://usher.ttvnw.net/api/channel/hls/*",
      "https://usher.ttvnw.net/vod/*",
    ],
  },
  ["blocking"]
);

// Add the `X-Donate-To` header to API requests.
browser.webRequest.onBeforeSendHeaders.addListener(
  onBeforeSendApiHeaders,
  { urls: ["https://api.ttv.lol/playlist/*", "https://api.ttv.lol/vod/*"] },
  ["blocking", "requestHeaders"]
);

// Monitor API error responses.
browser.webRequest.onHeadersReceived.addListener(
  onApiHeadersReceived,
  { urls: ["https://api.ttv.lol/playlist/*", "https://api.ttv.lol/vod/*"] },
  ["blocking"]
);
