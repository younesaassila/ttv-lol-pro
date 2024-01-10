import browser, { Runtime } from "webextension-polyfill";
import { updateProxySettings } from "../../common/ts/proxySettings";
import store from "../../store";
import { MessageType } from "../../types";

// TODO: Optimizations for Chromium:
// On slow computers, 3s might not be enough
// On fast ones, 3s is too much
// Page should measure message round trip time and adjust requested time for full mode
// Starts at 3s
// If round trip average takes 1s, asks for 4s
// Other optimizations are possible like not asking for time when last request was less than 3s ago and successful

let timeout: string | number | NodeJS.Timeout | undefined;

export default function onContentScriptMessage(
  message: any,
  sender: Runtime.MessageSender,
  sendResponse: () => void
): true | void | Promise<any> {
  if (!sender.tab?.id) return;

  if (message.type === MessageType.EnableFullMode) {
    console.log("[TTV LOL PRO] Received EnableFullMode message");

    if (timeout) {
      clearTimeout(timeout);
    } else if (store.state.chromiumProxyActive) {
      updateProxySettings("full");
    }

    timeout = setTimeout(() => {
      if (store.state.chromiumProxyActive) {
        updateProxySettings();
      }
      timeout = undefined;
    }, 3000);

    try {
      browser.tabs.sendMessage(sender.tab.id, {
        type: MessageType.EnableFullModeResponse,
      });
    } catch (error) {
      console.error(
        "[TTV LOL PRO] Failed to send EnableFullModeResponse message",
        error
      );
    }
  }
}
