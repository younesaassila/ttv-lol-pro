import browser from "webextension-polyfill";

const whitelistedChannelsList = document.getElementById(
  "whitelisted-channels-list"
) as HTMLUListElement;
const serverSelect = document.getElementById(
  "server-select"
) as HTMLSelectElement;
const customServerInput = document.getElementById(
  "custom-server-input"
) as HTMLInputElement;

let whitelistedChannels: string[] = [];
let servers: string[] = ["https://api.ttv.lol"];
async function init() {
  const storage = await browser.storage.local.get({
    whitelistedChannels: [],
    servers: ["https://api.ttv.lol"],
  });
  whitelistedChannels = storage.whitelistedChannels;
  servers = storage.servers;
}
init().then(() => {
  for (const whitelistedChannel of whitelistedChannels) {
    appendWhitelistedChannel(whitelistedChannel);
  }
  appendAddChannelInput();
  if (servers.length > 1) {
    serverSelect.value = "custom";
    customServerInput.value = servers[0];
    customServerInput.style.display = "inline-block";
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
    // Update channel name, or remove it if text input is left empty.
    if (value !== "") whitelistedChannels[index] = value;
    else whitelistedChannels.splice(index, 1);
    await browser.storage.local.set({ whitelistedChannels });
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
      await browser.storage.local.set({ whitelistedChannels });
      li.remove();
      appendWhitelistedChannel(value);
      appendAddChannelInput();

      const addChannelInput = document.querySelector(
        "#whitelisted-channels-list > li:last-child > input"
      ) as HTMLInputElement;
      if (addChannelInput) addChannelInput.focus();
    }
  });
  li.appendChild(input);
  whitelistedChannelsList.appendChild(li);
}

serverSelect.addEventListener("change", e => {
  // Toggle visibility of custom server input.
  const { value } = e.target as HTMLSelectElement;
  if (value === "custom") customServerInput.style.display = "inline-block";
  else customServerInput.style.display = "none";
});

customServerInput.addEventListener("change", async e => {
  // Update `servers` configuration option.
  const input = e.target as HTMLInputElement;
  const value = input.value.trim();
  if (value !== "") servers = [value, "https://api.ttv.lol"];
  else servers = ["https://api.ttv.lol"];
  await browser.storage.local.set({ servers });
});
