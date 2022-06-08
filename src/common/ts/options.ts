import browser from "webextension-polyfill";

const whitelistedChannelsList = document.getElementById(
  "whitelisted-channels-list"
) as HTMLUListElement;
const apiServerSelect = document.getElementById(
  "api-server-select"
) as HTMLSelectElement;
const customApiServerInput = document.getElementById(
  "custom-api-server-input"
) as HTMLInputElement;

let whitelistedChannels: string[] = [];

(async () => {
  const storage = await browser.storage.local.get({
    whitelistedChannels: [],
  });
  whitelistedChannels = storage.whitelistedChannels;
  for (const whitelistedChannel of whitelistedChannels) {
    appendWhitelistedChannel(whitelistedChannel);
  }
  showChannelPrompt();
})();

apiServerSelect.addEventListener("change", e => {
  const select = e.target as HTMLSelectElement;
  const value = select.value;
  if (value === "Custom") customApiServerInput.style.display = "inline-block";
  else customApiServerInput.style.display = "";
});

function appendWhitelistedChannel(whitelistedChannel: string) {
  const li = document.createElement("li");
  const input = document.createElement("input");
  input.type = "text";
  input.value = whitelistedChannel;
  input.placeholder = `Leave empty to remove '${whitelistedChannel}' from the list`;
  input.spellcheck = false;
  input.addEventListener("change", async e => {
    const input = e.target as HTMLInputElement;
    const value = input.value.trim();
    const index = whitelistedChannels.findIndex(
      channel => channel.toLowerCase() === whitelistedChannel.toLowerCase()
    );
    if (index === -1) return;

    if (value !== "") whitelistedChannels[index] = value;
    else whitelistedChannels.splice(index, 1);
    await browser.storage.local.set({ whitelistedChannels });
    if (value === "") li.remove();
  });
  li.appendChild(input);
  whitelistedChannelsList.appendChild(li);
}

function showChannelPrompt() {
  const li = document.createElement("li");
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Enter a channel name…";
  input.spellcheck = false;
  input.addEventListener("change", async e => {
    const input = e.target as HTMLInputElement;
    const value = input.value.trim();

    if (value !== "") {
      const alreadyIncluded = whitelistedChannels.some(
        channel => channel.toLowerCase() === value.toLowerCase()
      );
      if (!alreadyIncluded) {
        whitelistedChannels.push(value);
        await browser.storage.local.set({ whitelistedChannels });
        li.remove();
        appendWhitelistedChannel(value);
        showChannelPrompt();
        const promptInput = document.querySelector(
          "#whitelisted-channels-list > li:last-child > input"
        ) as HTMLInputElement;
        if (promptInput) promptInput.focus();
      }
    }
  });
  li.appendChild(input);
  whitelistedChannelsList.appendChild(li);
}
