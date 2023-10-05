import browser from "webextension-polyfill";
import areAllTabsWhitelisted from "../../common/ts/areAllTabsWhitelisted";
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
      console.log(`🔍 Found ${tabs.length} opened Twitch tabs.`);
      store.state.openedTwitchTabs = tabs;

      if (isChromium) {
        const allTabsAreWhitelisted = areAllTabsWhitelisted(tabs);
        if (tabs.length === 0 || allTabsAreWhitelisted) {
          clearProxySettings();
        } else {
          updateProxySettings();
        }
      }
    });
}
