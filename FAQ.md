# Frequently Asked Questions (FAQ)

## Installation

#### Q) I'm on 1.9.3 and the extension doesn't auto-update to the V2 branch, why?

A) The V1 and V2 branches use different proxying systems, so we won't push any auto-updates to anyone if the V1 branch still works for them. We've also released the extension on Chrome Web Store and Firefox Addons Store to recieve auto-updates from there.

#### Q) Do you recommend me installing the extension from the stores or manually install it?

A) We strongly encourage users to install the extension through the stores as they can deliver automatic updates to improve the overall experience.

Chrome Web Store: https://chrome.google.com/webstore/detail/ttv-lol-pro/bpaoeijjlplfjbagceilcgbkcdjbomjd

Firefox Addons: https://addons.mozilla.org/addon/ttv-lol-pro/

Outdated builds can give unexpected results, please update to the latest version!

#### Q) When I click the Options menu on the extension I still have V1 proxies on them.

A) There's been some reports from users having this strange behavior. Please uninstall any other Twitch AdBlock extension before installing TTV LOL PRO. If you're installing TTV LOL PRO V2, please uninstall TTV LOL PRO V1 before installing it.

Alternatively, you can reset your settings to default provided on the Extension's Options Page.

#### Q) The V2 branch seems more updated, should I go for it?

A) Twitch does some really weird update rollouts. The V2 branch was created due to some users getting hit by ads using the V1 method.

We strongly recommend you trying out the V1 branch and only update to V2 if needed. V1 system is more reliable and works better than V2 using default proxies.

#### Q) Why does the Chrome extension need the permissions to read traffic on all websites?

A) We require a very specific permission for the V2 system to work, `proxy`, as specified [here](src/manifest.chromium.json). Chrome does a really aggresive naming to that permission, as if it's used in a malicious manner, an extension could forward all the requests to a proxy server of his choice.

You can take a look at the extension's source code. We only proxy the following domains related to Twitch for the system to work:

- `video-weaver.*.hls.ttvnw.net` (Required)
- `passport.twitch.tv` (Optional. Setting = ON by default)
- `usher.ttvnw.net` (Optional. Setting = ON by default)
- `gql.twitch.tv` (Optional. Setting = OFF by default)
- `www.twitch.tv`(Optional. Setting = OFF by default)

## Options Page

#### Q) What does `laissez-passer` mean and what it does?

A) We've been trying really hard to provide a reliable blocking method of ads on Twitch, but due to Twitch's specific countries rollouts, we needed to proxy more Twitch's traffic for those users.

By default we proxy `video-weaver.*.hls.ttvnw.net`, `passport.twitch.tv` and `usher.ttvnw.net` requests, altough there's some users that may still experience ads. We encourage those users to enable `laissez-passer` which enables proxying of two extra domains, `www.twitch.tv` (homepage only) and `gql.twitch.tv`. Enabling `laissez-passer` can enable some features which are not available in your country, please check disclaimer on the extension's Options Page.

#### Q) Wow, you proxy a lot of my Twitch traffic, can my account be hijacked from this?

A) Twitch has been using the HTTPS protocol for years now, such as basically every website on the planet. This means that the traffic is encrypted between you and Twitch's servers. The proxy server can't see anything based on your traffic. The only information that a proxy could obtain is that your public IP address is accessing `www.twitch.tv` (for example) at 3AM, there's no more information, as the proxy only acts as a "forwarding" server.

The default provided proxies only stores logs of connections for 24h, after that they're all purged. This is done to improve the proxy performance as we can see usage stats based on that. If you don't like this, we suggest creating your own proxy server using the following [how-to](https://github.com/younesaassila/ttv-lol-pro/discussions/151),

Keep in mind that all ISPs and providers can still see your IP address and domains you access, that information is not encrypted.

## Ad Blocking

### Firefox

#### Q) AdBlocking seems to partially work, I do get pre-rolls but not mid-rolls

A) This is easily fixed by enabling `laissez-passer`. Please read the disclaimer on the extension's Options Page

#### Q) I don't get any pre-rolls but I always get hit by mid-rolls

A) Firefox's Extension has some techniques to optimize your requests to the proxy server. Some users may be affected by this, thus getting hit by mid-rolls. Reloading your Twitch page or resetting your player could get rid of those, but if you feel that it is annoying, we encourage you to switch to "Proxy all requests" on the Options Tab.

Proxying all requests will overload more the default proxy servers, thus we only recommend this as last resort.

#### Q) My non-proxied count keeps going up, is this normal?

A) On Firefox, by default, you have the option "Proxy ad requests" selected. If that's the case, this is completely normal and you shouldn't worry about anything. Your ads will be blocked only when Twitch's server triggers it to you. This reduces significantly the load on the servers and bandwidth consumption.

### Chrome

#### Q) I do still get ads after installing it, what should I do)

A) This is easily fixed by enabling `laissez-passer`. Please read the disclaimer on the extension's Options Page

#### Q) My non-proxied count keeps going up, is this normal?

A) On Chrome, all your weavers (Proxied) requests should be being proxied for the blocker to be working correctly. If you're using the public proxies, refer to [here](#q-i-have-constant-buffering-streams-appear-as-offline-). If you're self-hosting, make sure your connections to your server are being successful.

### All platforms

#### Q) I have constant buffering, streams appear as offline, ...

A) Default proxies are provided with the best experience possible with a budget in mind. Public proxies are hosted in Europe, thus Europe users shouldn't have any issues, but America/Asia/... users can be affected from this on peak hours.

We're sorry for this, but the V2 system is very bandwidth/CPU intensive thus making it not budget-friendly to deploy on other regions.

You have the option to host your own proxy server using the following [guide](https://github.com/younesaassila/ttv-lol-pro/discussions/151), thus keep in mind that you're on your own.

If you feel like supporting the project and getting some sweet benefits, please consider sponsoring Younes or Marc. We do offer private proxies hosted in EU, NA and AS:

Support the extension development: https://github.com/sponsors/younesaassila

Support the proxies costs: https://github.com/sponsors/zGato

Please take a look at Marc's Sponsors page for the perks: https://github.com/sponsors/zGato. You can make the donation to either Younes or Marc, the perks will be the same.

Thank you for your support.

## Others

#### Q) I can't login back to Twitch with the extension enabled

A) **TLDR:** Disable the extension to login, after doing so you can enable it back and you'll not be prompted to login for a long time again.

This has been answered before [here](https://github.com/younesaassila/ttv-lol-pro/issues/198). If you're using your own self-hosted proxy you shouldn't have this issue, but if you're using the public proxies or you have multiple self-hosted proxies and you have them behind a round robin loadbalancer you may experience this issue.

To fix it, make sure all your requests are being proxied through the same server, and not proxied through different ones at the same time. You can use IP hash algorithms for this for example.
