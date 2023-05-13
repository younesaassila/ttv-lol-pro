import $ from "../common/ts/$";
import isChromium from "../common/ts/isChromium";
import readFile from "../common/ts/readFile";
import saveFile from "../common/ts/saveFile";
import updateProxySettings from "../common/ts/updateProxySettings";
import store from "../store";
import type { KeyOfType } from "../types";

//#region Types
type AllowedResult = [boolean, string?];
type InsertMode = "append" | "prepend" | "both";
type StoreStringArrayKey = KeyOfType<typeof store.state, string[]>;
type ListOptions = {
  getAlreadyExistsAlertMessage(text: string): string;
  getItemPlaceholder(text: string): string;
  getPromptPlaceholder(insertMode: InsertMode): string;
  isAddAllowed(text: string): AllowedResult;
  isEditAllowed(text: string): AllowedResult;
  onEdit?(text: string): void;
  focusPrompt: boolean;
  hidePromptMarker: boolean;
  insertMode: InsertMode;
  spellcheck: boolean;
};
//#endregion

//#region HTML Elements
// Whitelisted channels
const whitelistedChannelsSectionElement = $(
  "#whitelisted-channels-section"
) as HTMLElement;
const whitelistedChannelsListElement = $(
  "#whitelisted-channels-list"
) as HTMLUListElement;
$;
// Proxies
const proxiesListElement = $("#proxies-list") as HTMLOListElement;
// Import/Export
const exportButtonElement = $("#export-button") as HTMLButtonElement;
const importButtonElement = $("#import-button") as HTMLButtonElement;
const resetButtonElement = $("#reset-button") as HTMLButtonElement;
//#endregion

const DEFAULT_LIST_OPTIONS: ListOptions = Object.freeze({
  getAlreadyExistsAlertMessage: text => `'${text}' is already in the list`,
  getItemPlaceholder: text => `Leave empty to remove '${text}' from the list`,
  getPromptPlaceholder: () => "Enter text to create a new item…",
  isAddAllowed: () => [true] as AllowedResult,
  isEditAllowed: () => [true] as AllowedResult,
  focusPrompt: false, // Is set to true once the user has added an item.
  hidePromptMarker: false,
  insertMode: "append",
  spellcheck: false,
});

if (store.readyState === "complete") main();
else store.addEventListener("load", main);

function main() {
  // Whitelisted channels
  if (isChromium) {
    whitelistedChannelsSectionElement.style.display = "none";
  } else {
    listInit(
      whitelistedChannelsListElement,
      "whitelistedChannels",
      store.state.whitelistedChannels,
      {
        getAlreadyExistsAlertMessage: channelName =>
          `'${channelName}' is already whitelisted`,
        getPromptPlaceholder: () => "Enter a channel name…",
      }
    );
  }
  // Proxy list
  listInit(proxiesListElement, "proxies", store.state.proxies, {
    getPromptPlaceholder: insertMode => {
      if (insertMode == "prepend") return "Enter a proxy URL… (Primary)";
      return "Enter a proxy URL… (Fallback)";
    },
    isAddAllowed: isProxyUrlValid,
    isEditAllowed: isProxyUrlValid,
    onEdit() {
      if (isChromium) updateProxySettings();
    },
    hidePromptMarker: true,
    insertMode: "both",
  });
}

function isProxyUrlValid(host: string): AllowedResult {
  try {
    // Check if proxy URL is valid.
    new URL(`http://${host}`);
    if (host.includes("/")) {
      return [false, "Proxy URLs cannot contain a path"];
    }
    return [true];
  } catch {
    return [false, `'${host}' is not a valid proxy URL`];
  }
}

/**
 * Initializes a list element.
 * @param listElement
 * @param storeKey
 * @param stringArray
 * @param options
 */
function listInit(
  listElement: HTMLOListElement | HTMLUListElement,
  storeKey: StoreStringArrayKey,
  stringArray: string[] = [],
  options: Partial<ListOptions> = {}
) {
  const listOptions: ListOptions = { ...DEFAULT_LIST_OPTIONS, ...options };
  for (const text of stringArray) {
    _listAppend(listElement, storeKey, text, {
      ...listOptions,
      insertMode: "append", // Always append when initializing because the array is already in the correct order.
    });
  }
  // Add prompt(s).
  if (options.insertMode === "both") {
    _listPrompt(listElement, storeKey, {
      ...listOptions,
      insertMode: "append",
    });
    _listPrompt(listElement, storeKey, {
      ...listOptions,
      insertMode: "prepend",
    });
  } else {
    _listPrompt(listElement, storeKey, listOptions);
  }
}

/**
 * Appends an item to a list element.
 * @param listElement
 * @param storeKey
 * @param initialText
 * @param options
 */
