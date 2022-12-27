import browser from "webextension-polyfill";
import isChrome from "../common/ts/isChrome";
import onApiHeadersReceived from "./handlers/onApiHeadersReceived";
import onBeforeManifestRequest from "./handlers/onBeforeManifestRequest";
import onBeforeSendApiHeaders from "./handlers/onBeforeSendApiHeaders";
import onBeforeVideoWeaverRequest from "./handlers/onBeforeVideoWeaverRequest";
import onStartup from "./handlers/onStartup";

// Check for updates on Chrome startup.
if (isChrome) browser.runtime.onStartup.addListener(onStartup);

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

// Detect midrolls by looking for an ad signifier in the video weaver response.
browser.webRequest.onBeforeRequest.addListener(
  onBeforeVideoWeaverRequest,
  {
    urls: ["https://*.ttvnw.net/*"], // Immediately filtered to video-weaver URLs in handler.
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
