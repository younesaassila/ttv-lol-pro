import areAllTabsWhitelisted from "../../common/ts/areAllTabsWhitelisted";
import isChromium from "../../common/ts/isChromium";
import { clearProxySettings } from "../../common/ts/proxySettings";
import store from "../../store";

export default function onTabRemoved(tabId: number): void {
  if (store.readyState !== "complete")
    return store.addEventListener("load", () => onTabRemoved(tabId));

  const index = store.state.openedTwitchTabs.findIndex(tab => tab.id === tabId);
  if (index === -1) return;

  console.log(`➖ Closed Twitch tab: ${tabId}`);
  store.state.openedTwitchTabs.splice(index, 1);

  if (isChromium) {
    const allTabsAreWhitelisted = areAllTabsWhitelisted(
      store.state.openedTwitchTabs
    );
    if (
      (store.state.openedTwitchTabs.length === 0 || allTabsAreWhitelisted) &&
      store.state.chromiumProxyActive
    ) {
      clearProxySettings();
    }
  }
}
