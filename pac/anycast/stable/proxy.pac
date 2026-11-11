function FindProxyForURL(url, host) {
    // old video-weaver server
    if (shExpMatch(host, "video-weaver\.*\.hls\.ttvnw\.net")) {
      return "PROXY stable.restricted.api.cdn-perfprod.com:6691";
    }

    // new weaver server
    if (shExpMatch(host, "\*.playlist\.live-video\.net")) {
        return "PROXY stable.restricted.api.cdn-perfprod.com:6691";
    }

    // new weaver server
    if (shExpMatch(host, "\*.playlist\.ttvnw\.net")) {
        return "PROXY stable.restricted.api.cdn-perfprod.com:6691";
    }
    
    // usher request proxying / twitch cdn assignment
    if (shExpMatch(host, "usher.ttvnw.net")) {
      return "PROXY stable.restricted.api.cdn-perfprod.com:6691";
    }

    // main website
    if (shExpMatch(host, "www.twitch.tv")) {
      return "PROXY stable.restricted.api.cdn-perfprod.com:6691";
    }

    // graphql
    if (shExpMatch(host, "gql.twitch.tv")) {
      return "PROXY stable.restricted.api.cdn-perfprod.com:6691";
    }

    // passport / used for authentication?
    if (shExpMatch(host, "passport.twitch.tv")) {
      return "PROXY stable.restricted.api.cdn-perfprod.com:6691";
    }
  
    // for testing purposes (know if you're connected to X loadbalancer or not)
    if (shExpMatch(host, "example.org")) {
      return "PROXY stable.restricted.api.cdn-perfprod.com:6691";
    }
  
    // block edge.ads.twitch.tv, which may fix ads being shown to some users
    // proxy will return an error as we can't proxy the following domain, so this will kind of act as a "dns blackhole"
    if (shExpMatch(host, "edge.ads.twitch.tv")) {
      return "PROXY stable.restricted.api.cdn-perfprod.com:6691";
    }
  
    // all other requests simply gets thru without any proxy involved
    return "DIRECT";
  }