function onPlaylistBeforeRequest(details) {

  // (hls\/|vod\/)(.+?)$
  const match = /(hls|vod)\/(.+?)$/gim.exec(details.url);

  if (match !== null && match.length > 1) {
    var playlistType = match[1] == "vod" ? "vod" : "playlist";

    var req = new XMLHttpRequest();
    req.open("GET", `https://api.ttv.lol/ping`, false);
    req.send();

    // validate that our API is online, if not fallback to standard stream with ads
    if (req.status != 200) {
      return {
        redirectUrl: details.url
      };
    } else {
      return {
        redirectUrl: `https://api.ttv.lol/${playlistType}/${encodeURIComponent(match[2])}`,
      };
    }

  }
}

browser.webRequest.onBeforeRequest.addListener(
  onPlaylistBeforeRequest,
  { urls: ["https://usher.ttvnw.net/api/channel/hls/*", "https://usher.ttvnw.net/vod/*"] },
  ["blocking"]
);

function onBeforeSendHeaders(req) {
  req.requestHeaders.push({ name: 'X-Donate-To', value: "https://ttv.lol/donate" })
  return {
    requestHeaders: req.requestHeaders
  }
}

browser.webRequest.onBeforeSendHeaders.addListener(
  onBeforeSendHeaders,
  { urls: ["https://api.ttv.lol/playlist/*", "https://api.ttv.lol/vod/*"] },
  ["blocking", "requestHeaders"]
);