import browser, { Runtime } from "webextension-polyfill";
import {
  clearProxySettings,
  updateProxySettings,
} from "../../common/ts/proxySettings";
import store from "../../store";
import { MessageType } from "../../types";

let timeout: string | number | NodeJS.Timeout | undefined;

export default function onContentScriptMessage(
  message: any,
  sender: Runtime.MessageSender,
  sendResponse: () => void
): true | void | Promise<any> {
  if (!sender.tab?.id) return;
  if (message.type === MessageType.EnableFullMode) {
    console.log("[TTV LOL PRO] Received PAC script ready message.");
    if (timeout) {
      clearTimeout(timeout);
    } else {
      updateProxySettings("full");
    }
    timeout = setTimeout(() => {
      if (store.state.chromiumProxyActive) {
        updateProxySettings();
      } else {
        clearProxySettings();
      }
      timeout = undefined;
    }, 5000);
    browser.tabs.sendMessage(sender.tab.id, {
      type: MessageType.EnableFullModeResponse,
    });
  }
}
