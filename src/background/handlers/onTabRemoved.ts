import findChannelFromTwitchTvUrl from "../../common/ts/findChannelFromTwitchTvUrl";
import isChannelWhitelisted from "../../common/ts/isChannelWhitelisted";
import isChromium from "../../common/ts/isChromium";
import { clearProxySettings } from "../../common/ts/proxySettings";
import store from "../../store";

export default function onTabRemoved(tabId: number): void {
  const index = store.state.openedTwitchTabs.findIndex(tab => tab.id === tabId);
  if (index === -1) return;

  console.log(`➖ Closed Twitch tab: ${tabId}`);
  store.state.openedTwitchTabs.splice(index, 1);

  if (isChromium) {
    const allTabsAreWhitelisted = store.state.openedTwitchTabs.every(tab => {
      if (!tab.url) return false;
      const channelName = findChannelFromTwitchTvUrl(tab.url);
      const isWhitelisted = channelName
        ? isChannelWhitelisted(channelName)
        : false;
      return isWhitelisted;
    });
    if (
      (store.state.openedTwitchTabs.length === 0 || allTabsAreWhitelisted) &&
      store.state.chromiumProxyActive
    ) {
      clearProxySettings();
    }
  }
}
