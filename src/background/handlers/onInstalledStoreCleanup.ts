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
      store.state.optimizedProxiesEnabled =
        store.state.normalProxies.length === 0;
    }
    // Add new Chromium optimized proxy.
    const newChromiumProxy = "chromium.api.cdn-perfprod.com:2023";
    if (
      isChromium &&
      !store.state.optimizedProxies.includes(newChromiumProxy)
    ) {
      // Remove Firefox optimized proxy (used during beta).
      const firefoxProxy = "firefox.api.cdn-perfprod.com:2023";
      if (store.state.optimizedProxies.includes(firefoxProxy)) {
        store.state.optimizedProxies = store.state.optimizedProxies.filter(
          proxy => proxy !== firefoxProxy
        );
      }

      store.state.optimizedProxies.push(newChromiumProxy);
    }
  }
}
