import { fetch } from "./fetch";

console.info("[TTV LOL PRO] 🚀 Page script running.");

const params = JSON.parse(document.currentScript.dataset.params);

self.fetch = fetch;

self.Worker = class Worker extends self.Worker {
  constructor(scriptURL: string | URL, options?: WorkerOptions) {
    const newScript = `
      try {
        importScripts("${params.workerScriptURL}");
      } catch {
        console.error("[TTV LOL PRO] ❌ Failed to load worker script.");
      }
      importScripts("${scriptURL}");
    `;
    const newScriptURL = URL.createObjectURL(
      new Blob([newScript], { type: "text/javascript" })
    );
    super(newScriptURL, options);
  }
};
