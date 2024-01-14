import browser, { Runtime } from "webextension-polyfill";
import { updateProxySettings } from "../../common/ts/proxySettings";
import store from "../../store";
import { MessageType } from "../../types";

let timeout: string | number | NodeJS.Timeout | undefined;

export default function onContentScriptMessage(
  message: any,
  sender: Runtime.MessageSender,
  sendResponse: () => void
): true | void | Promise<any> {
  switch (message.type) {
    case MessageType.EnableFullMode:
      if (!sender.tab?.id) return;

      if (timeout) {
        clearTimeout(timeout);
      } else {
        if (store.state.chromiumProxyActive) {
          updateProxySettings("full");
        }
      }

      const minTimeoutMs = 3000; // Time for fetch to be called.
      const replyTimeoutMs = Date.now() - message.timestamp; // Time for reply to be received.
      timeout = setTimeout(() => {
        if (store.state.chromiumProxyActive) {
          updateProxySettings();
        }
        timeout = undefined;
      }, minTimeoutMs + replyTimeoutMs);

      console.log(
        `[TTV LOL PRO] Enabling full mode for ${
          minTimeoutMs + replyTimeoutMs
        }ms`
      );

      try {
        browser.tabs.sendMessage(sender.tab.id, {
          type: MessageType.EnableFullModeResponse,
          timestamp: Date.now(),
          timeout: minTimeoutMs + replyTimeoutMs,
        });
      } catch (error) {
        console.error(
          "[TTV LOL PRO] Failed to send EnableFullModeResponse message",
          error
        );
      }
      break;
    case MessageType.DisableFullMode:
      console.log("[TTV LOL PRO] Disabling full mode");

      if (timeout) clearTimeout(timeout);
      if (store.state.chromiumProxyActive) {
        updateProxySettings();
      }
      timeout = undefined;
      break;
  }
}
