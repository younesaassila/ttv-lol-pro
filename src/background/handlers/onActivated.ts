import browser from "webextension-polyfill";

const ICON_GRAY_PATH = new URL("../../assets/icon-gray.png", import.meta.url);
const ICON_PATH = new URL("../../assets/icon.png", import.meta.url);

let activeTabId: number | undefined;

export default async function onActivated() {
  await setBrowserActionIcon();
  browser.tabs.onUpdated.removeListener(setBrowserActionIcon);
  browser.tabs.onUpdated.addListener(setBrowserActionIcon, {
    tabId: activeTabId,
  });
}

async function setBrowserActionIcon() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  if (activeTab) {
    activeTabId = activeTab.id;
  }
  const icon = await getBrowserActionIcon(activeTab);
  browser.browserAction.setIcon(icon);
}

async function getBrowserActionIcon(
  activeTab: browser.Tabs.Tab | undefined
): Promise<browser.Action.SetIconDetailsType> {
  if (!activeTab || !activeTab.url) return { path: ICON_GRAY_PATH.href };
  try {
    const url = new URL(activeTab.url);
    if (url.hostname === "www.twitch.tv") {
      return { path: ICON_PATH.href };
    }
  } catch {}
  return { path: ICON_GRAY_PATH.href };
}
