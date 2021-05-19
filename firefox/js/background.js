function stripUnusedParams(str, params) {
    if (!params) {
        params = [ 'token', 'sig' ];
    }
    var tempUrl = new URL('https://localhost/' + str);
    for (var i = 0; i < params.length; i++) {
        tempUrl.searchParams.delete(params[i]);
    }
    return tempUrl.pathname.substring(1) + tempUrl.search;
}

function onPlaylistBeforeRequest(details) {

  details.url = stripUnusedParams(details.url, null);

  // (hls\/|vod\/)(.+?)$
  const match = /(hls|vod)\/(.+?)$/gim.exec(details.url);

  if (match !== null && match.length > 1) {
    var playlistType = match[1] == "vod" ? "vod" : "playlist";

    return new Promise(resolve => {
      fetch(
        'https://api.ttv.lol/ping',
        {
          method: 'GET',
        }).then(r => {
          if (r.status == 200) {
            resolve({ redirectUrl: `https://api.ttv.lol/${playlistType}/${encodeURIComponent(match[2])}` });
          } else {
            resolve({});
          }
        }).catch((error) => {
          resolve({});
        });
    });

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
