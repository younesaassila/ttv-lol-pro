import browser from "webextension-polyfill";
import isChromium from "../../common/ts/isChromium";
import updateProxySettings from "../../common/ts/updateProxySettings";
import store from "../../store";

export default function checkForOpenedTwitchTabs() {
  if (store.readyState !== "complete")
    return store.addEventListener("load", checkForOpenedTwitchTabs);

  browser.tabs.query({ url: ["https://*.twitch.tv/*"] }).then(tabs => {
    if (tabs.length === 0) return;
    console.log(
      `🔍 Found ${tabs.length} opened Twitch tabs: ${tabs
        .map(tab => tab.id)
        .join(", ")}`
    );
    if (isChromium) {
      updateProxySettings();
    }
    tabs.forEach(tab => store.state.openedTwitchTabs.push(tab.id));
  });
}
