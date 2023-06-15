export default function clearProxySettings() {
  chrome.proxy.settings.clear({ scope: "regular" }, function () {
    console.log("⚙️ Proxy settings cleared");
  });
}
