import pageScript from "url:../page/page.ts";
import store from "../store";

console.info("[TTV LOL PRO] 🚀 Content script running.");

if (store.readyState === "complete") onStoreReady();
else store.addEventListener("load", onStoreReady);

function onStoreReady() {
  if (store.state.proxyUsherRequests) {
    injectScript(pageScript);
  }
}

function injectScript(src: string) {
  // From https://stackoverflow.com/a/9517879
  const script = document.createElement("script");
  script.src = src;
  script.onload = () => script.remove();
  // Note: Despite what the TS types say, `document.head` can be `null`.
  (document.head || document.documentElement).append(script);
}
