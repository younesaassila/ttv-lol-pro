import browser from "webextension-polyfill";

export default browser.runtime.getURL("index.html").startsWith("chrome");
