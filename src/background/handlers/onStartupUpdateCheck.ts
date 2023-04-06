import semverCompare from "semver-compare";
import browser from "webextension-polyfill";
import store from "../../store";

//#region Types
type Update = {
  version: string;
  update_link: string;
};
//#endregion

export default async function onStartupUpdateCheck(): Promise<void> {
  if (store.readyState !== "complete")
    return store.addEventListener("load", onStartupUpdateCheck);

  if (!store.state.checkForUpdates) return;

  // Check for updates once every 24 hours.
  if (
    !store.state.isUpdateAvailable &&
    Date.now() - store.state.lastUpdateCheck < 24 * 60 * 60 * 1000
  ) {
    return;
  }

  const manifest = browser.runtime.getManifest();
  const currentVersion = manifest.version;
  const updateUrl = manifest.browser_specific_settings?.gecko?.update_url;
  if (!updateUrl) {
    console.warn("Update URL not found.");
    store.state.isUpdateAvailable = false;
    return;
  }

  try {
    const response = await fetch(updateUrl);
    const json = await response.json();
    const updates = json.addons["{76ef94a4-e3d0-4c6f-961a-d38a429a332b}"]
      .updates as Update[];
    updates.sort((a, b) => semverCompare(a.version, b.version));
    const latestVersion = updates[updates.length - 1].version;
    store.state.isUpdateAvailable =
      semverCompare(currentVersion, latestVersion) < 0; // currentVersion < latestVersion
    store.state.lastUpdateCheck = Date.now();
  } catch {
    store.state.isUpdateAvailable = false;
  }
}
