import { Tabs } from "webextension-polyfill";
import getHostFromUrl from "../../common/ts/getHostFromUrl";
import isChromium from "../../common/ts/isChromium";
import {
  clearProxySettings,
  updateProxySettings,
} from "../../common/ts/proxySettings";
import { twitchTvHostRegex } from "../../common/ts/regexes";
import store from "../../store";

export default function onTabUpdated(
  tabId: number,
  changeInfo: Tabs.OnUpdatedChangeInfoType,
  tab: Tabs.Tab
): void {
  // Also check for `changeInfo.status === "complete"` because the `url` property
  // is not always accurate when navigating to a new page.
  if (!(changeInfo.url || changeInfo.status === "complete")) return;

  const url = changeInfo.url || tab.url;
  const host = getHostFromUrl(url);
  const isTwitchTab = twitchTvHostRegex.test(host);
  const wasTwitchTab = store.state.openedTwitchTabs.includes(tabId);

  if (isTwitchTab && !wasTwitchTab) {
    console.log(`➕ Opened Twitch tab: ${tabId}`);
    if (isChromium && store.state.openedTwitchTabs.length === 0) {
      updateProxySettings();
    }
    store.state.openedTwitchTabs.push(tabId);
  }
  if (!isTwitchTab && wasTwitchTab) {
    const index = store.state.openedTwitchTabs.indexOf(tabId);
    if (index !== -1) {
      console.log(`➖ Closed Twitch tab: ${tabId}`);
      store.state.openedTwitchTabs.splice(index, 1);
      if (isChromium && store.state.openedTwitchTabs.length === 0) {
        clearProxySettings();
      }
    }
  }
}
