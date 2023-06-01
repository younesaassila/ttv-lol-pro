import Bowser from "bowser";
import browser from "webextension-polyfill";
import $ from "../common/ts/$";
import isChromium from "../common/ts/isChromium";
import { twitchChannelNameRegex } from "../common/ts/regexes";
import store from "../store";
import type { StreamStatus } from "../types";

//#region HTML Elements
const warningBannerElement = $("#warning-banner") as HTMLDivElement;
const streamStatusElement = $("#stream-status") as HTMLDivElement;
const proxiedElement = $("#proxied") as HTMLDivElement;
const channelNameElement = $("#channel-name") as HTMLHeadingElement;
const reasonElement = $("#reason") as HTMLParagraphElement;
const infoElement = $("#info") as HTMLElement;
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
  if (isChromium && store.state.normalProxies.length === 0) {
    warningBannerElement.style.display = "block";
  } else if (
    !isChromium &&
    store.state.optimizedProxiesEnabled &&
    store.state.optimizedProxies.length === 0
  ) {
    warningBannerElement.style.display = "block";
  } else if (
    !isChromium &&
    !store.state.optimizedProxiesEnabled &&
    store.state.normalProxies.length === 0
  ) {
    warningBannerElement.style.display = "block";
  }

  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  if (!activeTab || !activeTab.url) return;

  const match = twitchChannelNameRegex.exec(activeTab.url);
  if (!match) return;
  const [, channelName] = match;
  if (!channelName) return;

  setStreamStatusElement(channelName);
  store.addEventListener("change", () => setStreamStatusElement(channelName));
}

function setStreamStatusElement(channelName: string) {
  const channelNameLower = channelName.toLowerCase();
  const status = store.state.streamStatuses[channelNameLower];
  if (status) {
    setProxyStatus(channelNameLower, status);
    setWhitelistStatus(channelNameLower);
    streamStatusElement.style.display = "flex";
  } else {
    streamStatusElement.style.display = "none";
  }
}

function setProxyStatus(channelNameLower: string, status: StreamStatus) {
  // Proxied
  if (status.proxied) {
    proxiedElement.classList.remove("error");
    proxiedElement.classList.remove("idle");
    proxiedElement.classList.add("success");
  } else if (
    !status.proxied &&
    store.state.optimizedProxiesEnabled &&
    store.state.optimizedProxies.length > 0
  ) {
    proxiedElement.classList.remove("error");
    proxiedElement.classList.remove("success");
    proxiedElement.classList.add("idle");
  } else {
    proxiedElement.classList.remove("success");
    proxiedElement.classList.remove("idle");
    proxiedElement.classList.add("error");
  }
  // Channel name
  channelNameElement.textContent = channelNameLower;
  // Reason
  if (status.reason) {
    reasonElement.textContent = status.reason;
    reasonElement.style.display = "";
  } else {
    reasonElement.style.display = "none";
  }
  // Info
  let messages = [];
  if (status.proxyHost) {
    messages.push(`Proxy: ${status.proxyHost}`);
  }
  if (status.proxyCountry) {
    messages.push(`Country: ${status.proxyCountry}`);
  }
  if (store.state.optimizedProxiesEnabled) {
    messages.push("Optimized proxies enabled");
  }
  if (messages.length > 0) {
    infoElement.textContent = messages.join(", ");
    infoElement.style.display = "block";
  }
}

function setWhitelistStatus(channelNameLower: string) {
  const whitelistedChannelsLower = store.state.whitelistedChannels.map(id =>
    id.toLowerCase()
  );
  const isWhitelisted = whitelistedChannelsLower.includes(channelNameLower);
  whitelistStatusElement.setAttribute("data-whitelisted", `${isWhitelisted}`);
  whitelistToggleElement.checked = isWhitelisted;
  whitelistToggleElement.addEventListener("change", e => {
    const target = e.target as HTMLInputElement;
    const isWhitelisted = target.checked;
    if (isWhitelisted) {
      // Add channel name to whitelist.
      store.state.whitelistedChannels.push(channelNameLower);
    } else {
      // Remove channel name from whitelist.
      store.state.whitelistedChannels = store.state.whitelistedChannels.filter(
        id => id !== channelNameLower
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
    `- Passport enabled: ${store.state.proxyUsherRequests}`,
    `- Is laissez-passer: ${store.state.proxyTwitchWebpage}`,
    `- Optimized proxies enabled: ${store.state.optimizedProxiesEnabled}`,
    `- Optimized proxies: ${JSON.stringify(store.state.optimizedProxies)}`,
    `- Normal proxies: ${JSON.stringify(store.state.normalProxies)}`,
    `- Last ad log entry: ${
      store.state.adLog.length
        ? JSON.stringify({
            ...store.state.adLog[store.state.adLog.length - 1],
            videoWeaverUrl: undefined,
          })
        : "N/A"
    }`,
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
