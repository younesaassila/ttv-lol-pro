import browser from "webextension-polyfill";
import findChannelFromTwitchTvUrl from "../../common/ts/findChannelFromTwitchTvUrl";
import isChannelWhitelisted from "../../common/ts/isChannelWhitelisted";
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
      console.log(
        `🔍 Found ${tabs.length} opened Twitch tabs: ${tabs
          .map(tab => tab.id)
          .join(", ")}`
      );
      store.state.openedTwitchTabs = tabs;

      if (isChromium) {
        const allTabsAreWhitelisted = tabs.every(tab => {
          if (!tab.url) return false;
          const channelName = findChannelFromTwitchTvUrl(tab.url);
          const isWhitelisted = channelName
            ? isChannelWhitelisted(channelName)
            : false;
          return isWhitelisted;
        });
        if (tabs.length === 0 || allTabsAreWhitelisted) {
          clearProxySettings();
        } else {
          updateProxySettings();
        }
      }
    });
}
