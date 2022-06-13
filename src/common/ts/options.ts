import $ from "../../utils/$";
import storage from "../../ts/storage";
import isPrivateIP from "private-ip";

const whitelistedChannelsList = $(
  "#whitelisted-channels-list"
) as HTMLUListElement;
const removeTokenCheckbox = $("#remove-token-checkbox") as HTMLInputElement;
const serverSelect = $("#server-select") as HTMLSelectElement;
const localServerInput = $("#local-server-input") as HTMLInputElement;

let whitelistedChannels: string[] = storage.get("whitelistedChannels");
let removeToken: boolean = storage.get("removeToken");
let servers: string[] = storage.get("servers");

storage.addEventListener("load", () => {
  whitelistedChannels = storage.get("whitelistedChannels");
  removeToken = storage.get("removeToken");
  servers = storage.get("servers");

  for (const whitelistedChannel of whitelistedChannels) {
    appendWhitelistedChannel(whitelistedChannel);
  }
  appendAddChannelInput();
  removeTokenCheckbox.checked = removeToken;
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
    const input = e.target as HTMLInputElement;
    const value = input.value.trim();
    const index = whitelistedChannels.findIndex(
      channel => channel.toLowerCase() === whitelistedChannel.toLowerCase()
    );
    if (index === -1) return;
    // Update channel name, or remove it if text field is left empty.
    if (value !== "") whitelistedChannels[index] = value;
    else whitelistedChannels.splice(index, 1);
    storage.set("whitelistedChannels", whitelistedChannels);
    if (value === "") li.remove();
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
    const alreadyWhitelisted = whitelistedChannels.some(
      channel => channel.toLowerCase() === channelName
    );
    if (!alreadyWhitelisted) {
      whitelistedChannels.push(value);
      storage.set("whitelistedChannels", whitelistedChannels);
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

removeTokenCheckbox.addEventListener("change", e => {
  const { checked } = e.target as HTMLInputElement;
  removeToken = checked;
  storage.set("removeToken", checked);
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
  servers = newServers;
  storage.set("servers", servers);
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
