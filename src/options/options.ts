import $ from "../common/ts/$";
import store from "../store";
import isPrivateIP from "private-ip";

const whitelistedChannelsList = $(
  "#whitelisted-channels-list"
) as HTMLUListElement;
const removeTokenFromRequestsCheckbox = $(
  "#remove-token-checkbox"
) as HTMLInputElement;
const serverSelect = $("#server-select") as HTMLSelectElement;
const localServerInput = $("#local-server-input") as HTMLInputElement;

const knownLocalUrls = {
  TTV_LOL_POGU_URL: "http://localhost:38565",
};

store.addEventListener("load", () => {
  let whitelistedChannels = store.state.whitelistedChannels;
  let removeTokenFromRequests = store.state.removeTokenFromRequests;
  let servers = store.state.servers;

  for (const whitelistedChannel of whitelistedChannels) {
    appendWhitelistedChannel(whitelistedChannel);
  }
  appendAddChannelInput();
  removeTokenFromRequestsCheckbox.checked = removeTokenFromRequests;
  if (servers.length && servers[0] != "https://api.ttv.lol") {
    switch (servers[0]) {
      case knownLocalUrls.TTV_LOL_POGU_URL:
        serverSelect.value = "ttv-lol-pogu";
        break;
      default:
        serverSelect.value = "local";
        localServerInput.value = servers[0];
        localServerInput.style.display = "inline-block";
        break;
    }
  }
});

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

removeTokenFromRequestsCheckbox.addEventListener("change", e => {
  const { checked } = e.target as HTMLInputElement;
  store.state.removeTokenFromRequests = checked;
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
    case "ttv-lol-pogu":
      // TTV LOL PogU
      localServerInput.style.display = "none";
      setLocalServer(knownLocalUrls.TTV_LOL_POGU_URL);
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
