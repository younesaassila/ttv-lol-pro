import browser, { Runtime } from "webextension-polyfill";
import { updateProxySettings } from "../../common/ts/proxySettings";
import store from "../../store";
import { MessageType, ProxyRequestType } from "../../types";

type Timeout = string | number | NodeJS.Timeout | undefined;

const requestTypeToTimeoutMs: Map<ProxyRequestType, Timeout> = new Map();

export default function onContentScriptMessage(
  message: any,
  sender: Runtime.MessageSender,
  sendResponse: () => void
): true | void | Promise<any> {
  if (message.type === MessageType.EnableFullMode) {
    if (!sender.tab?.id) return;

    const requestType = message.requestType as ProxyRequestType;
    if (requestTypeToTimeoutMs.has(requestType)) {
      clearTimeout(requestTypeToTimeoutMs.get(requestType));
    }

    const minTimeoutMs = 3000; // Time for fetch to be called.
    const replyTimeoutMs = Date.now() - message.timestamp; // Time for reply to be received.
    requestTypeToTimeoutMs.set(
      requestType,
      setTimeout(() => {
        console.log("[TTV LOL PRO] Disabling full mode (timeout)");
        requestTypeToTimeoutMs.delete(requestType);
        if (store.state.chromiumProxyActive) {
          console.log(requestTypeToTimeoutMs);
          updateProxySettings([...requestTypeToTimeoutMs.keys()]);
        }
      }, minTimeoutMs + replyTimeoutMs)
    );
    if (store.state.chromiumProxyActive) {
      console.log(requestTypeToTimeoutMs);
      updateProxySettings([...requestTypeToTimeoutMs.keys()]);
    }

    console.log(
      `[TTV LOL PRO] Enabling full mode for ${
        minTimeoutMs + replyTimeoutMs
      }ms (request type: ${requestType})`
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
  }

  if (message.type === MessageType.DisableFullMode) {
    console.log("[TTV LOL PRO] Disabling full mode");
    const requestType = message.requestType as ProxyRequestType;
    if (requestTypeToTimeoutMs.has(requestType)) {
      clearTimeout(requestTypeToTimeoutMs.get(requestType));
      requestTypeToTimeoutMs.delete(requestType);
    }
    if (store.state.chromiumProxyActive) {
      console.log(requestTypeToTimeoutMs);
      updateProxySettings([...requestTypeToTimeoutMs.keys()]);
    }
  }
}
