import isPrivateIP from "private-ip";
import $ from "../common/ts/$";
import store from "../store";

//#region HTML Elements
const whitelistedChannelsList = $(
  "#whitelisted-channels-list"
) as HTMLUListElement;
const disableVodRedirectCheckbox = $(
  "#disable-vod-redirect-checkbox"
) as HTMLInputElement;
const serverSelect = $("#server-select") as HTMLSelectElement;
const localServerInput = $("#local-server-input") as HTMLInputElement;
//#endregion

if (store.readyState === "complete") main();
else store.addEventListener("load", main);

function main() {
  const whitelistedChannels = store.state.whitelistedChannels;
  const disableVodRedirect = store.state.disableVodRedirect;
  const servers = store.state.servers;

  for (const whitelistedChannel of whitelistedChannels) {
    appendWhitelistedChannel(whitelistedChannel);
  }
  appendAddChannelInput();
  disableVodRedirectCheckbox.checked = disableVodRedirect;
  if (servers.length && servers[0] != "https://api.ttv.lol") {
    serverSelect.value = "local";
    localServerInput.value = servers[0];
    localServerInput.style.display = "inline-block";
  }
}

function appendWhitelistedChannel(whitelistedChannel: string) {
  const li = document.createElement("li");
  const input = document.createElement("input");
  input.type = "text";
  input.value = whitelistedChannel;
  input.placeholder = `Leave empty to remove '${whitelistedChannel}' from the list`;
  input.spellcheck = false;
  input.addEventListener("focus", () => input.select());
  input.addEventListener("change", async e => {
    const input = e.target as HTMLInputElement;
    const value = input.value.trim();
    const index = store.state.whitelistedChannels.findIndex(
      channel => channel.toLowerCase() === whitelistedChannel.toLowerCase()
    );
    if (index === -1) return;
    // Update channel name, or remove it if text field is left empty.
    if (value !== "") store.state.whitelistedChannels[index] = value;
    else {
      store.state.whitelistedChannels.splice(index, 1);
      li.remove();
    }
  });
  li.appendChild(input);
  whitelistedChannelsList.appendChild(li);
}

function appendAddChannelInput() {
  const li = document.createElement("li");
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Enter a channel name…";
  input.spellcheck = false;
  input.addEventListener("change", async e => {
    const input = e.target as HTMLInputElement;
    const value = input.value.trim();
    if (value === "") return;

    const channelName = value.toLowerCase();
    const alreadyWhitelisted = store.state.whitelistedChannels.some(
      channel => channel.toLowerCase() === channelName
    );
    if (!alreadyWhitelisted) {
      store.state.whitelistedChannels.push(value);
      li.remove();
      appendWhitelistedChannel(value);
      appendAddChannelInput();

      const addChannelInput = $(
        "#whitelisted-channels-list > li:last-child > input"
      ) as HTMLInputElement;
      if (addChannelInput) addChannelInput.focus();
    } else {
      alert(`'${value}' is already whitelisted.`);
      input.value = "";
    }
  });
  li.appendChild(input);
  whitelistedChannelsList.appendChild(li);
}

disableVodRedirectCheckbox.addEventListener("change", e => {
  const checkbox = e.target as HTMLInputElement;
  if (checkbox.checked) {
    store.state.disableVodRedirect = checkbox.checked;
  } else {
    const consent = confirm(
      "Are you sure?\n\nYour Twitch token (containing sensitive information) will be sent to TTV LOL's API server when watching VODs."
    );
    if (consent) {
      store.state.disableVodRedirect = checkbox.checked;
    } else {
      checkbox.checked = true;
    }
  }
});

function setLocalServer(server: string) {
  let newServers: string[] = [];
  let url: URL;
  try {
    url = new URL(server);
    const isLocalhost = url.hostname === "localhost";
    if (isLocalhost || isPrivateIP(url.hostname)) newServers.push(server);
    else {
      alert(`'${server}' is not a local address.`);
      localServerInput.value = "";
    }
  } catch {
    if (!!server) alert(`'${server}' is not a valid URL.`);
    localServerInput.value = "";
  }
  newServers.push("https://api.ttv.lol"); // Fallback
  store.state.servers = newServers;
}

serverSelect.addEventListener("change", e => {
  // Toggle visibility of local server input.
  const { value } = e.target as HTMLSelectElement;
  switch (value) {
    case "local":
      // Local server
      localServerInput.style.display = "inline-block";
      setLocalServer(localServerInput.value);
      break;
    default:
      // TTV LOL API
      localServerInput.style.display = "none";
      setLocalServer("");
      break;
  }
});

localServerInput.addEventListener("change", async e => {
  // Update `servers` configuration option.
  const input = e.target as HTMLInputElement;
  const value = input.value.trim();
  setLocalServer(value);
});
