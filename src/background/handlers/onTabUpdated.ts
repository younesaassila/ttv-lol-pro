import browser, { Tabs } from "webextension-polyfill";
import getHostFromUrl from "../../common/ts/getHostFromUrl";
import isChannelWhitelisted from "../../common/ts/isChannelWhitelisted";
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
  if (!url) return;
  const host = getHostFromUrl(url);
  const isTwitchTab = host != null && twitchTvHostRegex.test(host);
  const wasTwitchTab = store.state.openedTwitchTabs.includes(tabId);

  if (isTwitchTab && !wasTwitchTab) {
    console.log(`➕ Opened Twitch tab: ${tabId}`);
    if (isChromium) {
      var isNonWhitelistedPage = true;
      const urlObj = new URL(url);
      if (urlObj.pathname && urlObj.pathname.length > 0) {
        isNonWhitelistedPage = !isChannelWhitelisted(
          urlObj.pathname.substring(1)
        );
      }
      if (isNonWhitelistedPage) updateProxySettings();
    }
    store.state.openedTwitchTabs.push(tabId);
  }
  if (!isTwitchTab && wasTwitchTab) {
    const index = store.state.openedTwitchTabs.indexOf(tabId);
    if (index !== -1) {
      console.log(`➖ Closed Twitch tab: ${tabId}`);
      store.state.openedTwitchTabs.splice(index, 1);
      if (isChromium) {
        if (store.state.openedTwitchTabs.length === 0) {
          clearProxySettings();
          return;
        }

        Promise.all(
          store.state.openedTwitchTabs.map(tabId => {
            return browser.tabs
              .get(tabId)
              .then(tab => {
                if (!tab.url) return false;
                const url = new URL(tab.url);
                if (!url.pathname || url.pathname == "/") return false;
                return isChannelWhitelisted(url.pathname.substring(1));
              })
              .catch(() => false);
          })
        ).then(res => {
          if (!res.includes(false) && store.state.chromiumProxyActive) {
            clearProxySettings();
          }
        });
      }
    }
  }
  if (isTwitchTab && wasTwitchTab) {
    console.log(`Changed Twitch tab: ${tabId}`);
    if (isChromium) {
      Promise.all(
        store.state.openedTwitchTabs.map(tabId => {
          return browser.tabs
            .get(tabId)
            .then(tab => {
              if (!tab.url) return false;
              const url = new URL(tab.url);
              if (!url.pathname || url.pathname == "/") return false;
              return isChannelWhitelisted(url.pathname.substring(1));
            })
            .catch(() => false);
        })
      ).then(res => {
        if (!res.includes(false) && store.state.chromiumProxyActive) {
          clearProxySettings();
        } else if (res.includes(false) && !store.state.chromiumProxyActive) {
          updateProxySettings();
        }
      });
    }
  }
}
