import Bowser from "bowser";
import browser from "webextension-polyfill";
import $ from "../common/ts/$";
import { TWITCH_URL_REGEX } from "../common/ts/regexes";
import store from "../store";
import type { StreamStatus } from "../types";

//#region HTML Elements
const updateBannerElement = $("#update-banner") as HTMLDivElement;
const streamStatusElement = $("#stream-status") as HTMLDivElement;
const redirectedElement = $("#redirected") as HTMLDivElement;
const streamIdElement = $("#stream-id") as HTMLHeadingElement;
const reasonElement = $("#reason") as HTMLParagraphElement;
const proxyCountryElement = $("#proxy-country") as HTMLElement;
const whitelistStatusElement = $("#whitelist-status") as HTMLDivElement;
const whitelistToggleElement = $("#whitelist-toggle") as HTMLInputElement;
const copyDebugInfoButtonElement = $(
  "#copy-debug-info-button"
) as HTMLButtonElement;
const copyDebugInfoButtonDescriptionElement = $(
  "#copy-debug-info-button-description"
) as HTMLParagraphElement;
//#endregion

if (store.readyState === "complete") main();
else store.addEventListener("load", main);

async function main() {
  // Show update banner if an update is available.
  if (store.state.isUpdateAvailable) {
    updateBannerElement.style.display = "block";
  }

  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  if (!activeTab || !activeTab.url) return;

  const match = TWITCH_URL_REGEX.exec(activeTab.url);
  if (!match) return;
  const [, streamId] = match;
  if (!streamId) return;

  setStreamStatusElement(streamId);
  store.addEventListener("change", () => setStreamStatusElement(streamId));
}

function setStreamStatusElement(streamId: string) {
  const streamIdLower = streamId.toLowerCase();
  const status = store.state.streamStatuses[streamIdLower];
  if (status) {
    setProxyStatus(streamIdLower, status);
    setWhitelistStatus(streamIdLower);
    streamStatusElement.style.display = "flex";
  } else {
    streamStatusElement.style.display = "none";
  }
}

function setProxyStatus(streamIdLower: string, status: StreamStatus) {
  // Redirected
  if (status.redirected) {
    redirectedElement.classList.remove("error");
    redirectedElement.classList.add("success");
  } else {
    redirectedElement.classList.remove("success");
    redirectedElement.classList.add("error");
  }
  // Stream ID
  streamIdElement.textContent = streamIdLower;
  // Reason
  if (status.reason) {
    reasonElement.textContent = status.reason;
    reasonElement.style.display = "";
  } else {
    reasonElement.style.display = "none";
  }
  // Proxy country
  if (status.proxyCountry) {
    proxyCountryElement.textContent = `Proxy country: ${status.proxyCountry}`;
    proxyCountryElement.style.display = "";
  } else {
    proxyCountryElement.style.display = "none";
  }
}

function setWhitelistStatus(streamIdLower: string) {
  const whitelistedChannelsLower = store.state.whitelistedChannels.map(id =>
    id.toLowerCase()
  );
  const isWhitelisted = whitelistedChannelsLower.includes(streamIdLower);
  whitelistStatusElement.setAttribute("data-whitelisted", `${isWhitelisted}`);
  whitelistToggleElement.checked = isWhitelisted;
  whitelistToggleElement.addEventListener("change", e => {
    const target = e.target as HTMLInputElement;
    const isWhitelisted = target.checked;
    if (isWhitelisted) {
      // Add stream ID to whitelist.
      store.state.whitelistedChannels.push(streamIdLower);
    } else {
      // Remove stream ID from whitelist.
      store.state.whitelistedChannels = store.state.whitelistedChannels.filter(
        id => id !== streamIdLower
      );
    }
    whitelistStatusElement.setAttribute("data-whitelisted", `${isWhitelisted}`);
    browser.tabs.reload();
  });
}

copyDebugInfoButtonElement.addEventListener("click", async () => {
  const extensionInfo = await browser.management.getSelf();
  const userAgentParser = Bowser.getParser(window.navigator.userAgent);

  const debugInfo = [
    `${extensionInfo.name} v${extensionInfo.version}`,
    `- Install type: ${extensionInfo.installType}`,
    `- Browser: ${userAgentParser.getBrowserName()} ${userAgentParser.getBrowserVersion()}`,
    `- OS: ${userAgentParser.getOSName()} ${userAgentParser.getOSVersion()}`,
    `- Servers: ${JSON.stringify(store.state.servers)}`,
    `- Reset player on midroll: ${store.state.resetPlayerOnMidroll}`,
  ].join("\n");

  try {
    await navigator.clipboard.writeText(debugInfo);
    copyDebugInfoButtonDescriptionElement.textContent = "Copied to clipboard!";
  } catch (error) {
    console.error(error);
    copyDebugInfoButtonDescriptionElement.textContent =
      "Failed to copy to clipboard.";
  }
});
