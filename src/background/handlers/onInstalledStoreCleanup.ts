import { Runtime } from "webextension-polyfill";
import isChromium from "../../common/ts/isChromium";
import store from "../../store";

export default function onInstalledStoreCleanup(
  details: Runtime.OnInstalledDetailsType
): void {
  if (store.readyState !== "complete")
    return store.addEventListener("load", () =>
      onInstalledStoreCleanup(details)
    );

  if (details.reason === "update") {
    // Remove old Chromium normal proxy.
    const oldChromiumProxy = "chrome.api.cdn-perfprod.com:4023";
    if (store.state.normalProxies.includes(oldChromiumProxy)) {
      store.state.normalProxies = store.state.normalProxies.filter(
        proxy => proxy !== oldChromiumProxy
      );
      if (store.state.normalProxies.length === 0) {
        store.state.optimizedProxiesEnabled = true;
      }
    }
    // Add new Chromium optimized proxy.
    const newChromiumProxy = "chromium.api.cdn-perfprod.com:2023";
    if (
      isChromium &&
      !store.state.optimizedProxies.includes(newChromiumProxy)
    ) {
      store.state.optimizedProxies.push(newChromiumProxy);
    }
  }
}
