import { fetch } from "./fetch";

console.info("[TTV LOL PRO] 🚀 Page script running.");

const params = JSON.parse(document.currentScript.dataset.params);

window.fetch = fetch;

window.Worker = class Worker extends window.Worker {
  constructor(scriptURL: string | URL, options?: WorkerOptions) {
    console.log("SCRIPT URL", scriptURL);
    const url = scriptURL.toString();
    let script = "";
    // Firefox Nightly errors out when trying to import a blob URL directly.
    if (url.startsWith("blob:")) {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);
      xhr.send();
      if (!(200 <= xhr.status && xhr.status < 300)) {
        throw new Error(`Failed to fetch script: ${xhr.statusText}`);
      }
      script = xhr.responseText;
    }
    if (!script) {
      script = `importScripts("${scriptURL}");`;
    }
    const newScript = `
      try {
        importScripts("${params.workerScriptURL}");
      } catch {
        console.error(\`[TTV LOL PRO] ❌ Failed to load worker script: ${params.workerScriptURL}\`);
      }
      ${script}
    `;
    const newScriptURL = URL.createObjectURL(
      new Blob([newScript], { type: "text/javascript" })
    );
    super(newScriptURL, options);
  }
};
