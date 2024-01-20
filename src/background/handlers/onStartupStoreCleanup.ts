import store from "../../store";

/*
 * WHY ARE WE DOING THIS?
 *
 * Since `browser.storage.session` is not supported in all browsers, we use
 * `browser.storage.local` instead. This means that the session-related data
 * (e.g. stream statuses) will persist across browser sessions. This function
 * cleans up the session-related data on startup.
 */
export default function onStartupStoreCleanup(): void {
  if (store.readyState !== "complete")
    return store.addEventListener("load", onStartupStoreCleanup);

  const now = Date.now();
  store.state.adLog = store.state.adLog.filter(
    entry => now - entry.timestamp < 1000 * 60 * 60 * 24 * 7 // 7 days
  );
  store.state.chromiumProxyActive = false;
  store.state.dnsResponses = [];
  store.state.openedTwitchTabs = [];
  store.state.streamStatuses = {};
  store.state.videoWeaverUrlsByChannel = {};
}
