import { Tabs } from "webextension-polyfill";
import getHostFromUrl from "../../common/ts/getHostFromUrl";
import isChannelWhitelisted from "../../common/ts/isChannelWhitelisted";
import isChromium from "../../common/ts/isChromium";
import { updateProxySettings } from "../../common/ts/proxySettings";
import { twitchTvHostRegex } from "../../common/ts/regexes";
import store from "../../store";

export default function onTabCreated(tab: Tabs.Tab): void {
  if (!tab.url || tab.id == null) return;
  const host = getHostFromUrl(tab.url);
  if (host != null && twitchTvHostRegex.test(host)) {
    console.log(`➕ Opened Twitch tab: ${tab.id}`);
    if (isChromium) {
      let isNonWhitelistedChannel = true;
      const Url = new URL(tab.url);
      if (Url.pathname && Url.pathname.length > 0) {
        isNonWhitelistedChannel = !isChannelWhitelisted(
          Url.pathname.substring(1)
        );
      }
      if (isNonWhitelistedChannel && !store.state.chromiumProxyActive)
        updateProxySettings();
    }
    store.state.openedTwitchTabs.push(tab.id);
  }
}
