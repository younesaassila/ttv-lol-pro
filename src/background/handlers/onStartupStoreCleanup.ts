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

  store.state.streamStatuses = {};
}
