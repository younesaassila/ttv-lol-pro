import store from "../../store";

export default function onProxySettingsChange(details: chrome.types.ChromeSettingGetResultDetails) {
    console.log("PROXY SETTINGS CHANGE: " + details.levelOfControl);
    store.state.chromiumProxyActive = details.levelOfControl == "controlled_by_this_extension";
}