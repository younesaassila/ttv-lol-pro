import browser from "webextension-polyfill";

export default async function onActivated() {
  const icon = await getBrowserActionIcon();
  browser.browserAction.setIcon(icon);
}

async function getBrowserActionIcon(): Promise<browser.Action.SetIconDetailsType> {
  const ICON_GRAY_PATH = new URL("../../assets/icon-gray.png", import.meta.url);
  const ICON_PATH = new URL("../../assets/icon.png", import.meta.url);

  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  if (!activeTab || !activeTab.url) return { path: ICON_GRAY_PATH.href };
  try {
    const url = new URL(activeTab.url);
    if (url.hostname === "www.twitch.tv") {
      return { path: ICON_PATH.href };
    }
  } catch {}
  return { path: ICON_GRAY_PATH.href };
}
