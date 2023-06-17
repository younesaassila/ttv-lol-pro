import isChromium from "../../common/ts/isChromium";
import { clearProxySettings } from "../../common/ts/proxySettings";
import store from "../../store";

export default function onTabRemoved(tabId: number): void {
  const index = store.state.openedTwitchTabs.indexOf(tabId);
  if (index !== -1) {
    console.log(`➖ Closed Twitch tab: ${tabId}`);
    store.state.openedTwitchTabs.splice(index, 1);
    if (isChromium && store.state.openedTwitchTabs.length === 0) {
      clearProxySettings();
    }
  }
}
