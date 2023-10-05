import { Types } from "webextension-polyfill";
import store from "../../store";

export default function onProxySettingsChange(
  details: Types.SettingOnChangeDetailsType
) {
  console.log(`⚙️ Proxy settings changed: ${details.levelOfControl}`);
  store.state.chromiumProxyActive =
    details.levelOfControl == "controlled_by_this_extension";
}
