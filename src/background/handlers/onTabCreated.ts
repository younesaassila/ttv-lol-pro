import { Tabs } from "webextension-polyfill";
import getHostFromUrl from "../../common/ts/getHostFromUrl";
import isChromium from "../../common/ts/isChromium";
import { updateProxySettings } from "../../common/ts/proxySettings";
import { twitchTvHostRegex } from "../../common/ts/regexes";
import store from "../../store";

export default function onTabCreated(tab: Tabs.Tab): void {
  if (!tab.url || !tab.id) return;
  const host = getHostFromUrl(tab.url);
  if (host != null && twitchTvHostRegex.test(host)) {
    console.log(`➕ Opened Twitch tab: ${tab.id}`);
    if (isChromium && store.state.openedTwitchTabs.length === 0) {
      updateProxySettings();
    }
    store.state.openedTwitchTabs.push(tab.id);
  }
}
