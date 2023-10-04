import browser from "webextension-polyfill";
import isChannelWhitelisted from "../../common/ts/isChannelWhitelisted";
import isChromium from "../../common/ts/isChromium";
import { clearProxySettings } from "../../common/ts/proxySettings";
import store from "../../store";

export default function onTabRemoved(tabId: number): void {
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
              const Url = new URL(tab.url);
              if (!Url.pathname || Url.pathname == "/") return false;
              return isChannelWhitelisted(Url.pathname.substring(1));
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
