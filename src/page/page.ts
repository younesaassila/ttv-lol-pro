import { FetchOptions, getFetch } from "./getFetch";

console.info("[TTV LOL PRO] 🚀 Page script running.");

const params = JSON.parse(document.currentScript!.dataset.params!);
const options: FetchOptions = {
  scope: "page",
  shouldWaitForStore: params.isChromium === false,
  sendMessageToWorkers,
};

let workers = [] as Worker[];

window.fetch = getFetch(options);

window.Worker = class Worker extends window.Worker {
  constructor(scriptURL: string | URL, options?: WorkerOptions) {
    const url = scriptURL.toString();
    let script = "";
    // Fetch Twitch's script, since Firefox Nightly errors out when trying to
    // import a blob URL directly.
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.send();
    if (200 <= xhr.status && xhr.status < 300) {
      script = xhr.responseText;
    } else {
      console.warn(
        `[TTV LOL PRO] ❌ Failed to fetch script: ${xhr.statusText}`
      );
      script = `importScripts("${url}");`; // Will fail on Firefox Nightly.
    }
    // ---------------------------------------
    // 🦊 Attention Firefox Addon Reviewer 🦊
    // ---------------------------------------
    // Please note that this does NOT involve remote code execution. The injected script is bundled
    // with the extension. Additionally, there is no custom Content Security Policy (CSP) in use.
    const newScript = `
      try {
        importScripts("${params.workerScriptURL}");
      } catch {
        console.error("[TTV LOL PRO] ❌ Failed to load worker script: ${params.workerScriptURL}");
      }
      ${script}
    `;
    const newScriptURL = URL.createObjectURL(
      new Blob([newScript], { type: "text/javascript" })
    );
    super(newScriptURL, options);
    this.addEventListener("message", event => {
      if (
        event.data?.type === "ContentScriptMessage" ||
        event.data?.type === "PageScriptMessage"
      ) {
        window.postMessage(event.data.message);
      }
    });
    workers.push(this);
  }
};

function sendMessageToWorkers(message: any) {
  workers.forEach(worker => worker.postMessage(message));
}

// // Ping workers every 5 seconds.
// setInterval(() => {
//   sendMessageToWorkers({ type: "TLP_Ping" });
// }, 5000);

window.addEventListener("message", event => {
  if (event.data?.type === "PageScriptMessage") {
    const message = event.data.message;
    if (message.type === "StoreReady") {
      console.log(
        "[TTV LOL PRO] 📦 Page received store state from content script."
      );
      // Mutate the options object.
      options.state = message.state;
      options.shouldWaitForStore = false;
    }
  } else if (event.data?.type === "TLP_Ping") {
    sendMessageToWorkers({ type: "TLP_Pong" });
  } else if (event.data?.type === "TLP_Pong") {
    console.log("[TTV LOL PRO] 🏓 Worker responded to ping.");
  }
});

document.currentScript!.remove();
