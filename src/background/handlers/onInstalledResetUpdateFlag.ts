import { Runtime } from "webextension-polyfill";
import store from "../../store";

export default function onInstalledResetUpdateFlag(
  details: Runtime.OnInstalledDetailsType
) {
  if (details.reason !== "update") return;
  // Wait for the store to be ready (it may not be ready at extension startup).
  if (store.readyState !== "complete")
    return store.addEventListener("load", () =>
      onInstalledResetUpdateFlag(details)
    );

  store.state.isUpdateAvailable = false;
}
