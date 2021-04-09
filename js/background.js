function onBeforeRequest(details) {
  const match = /hls\/(.+?)$/gim.exec(details.url);

  if (match !== null && match.length > 1) {

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
        redirectUrl: `https://api.ttv.lol/playlist/${encodeURIComponent(match[1])}`,
      };
    }

  }
}

chrome.webRequest.onBeforeRequest.addListener(
  onBeforeRequest,
  { urls: ["https://usher.ttvnw.net/api/channel/hls/*"] },
  ["blocking", "extraHeaders"]
);

function onBeforeSendHeaders(req) {
  req.requestHeaders.push({ name: 'X-Donate-To', value: "https://ttv.lol/donate" })
  return {
    requestHeaders: req.requestHeaders
  }
}

chrome.webRequest.onBeforeSendHeaders.addListener(
  onBeforeSendHeaders,
  { urls: ["https://api.ttv.lol/playlist/*"] },
  ["blocking", "requestHeaders"]
);