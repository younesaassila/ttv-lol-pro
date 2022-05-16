import browser, { WebRequest } from "webextension-polyfill";
import removeUnusedParams from "../lib/removeUnusedParams";
import { PlaylistType, Token } from "../types";

function onBeforeRequest(details: WebRequest.OnBeforeRequestDetailsType) {
  const match = /\/(hls|vod)\/(.+)\.m3u8(?:\?(.*))?$/gim.exec(details.url);
  if (match == null) return {};

  const [_, _type, channel, _params] = match;
  if (_type == null || channel == null) return {};

  const playlistType =
    _type.toLowerCase() === "vod" ? PlaylistType.VOD : PlaylistType.Playlist;
  const searchParams = new URLSearchParams(_params);

  let token: Token;
  try {
    token = JSON.parse(searchParams.get("token"));
  } catch {}

  if (token != null) {
    // Remark: When watching a VOD, `subscriber` always returns `false`, even if
    // the user is a subscriber.
    const isSubscriber = token.subscriber === true;

    if (isSubscriber) {
      console.info("[TTV LOL] User is a subscriber; plugin disabled.");
      return {};
    } else {
      console.info("[TTV LOL] User is NOT a subscriber; plugin enabled.");
    }
  }

  // Synchronous XMLHttpRequest is required for the plugin to work in Chrome.
  const request = new XMLHttpRequest();
  request.open("GET", `https://api.ttv.lol/ping`, false);
  request.send();

  if (request.status === 200) {
    // Do not reset server errors here, a successful ping does not imply a
    // successful m3u8 request.
    console.info("[TTV LOL] Successfully pinged TTV LOL's server.");
    // Remove sensitive information from the query params.
    removeUnusedParams(searchParams);
    return {
      redirectUrl: `https://api.ttv.lol/${playlistType}/${encodeURIComponent(
        `${channel}.m3u8?${searchParams.toString()}`
      )}`,
    };
  } else {
    return {};
  }
}

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

function onBeforeSendHeaders(
  details: WebRequest.OnBeforeSendHeadersDetailsType
) {
  console.log(`[TTV LOL] ${details.method} ${details.url}`);
  details.requestHeaders.push({
    name: "X-Donate-To",
    value: "https://ttv.lol/donate",
  });
  return {
    requestHeaders: details.requestHeaders,
  };
}

browser.webRequest.onBeforeSendHeaders.addListener(
  onBeforeSendHeaders,
  { urls: ["https://api.ttv.lol/playlist/*", "https://api.ttv.lol/vod/*"] },
  ["blocking", "requestHeaders"]
);
