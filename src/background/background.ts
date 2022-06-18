import browser from "webextension-polyfill";
import onBeforeRequest from "./handlers/onBeforeRequest";
import onBeforeSendHeaders from "./handlers/onBeforeSendHeaders";
import onHeadersReceived from "./handlers/onHeadersReceived";

// Redirect the HLS master manifest request to TTV LOL's API.
browser.webRequest.onBeforeRequest.addListener(
  onBeforeRequest,
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
  onBeforeSendHeaders,
  { urls: ["https://api.ttv.lol/playlist/*", "https://api.ttv.lol/vod/*"] },
  ["blocking", "requestHeaders"]
);

browser.webRequest.onHeadersReceived.addListener(
  onHeadersReceived,
  { urls: ["https://api.ttv.lol/playlist/*", "https://api.ttv.lol/vod/*"] },
  ["blocking"]
);
