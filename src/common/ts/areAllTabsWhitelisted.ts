import { Tabs } from "webextension-polyfill";
import findChannelFromTwitchTvUrl from "./findChannelFromTwitchTvUrl";
import isChannelWhitelisted from "./isChannelWhitelisted";

export default function areAllTabsWhitelisted(tabs: Tabs.Tab[]): boolean {
  return tabs.every(tab => {
    const url = tab.url || tab.pendingUrl;
    if (!url) return false;
    const channelName = findChannelFromTwitchTvUrl(url);
    const isWhitelisted = channelName
      ? isChannelWhitelisted(channelName)
      : false;
    return isWhitelisted;
  });
}
