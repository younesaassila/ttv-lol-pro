import browser from "webextension-polyfill";
import isChromium from "../../common/ts/isChromium";
import {
  clearProxySettings,
  updateProxySettings,
} from "../../common/ts/proxySettings";
import store from "../../store";

export default function checkForOpenedTwitchTabs() {
  if (store.readyState !== "complete")
    return store.addEventListener("load", checkForOpenedTwitchTabs);

  browser.tabs
    .query({ url: ["https://www.twitch.tv/*", "https://m.twitch.tv/*"] })
    .then(tabs => {
      if (tabs.length === 0) {
        if (isChromium) clearProxySettings();
        return;
      }
      console.log(
        `🔍 Found ${tabs.length} opened Twitch tabs: ${tabs
          .map(tab => tab.id)
          .join(", ")}`
      );
      if (isChromium) {
        updateProxySettings();
      }
      store.state.openedTwitchTabs = tabs.map(tab => tab.id);
    });
}