function _listAppend(
  listElement: HTMLOListElement | HTMLUListElement,
  storeKey: StoreStringArrayKey,
  initialText: string,
  options: ListOptions
) {
  const listItem = document.createElement("li");
  const textInput = document.createElement("input");
  textInput.type = "text";
  const [allowed] = options.isEditAllowed(initialText);
  if (!allowed) textInput.disabled = true;

  textInput.placeholder = options.getItemPlaceholder(initialText);
  textInput.spellcheck = options.spellcheck;
  textInput.value = initialText;

  // Highlight text when focused.
  textInput.addEventListener("focus", textInput.select);
  // Update store when text is changed.
  textInput.addEventListener("change", e => {
    // Get index of item in store.
    const itemIndex = store.state[storeKey].findIndex(
      str => str.toLowerCase() === initialText.toLowerCase()
    );
    if (itemIndex === -1)
      return console.error(`Item ${initialText} not found in store`);
    const textInput = e.target as HTMLInputElement;
    const newText = textInput.value.trim();
    // Remove item if text field is left empty.
    if (newText === "") {
      store.state[storeKey].splice(itemIndex, 1);
      listItem.remove();
      if (options.onEdit) options.onEdit(newText);
      return;
    }
    // Check if new text is valid.
    const [allowed, errorMessage] = options.isEditAllowed(newText);
    if (!allowed) {
      alert(errorMessage || "You cannot edit this item");
      textInput.value = initialText;
      return;
    }

    store.state[storeKey][itemIndex] = newText;
    textInput.placeholder = options.getItemPlaceholder(newText);
    textInput.value = newText;
    if (options.onEdit) options.onEdit(newText);

    initialText = newText;
  });
  // Append list item to list.
  listItem.append(textInput);
  if (options.insertMode === "prepend") listElement.prepend(listItem);
  else listElement.append(listItem);
}

/**
 * Creates a prompt (text input) to add new items to a list.
 * @param listElement
 * @param storeKey
 * @param options
 */
function _listPrompt(
  listElement: HTMLOListElement | HTMLUListElement,
  storeKey: StoreStringArrayKey,
  options: ListOptions
) {
  const listItem = document.createElement("li");
  if (options.hidePromptMarker) listItem.classList.add("hide-marker");
  const promptInput = document.createElement("input");
  promptInput.type = "text";

  promptInput.placeholder = options.getPromptPlaceholder(options.insertMode);
  promptInput.spellcheck = options.spellcheck;

  // Update store when text is changed.
  promptInput.addEventListener("change", e => {
    const promptInput = e.target as HTMLInputElement;
    const text = promptInput.value.trim();
    if (text === "") return;
    const [allowed, errorMessage] = options.isAddAllowed(text);
    if (!allowed) {
      alert(errorMessage || "You cannot add this item");
      return;
    }
    // Check if item already exists.
    const alreadyExists = store.state[storeKey].some(
      str => str.toLowerCase() === text.toLowerCase()
    );
    if (alreadyExists) {
      alert(options.getAlreadyExistsAlertMessage(text));
      promptInput.value = "";
      return;
    }
    // Add item to store.
    const list = store.state[storeKey]; // Store a reference to the array for the proxy to work.
    if (options.insertMode === "prepend") list.unshift(text);
    else list.push(text);
    store.state[storeKey] = list;
    if (options.onEdit) options.onEdit(text);

    listItem.remove(); // This will also remove the prompt.
    _listAppend(listElement, storeKey, text, options);
    _listPrompt(listElement, storeKey, {
      ...options,
      focusPrompt: true,
    });
  });
  // Append prompt to list.
  listItem.append(promptInput);
  if (options.insertMode === "prepend") listElement.prepend(listItem);
  else listElement.append(listItem);
  // Focus prompt if specified.
  if (options.focusPrompt) promptInput.focus();
}

exportButtonElement.addEventListener("click", () => {
  saveFile(
    "ttv-lol-pro_backup.json",
    JSON.stringify({
      proxies: store.state.proxies,
      whitelistedChannels: store.state.whitelistedChannels,
    }),
    "application/json;charset=utf-8"
  );
});

importButtonElement.addEventListener("click", async () => {
  try {
    const data = await readFile("application/json;charset=utf-8");
    const state = JSON.parse(data);
    for (const [key, value] of Object.entries(state)) {
      store.state[key] = value;
    }
    window.location.reload(); // Reload page to update UI.
  } catch (error) {
    alert(`Error: ${error}}`);
  }
});

resetButtonElement.addEventListener("click", () => {
  const confirmation = confirm(
    "Are you sure you want to reset all settings to their default values?"
  );
  if (!confirmation) return;
  store.clear();
  window.location.reload(); // Reload page to update UI.
});
