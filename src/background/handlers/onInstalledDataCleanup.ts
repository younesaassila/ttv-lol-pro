import { Runtime } from "webextension-polyfill";
import isChromium from "../../common/ts/isChromium";
import store from "../../store";

export default function onInstalledDataCleanup(
  details: Runtime.OnInstalledDetailsType
): void {
  if (store.readyState !== "complete")
    return store.addEventListener("load", () =>
      onInstalledDataCleanup(details)
    );

  if (details.reason === "update") {
    // Remove old Chromium normal proxy.
    if (
      store.state.normalProxies.includes("chrome.api.cdn-perfprod.com:4023")
    ) {
      store.state.normalProxies = store.state.normalProxies.filter(
        proxy => proxy !== "chrome.api.cdn-perfprod.com:4023"
      );
      if (store.state.normalProxies.length === 0) {
        store.state.optimizedProxiesEnabled = true;
      }
    }
    // Add new Chromium optimized proxy.
    if (
      isChromium &&
      !store.state.optimizedProxies.includes(
        "chromium.api.cdn-perfprod.com:2023"
      )
    ) {
      store.state.optimizedProxies.push("chromium.api.cdn-perfprod.com:2023");
    }
  }
}
