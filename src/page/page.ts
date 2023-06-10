import { getFetch } from "./getFetch";

console.info("[TTV LOL PRO] 🚀 Page script running.");

const params = JSON.parse(document.currentScript.dataset.params);

window.fetch = getFetch();

window.Worker = class Worker extends window.Worker {
  constructor(scriptURL: string | URL, options?: WorkerOptions) {
    const url = scriptURL.toString();
    let script = "";
    // Fetch the script content synchronously, since Firefox Nightly errors out
    // when trying to import a blob URL directly.
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.send();
    if (200 <= xhr.status && xhr.status < 300) {
      script = xhr.responseText;
    } else {
      console.error(
        `[TTV LOL PRO] ❌ Failed to fetch script: ${xhr.statusText}`
      );
      script = `importScripts("${url}");`; // Will fail on Firefox Nightly.
    }
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
  }
};

document.currentScript.remove();
