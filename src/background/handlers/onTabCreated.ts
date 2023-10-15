import { Tabs } from "webextension-polyfill";
import findChannelFromTwitchTvUrl from "../../common/ts/findChannelFromTwitchTvUrl";
import getHostFromUrl from "../../common/ts/getHostFromUrl";
import isChannelWhitelisted from "../../common/ts/isChannelWhitelisted";
import isChromium from "../../common/ts/isChromium";
import { updateProxySettings } from "../../common/ts/proxySettings";
import { twitchTvHostRegex } from "../../common/ts/regexes";
import store from "../../store";

export default function onTabCreated(tab: Tabs.Tab): void {
  if (store.readyState !== "complete")
    return store.addEventListener("load", () => onTabCreated(tab));

  const url = tab.url || tab.pendingUrl;
  if (!url) return;
  const host = getHostFromUrl(url);
  if (!host) return;

  // TODO: `twitchTvHostRegex` doesn't match `appeals.twitch.tv` and
  // `dashboard.twitch.tv` which means that passport requests from those
  // subdomains will not be proxied. This could mess up the cookie country.
  if (twitchTvHostRegex.test(host)) {
    console.log(`➕ Opened Twitch tab: ${tab.id}`);
    store.state.openedTwitchTabs.push(tab);

    if (isChromium) {
      const channelName = findChannelFromTwitchTvUrl(url);
      const isWhitelisted = channelName
        ? isChannelWhitelisted(channelName)
        : false;
      if (!isWhitelisted && !store.state.chromiumProxyActive) {
        updateProxySettings();
      }
    }
  }
}
