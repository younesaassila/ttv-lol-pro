import Bowser from "bowser";
import browser from "webextension-polyfill";
import $ from "../common/ts/$";
import { twitchChannelNameRegex } from "../common/ts/regexes";
import store from "../store";
import type { StreamStatus } from "../types";

//#region HTML Elements
const streamStatusElement = $("#stream-status") as HTMLDivElement;
const proxiedElement = $("#proxied") as HTMLDivElement;
const channelNameElement = $("#channel-name") as HTMLHeadingElement;
const reasonElement = $("#reason") as HTMLParagraphElement;
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
    proxiedElement.classList.add("success");
  } else {
    proxiedElement.classList.remove("success");
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
    `- Proxy Twitch webpage: ${store.state.proxyTwitchWebpage}`,
    `- Proxy Usher requests: ${store.state.proxyUsherRequests}`,
    `- Usher proxies: ${JSON.stringify(store.state.usherProxies)}`,
    `- Video Weaver proxies: ${JSON.stringify(store.state.videoWeaverProxies)}`,
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
