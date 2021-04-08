function onBeforeRequest(details) {
  const match = /hls\/(.+?)$/gim.exec(details.url);

  console.log("details:", details);

  if (match !== null && match.length > 1) {
    return { 
      redirectUrl: `https://api.ttv.lol/playlist/${encodeURIComponent(match[1])}`,
    };
  }
}

chrome.webRequest.onBeforeRequest.addListener(
  onBeforeRequest,
  { urls: ["https://usher.ttvnw.net/api/channel/hls/*"] },
  ["blocking", "extraHeaders"]
);

function onBeforeSendHeaders(req) {
  console.log("onBeforeSendHeaders:", req.requestHeaders);
  req.requestHeaders.push({name:'X-Donate-To', value:"http://bowlcuts-r-us.com"})
  return {
    requestHeaders: req.requestHeaders
  }
}

chrome.webRequest.onBeforeSendHeaders.addListener(
  onBeforeSendHeaders,
  { urls: ["https://api.ttv.lol/playlist/*"] },
  ["blocking","requestHeaders"]
);