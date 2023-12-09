import browser from "webextension-polyfill";
import onTabCreated from "./onTabCreated";
import onTabRemoved from "./onTabRemoved";

export default function onTabReplaced(
  addedTabId: number,
  removedTabId: number
): void {
  onTabRemoved(removedTabId);
  browser.tabs
    .get(addedTabId)
    .then(tab => onTabCreated(tab))
    .catch(() => console.error("❌ Failed to get tab after replacement."));
}
