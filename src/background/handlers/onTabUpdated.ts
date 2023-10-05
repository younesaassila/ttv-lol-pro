import { Tabs } from "webextension-polyfill";
import areAllTabsWhitelisted from "../../common/ts/areAllTabsWhitelisted";
import getHostFromUrl from "../../common/ts/getHostFromUrl";
import isChromium from "../../common/ts/isChromium";
import {
  clearProxySettings,
  updateProxySettings,
} from "../../common/ts/proxySettings";
import { twitchTvHostRegex } from "../../common/ts/regexes";
import store from "../../store";
import onTabCreated from "./onTabCreated";
import onTabRemoved from "./onTabRemoved";

export default function onTabUpdated(
  tabId: number,
  changeInfo: Tabs.OnUpdatedChangeInfoType,
  tab: Tabs.Tab
): void {
  const isPageNavigation = changeInfo.url != null;
  // We have to check for `changeInfo.status === "loading"` because
  // `changeInfo.url` is incorrect when navigating from Twitch to another
  // website.
  const isPageLoad = changeInfo.status === "loading";
  if (!isPageNavigation && !isPageLoad) return;

  const url = changeInfo.url || tab.url || tab.pendingUrl;
  if (!url) return;
  const host = getHostFromUrl(url);
  if (!host) return;

  const isTwitchTab = twitchTvHostRegex.test(host);
  const wasTwitchTab = store.state.openedTwitchTabs.some(
    tab => tab.id === tabId
  );
  if (!isTwitchTab && !wasTwitchTab) return;

  // Tab created
  if (isTwitchTab && !wasTwitchTab) {
    onTabCreated(tab);
  }

  // Tab removed
  if (!isTwitchTab && wasTwitchTab) {
    onTabRemoved(tabId);
  }

  // Tab updated
  if (isTwitchTab && wasTwitchTab) {
    const index = store.state.openedTwitchTabs.findIndex(
      tab => tab.id === tabId
    );
    if (index === -1) return;

    console.log(`🟰 Updated Twitch tab: ${tabId}`);
    store.state.openedTwitchTabs[index] = tab;

    if (isChromium) {
      const allTabsAreWhitelisted = areAllTabsWhitelisted(
        store.state.openedTwitchTabs
      );
      // We don't check for `store.state.openedTwitchTabs.length === 0` because
      // there is always at least one tab open (the one that triggered this
      // event).
      if (!allTabsAreWhitelisted && !store.state.chromiumProxyActive) {
        updateProxySettings();
      } else if (allTabsAreWhitelisted && store.state.chromiumProxyActive) {
        clearProxySettings();
      }
    }
  }
}
