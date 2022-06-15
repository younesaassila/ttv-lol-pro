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

store.addEventListener("load", () => {
  let whitelistedChannels = store.state.whitelistedChannels;
  let removeTokenFromRequests = store.state.removeTokenFromRequests;
  let servers = store.state.servers;

  for (const whitelistedChannel of whitelistedChannels) {
    appendWhitelistedChannel(whitelistedChannel);
  }
  appendAddChannelInput();
  removeTokenFromRequestsCheckbox.checked = removeTokenFromRequests;
  if (servers.length > 1) {
    serverSelect.value = "local";
    localServerInput.value = servers[0];
    localServerInput.style.display = "inline-block";
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
    const whitelistedChannels = store.state.whitelistedChannels;
    const input = e.target as HTMLInputElement;
    const value = input.value.trim();
    const index = whitelistedChannels.findIndex(
      channel => channel.toLowerCase() === whitelistedChannel.toLowerCase()
    );
    if (index === -1) return;
    // Update channel name, or remove it if text field is left empty.
    if (value !== "") whitelistedChannels[index] = value;
    else {
      whitelistedChannels.splice(index, 1);
      li.remove();
    }
    store.state.whitelistedChannels = whitelistedChannels;
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
    const whitelistedChannels = store.state.whitelistedChannels;
    const input = e.target as HTMLInputElement;
    const value = input.value.trim();
    if (value === "") return;

    const channelName = value.toLowerCase();
    const alreadyWhitelisted = whitelistedChannels.some(
      channel => channel.toLowerCase() === channelName
    );
    if (!alreadyWhitelisted) {
      whitelistedChannels.push(value);
      store.state.whitelistedChannels = whitelistedChannels;
      li.remove();
      appendWhitelistedChannel(value);
      appendAddChannelInput();

      const addChannelInput = $(
        "#whitelisted-channels-list > li:last-child > input"
      ) as HTMLInputElement;
      if (addChannelInput) addChannelInput.focus();
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
  if (value === "local") {
    localServerInput.style.display = "inline-block";
    setLocalServer(localServerInput.value);
  } else {
    localServerInput.style.display = "none";
    setLocalServer("");
  }
});

localServerInput.addEventListener("change", async e => {
  // Update `servers` configuration option.
  const input = e.target as HTMLInputElement;
  const value = input.value.trim();
  setLocalServer(value);
});
