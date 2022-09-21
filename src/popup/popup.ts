import { TWITCH_URL_REGEX } from "../common/ts/regexes";
import $ from "../common/ts/$";
import browser from "webextension-polyfill";
import store from "../store";
import toTitleCase from "../common/ts/toTitleCase";

const streamStatusElement = $("#stream-status") as HTMLDivElement;
const redirectedElement = $("#redirected") as HTMLSpanElement;
const streamIdElement = $("#stream-id") as HTMLSpanElement;
const reasonElement = $("#reason") as HTMLElement;
const proxyCountryElement = $("#proxy-country") as HTMLElement;
const whitelistToggleWrapper = $("#whitelist-toggle-wrapper") as HTMLDivElement;
const whitelistToggle = $("#whitelist-toggle") as HTMLInputElement;
const whitelistToggleLabel = $("#whitelist-toggle-label") as HTMLLabelElement;

store.addEventListener("load", async () => {
  const tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  const activeTab = tabs[0];
  if (activeTab == null) return;
  if (activeTab.url == null) return;

  const match = TWITCH_URL_REGEX.exec(activeTab.url);
  if (match == null) return;
  const [_, streamId] = match;
  if (streamId == null) return;

  const status = store.state.streamStatuses[streamId];
  if (status != null) {
    streamStatusElement.style.display = "flex";
    if (status.redirected) {
      redirectedElement.classList.remove("error");
      redirectedElement.classList.add("success");
    } else {
      redirectedElement.classList.remove("success");
      redirectedElement.classList.add("error");
    }
    streamIdElement.textContent = toTitleCase(streamId);
    if (status.reason) {
      reasonElement.textContent = status.reason;
    } else {
      reasonElement.style.display = "none";
    }
    if (status.proxyCountry) {
      proxyCountryElement.textContent = `Proxy country: ${status.proxyCountry}`;
    } else {
      proxyCountryElement.style.display = "none";
    }

    whitelistToggle.checked =
      store.state.whitelistedChannels.includes(streamId);
    whitelistToggle.addEventListener("change", e => {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        store.state.whitelistedChannels.push(streamId);
      } else {
        store.state.whitelistedChannels =
          store.state.whitelistedChannels.filter(id => id !== streamId);
      }
      updateWhitelistToggleLabel(target.checked);
      browser.tabs.reload();
    });
    updateWhitelistToggleLabel(whitelistToggle.checked);
    whitelistToggleWrapper.style.display = "block";
  } else {
    streamStatusElement.style.display = "none";
    whitelistToggleWrapper.style.display = "none";
  }
});

function updateWhitelistToggleLabel(checked: boolean) {
  if (checked) {
    whitelistToggleLabel.textContent = "✓ Whitelisted";
  } else {
    whitelistToggleLabel.textContent = "+ Whitelist";
  }
}
