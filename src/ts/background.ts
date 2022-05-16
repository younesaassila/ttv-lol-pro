import browser, { WebRequest } from "webextension-polyfill";
import removeUnusedParams from "../lib/removeUnusedParams";
import willRaiseError2000 from "../lib/willRaiseError2000";
import { PlaylistType, ServerError, Token } from "../types";

let currentChannel: string; // Current channel's name or current VOD's id.
let serverErrors: ServerError[] = []; // Array of errors from TTV LOL's server in chronological order.
const serverErrorsMaxLength = 5; // Array is cleared when a request is successful.

function onBeforeRequest(details: WebRequest.OnBeforeRequestDetailsType) {
  const match = /\/(hls|vod)\/(.+)\.m3u8(?:\?(.*))?$/gi.exec(details.url);
  if (match == null) return {};

  const [_, _type, _channel, _params] = match;
  if (_type == null || _channel == null) return {};

  if (currentChannel !== _channel) serverErrors = [];
  currentChannel = _channel;

  if (willRaiseError2000(serverErrors)) {
    console.log(
      "[TTV LOL] Too many server-side errors have occurred; plugin disabled."
    );
    return {};
  }

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
    // Remove non-required sensitive information from the query params.
    removeUnusedParams(searchParams);
    return {
      redirectUrl: `https://api.ttv.lol/${playlistType}/${encodeURIComponent(
        `${currentChannel}.m3u8?${searchParams.toString()}`
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

function onHeadersReceived(
  details: browser.WebRequest.OnHeadersReceivedDetailsType
) {
  const statusCode = details.statusCode;

  if (500 <= statusCode && statusCode < 600) {
    console.error(
      `[TTV LOL] A server-side error occurred (Status code: ${statusCode}).`
    );
    const timestamp = performance.now();
    serverErrors.push({
      timestamp,
      statusCode,
    });
    while (serverErrors.length > serverErrorsMaxLength) {
      serverErrors.shift();
    }
  } else {
    serverErrors = [];
  }
}

browser.webRequest.onHeadersReceived.addListener(
  onHeadersReceived,
  { urls: ["https://api.ttv.lol/playlist/*", "https://api.ttv.lol/vod/*"] },
  ["blocking", "responseHeaders"]
);
