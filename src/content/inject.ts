import injectedScript from "url:./injected.ts";

// Inject the script into the page
const script = document.createElement("script");
script.src = injectedScript;
script.onload = () => {
  script.remove();
};
document.head.appendChild(script);
