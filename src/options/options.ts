import $ from "../common/ts/$";
import isChromium from "../common/ts/isChromium";
import readFile from "../common/ts/readFile";
import saveFile from "../common/ts/saveFile";
import sendAdLog from "../common/ts/sendAdLog";
import updateProxySettings from "../common/ts/updateProxySettings";
import store from "../store";
import getDefaultState from "../store/getDefaultState";
import type { State } from "../store/types";
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
// Proxy Usher requests
const proxyUsherRequestsCheckboxElement = $(
  "#proxy-usher-requests-checkbox"
) as HTMLInputElement;
const proxyTwitchWebpageLiElement = $(
  "#proxy-twitch-webpage-li"
) as HTMLElement;
const proxyTwitchWebpageCheckboxElement = $(
  "#proxy-twitch-webpage-checkbox"
) as HTMLInputElement;
// Whitelisted channels
const whitelistedChannelsSectionElement = $(
  "#whitelisted-channels-section"
) as HTMLElement;
const whitelistedChannelsListElement = $(
  "#whitelisted-channels-list"
) as HTMLUListElement;
$;
// Proxies
const optimizedProxiesDivElement = $(
  "#optimized-proxies-div"
) as HTMLDivElement;
const optimizedProxiesInputElement = $("#optimized") as HTMLInputElement;
const optimizedProxiesListElement = $(
  "#optimized-proxies-list"
) as HTMLOListElement;
const normalProxiesInputElement = $("#normal") as HTMLInputElement;
const normalProxiesListElement = $("#normal-proxies-list") as HTMLOListElement;
// Ad log
const adLogSectionElement = $("#ad-log-section") as HTMLElement;
const adLogEnabledCheckboxElement = $(
  "#ad-log-enabled-checkbox"
) as HTMLInputElement;
const adLogSendButtonElement = $("#ad-log-send-button") as HTMLButtonElement;
const adLogExportButtonElement = $(
  "#ad-log-export-button"
) as HTMLButtonElement;
const adLogClearButtonElement = $("#ad-log-clear-button") as HTMLButtonElement;
// Import/Export
const exportButtonElement = $("#export-button") as HTMLButtonElement;
const importButtonElement = $("#import-button") as HTMLButtonElement;
const resetButtonElement = $("#reset-button") as HTMLButtonElement;
//#endregion

const DEFAULT_STATE = Object.freeze(getDefaultState());
const DEFAULT_LIST_OPTIONS = Object.freeze({
  getAlreadyExistsAlertMessage: text => `'${text}' is already in the list`,
  getItemPlaceholder: text => `Leave empty to remove '${text}' from the list`,
  getPromptPlaceholder: () => "Enter text to create a new item…",
  isAddAllowed: () => [true] as AllowedResult,
  isEditAllowed: () => [true] as AllowedResult,
  focusPrompt: false, // Is set to `true` once the user has added an item.
  hidePromptMarker: false,
  insertMode: "append",
  spellcheck: false,
} as ListOptions);

if (store.readyState === "complete") main();
else store.addEventListener("load", main);

function main() {
  // Proxy Usher requests
  proxyUsherRequestsCheckboxElement.checked = store.state.proxyUsherRequests;
  proxyUsherRequestsCheckboxElement.addEventListener("change", () => {
    const checked = proxyUsherRequestsCheckboxElement.checked;
    store.state.proxyUsherRequests = checked;
    if (isChromium) updateProxySettings();
  });
  proxyTwitchWebpageCheckboxElement.checked = store.state.proxyTwitchWebpage;
  proxyTwitchWebpageCheckboxElement.addEventListener("change", () => {
    store.state.proxyTwitchWebpage = proxyTwitchWebpageCheckboxElement.checked;
    if (isChromium) updateProxySettings();
  });
  if (proxyTwitchWebpageCheckboxElement.checked) {
    proxyTwitchWebpageLiElement.style.display = "block";
  }
  // Whitelisted channels
  if (isChromium) {
    whitelistedChannelsSectionElement.style.display = "none";
  } else {
    listInit(whitelistedChannelsListElement, "whitelistedChannels", {
      getAlreadyExistsAlertMessage: channelName =>
        `'${channelName}' is already whitelisted`,
      getPromptPlaceholder: () => "Enter a channel name…",
    });
  }
  // Proxies
  if (isChromium) {
    optimizedProxiesDivElement.style.display = "none";
    normalProxiesInputElement.checked = true;
  } else {
    if (store.state.optimizedProxiesEnabled)
      optimizedProxiesInputElement.checked = true;
    else normalProxiesInputElement.checked = true;
    const onProxyTypeChange = () => {
      store.state.optimizedProxiesEnabled =
        optimizedProxiesInputElement.checked;
    };
    optimizedProxiesInputElement.addEventListener("change", onProxyTypeChange);
    normalProxiesInputElement.addEventListener("change", onProxyTypeChange);
  }
  listInit(optimizedProxiesListElement, "optimizedProxies", {
    getPromptPlaceholder: insertMode => {
      if (insertMode == "prepend") return "Enter a proxy URL… (Primary)";
      return "Enter a proxy URL… (Fallback)";
    },
    isAddAllowed: isOptimizedProxyUrlAllowed,
    isEditAllowed: isOptimizedProxyUrlAllowed,
    hidePromptMarker: true,
    insertMode: "both",
  });
  listInit(normalProxiesListElement, "normalProxies", {
    getPromptPlaceholder: insertMode => {
      if (insertMode == "prepend") return "Enter a proxy URL… (Primary)";
      return "Enter a proxy URL… (Fallback)";
    },
    isAddAllowed: isNormalProxyUrlAllowed,
    isEditAllowed: isNormalProxyUrlAllowed,
    onEdit() {
      if (isChromium) updateProxySettings();
    },
    hidePromptMarker: true,
    insertMode: "both",
  });
  // Ad log
  if (isChromium) {
    adLogSectionElement.style.display = "none";
  } else {
    adLogEnabledCheckboxElement.checked = store.state.adLogEnabled;
    adLogEnabledCheckboxElement.addEventListener("change", () => {
      store.state.adLogEnabled = adLogEnabledCheckboxElement.checked;
    });
  }
}

function isOptimizedProxyUrlAllowed(url: string): AllowedResult {
  const urlLower = url.toLowerCase();
  const proxiesV1 = [
    "eu.luminous.dev",
    "as.luminous.dev",
    "lb-eu.perfprod.com",
    "lb-eu2.perfprod.com",
    "lb-na.perfprod.com",
    "lb-as.perfprod.com",
  ];
  if (proxiesV1.some(proxy => urlLower.includes(proxy))) {
    return [false, "TTV LOL PRO v1 proxies are not compatible"];
  }

  if (/^https?:\/\//i.test(url)) {
    return [false, "Proxy URLs must not contain a protocol (e.g. 'http://')"];
  }

  if (url.includes("/")) {
    return [false, "Proxy URLs must not contain a path (e.g. '/path')"];
  }

  try {
    const host = url.slice(url.lastIndexOf("@") + 1, url.length);
    new URL(`http://${host}`); // Throws if the host is invalid.
    return [true];
  } catch {
    return [false, `'${url}' is not a valid proxy URL`];
  }
}

function isNormalProxyUrlAllowed(url: string): AllowedResult {
  const [allowed, error] = isOptimizedProxyUrlAllowed(url);
  if (!allowed) return [false, error];

  const urlLower = url.toLowerCase();

  // Allow default proxies.
  if (DEFAULT_STATE.normalProxies.includes(url)) {
    return [true];
  }

  // Allow donator proxy (password protected).
  if (urlLower === "restricted.api.cdn-perfprod.com:6691") {
    return [true];
  }

  // Forbid other perfprod.com proxies.
  if (
    urlLower.includes(".perfprod.com") ||
    urlLower.includes(".cdn-perfprod.com")
  ) {
    return [false, "This proxy is not compatible with 'Proxy all requests'"];
  }

  return [true];
}

/**
 * Initializes a list element.
 * @param listElement
 * @param storeKey
 * @param options
 */
function listInit(
  listElement: HTMLOListElement | HTMLUListElement,
  storeKey: StoreStringArrayKey,
  options: Partial<ListOptions> = {}
) {
  const listOptions: ListOptions = { ...DEFAULT_LIST_OPTIONS, ...options };
  for (const text of store.state[storeKey]) {
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
 * @param text
 * @param options
 */
function _listAppend(
  listElement: HTMLOListElement | HTMLUListElement,
  storeKey: StoreStringArrayKey,
  text: string,
  options: ListOptions
) {
  const listItem = document.createElement("li");
  const textInput = document.createElement("input");
  textInput.type = "text";

  const [allowed] = options.isEditAllowed(text);
  if (!allowed) textInput.disabled = true;

  textInput.placeholder = options.getItemPlaceholder(text);
  textInput.spellcheck = options.spellcheck;
  textInput.value = text;

  // Highlight text when focused.
  textInput.addEventListener("focus", textInput.select.bind(textInput));

  // Update store when text is changed.
  textInput.addEventListener("change", e => {
    // Get index of item in array.
    const itemIndex = store.state[storeKey].findIndex(
      item => item.toLowerCase() === text.toLowerCase()
    );
    if (itemIndex === -1)
      return console.error(`Item '${text}' not found in '${storeKey}' array`);

    const textInput = e.target as HTMLInputElement;
    const newText = textInput.value.trim();
    // Remove item if text is empty.
    if (newText === "") {
      store.state[storeKey].splice(itemIndex, 1);
      listItem.remove();
      if (options.onEdit) options.onEdit(newText);
      return;
    }
    // Check if text is valid.
    const [allowed, error] = options.isEditAllowed(newText);
    if (!allowed) {
      alert(error || "You cannot edit this item");
      textInput.value = text;
      return;
    }
    // Update item in array.
    store.state[storeKey][itemIndex] = newText;
    textInput.placeholder = options.getItemPlaceholder(newText);
    textInput.value = newText; // Update text in case it was trimmed.
    text = newText; // Update current text variable.
    if (options.onEdit) options.onEdit(newText);
  });

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
    // Do nothing if text is empty.
    if (text === "") return;
    // Check if text is valid.
    const [allowed, error] = options.isAddAllowed(text);
    if (!allowed) {
      alert(error || "You cannot add this item");
      promptInput.value = "";
      return;
    }
    // Check if item already exists.
    const alreadyExists = store.state[storeKey].some(
      item => item.toLowerCase() === text.toLowerCase()
    );
    if (alreadyExists) {
      alert(options.getAlreadyExistsAlertMessage(text));
      promptInput.value = "";
      return;
    }
    // Add item to array.
    const newArray = store.state[storeKey];
    if (options.insertMode === "prepend") newArray.unshift(text);
    else newArray.push(text);
    store.state[storeKey] = newArray;
    if (options.onEdit) options.onEdit(text);

    listItem.remove();
    _listAppend(listElement, storeKey, text, options);
    _listPrompt(listElement, storeKey, {
      ...options,
      focusPrompt: true,
    });
  });

  listItem.append(promptInput);

  if (options.insertMode === "prepend") listElement.prepend(listItem);
  else listElement.append(listItem);

  if (options.focusPrompt) promptInput.focus();
}

adLogSendButtonElement.addEventListener("click", async () => {
  const success = await sendAdLog();
  if (success === null) {
    return alert("No log entries to send.");
  }
  if (!success) {
    return alert("Failed to send log.");
  }
  alert("Log sent successfully.");
});

adLogExportButtonElement.addEventListener("click", () => {
  saveFile(
    "ttv-lol-pro_ad-log.json",
    JSON.stringify(store.state.adLog),
    "application/json;charset=utf-8"
  );
});

adLogClearButtonElement.addEventListener("click", () => {
  const confirmation = confirm(
    "Are you sure you want to clear the ad log? This cannot be undone."
  );
  if (!confirmation) return;
  store.state.adLog = [];
});

exportButtonElement.addEventListener("click", () => {
  saveFile(
    "ttv-lol-pro_backup.json",
    JSON.stringify({
      adLogEnabled: store.state.adLogEnabled,
      normalProxies: store.state.normalProxies,
      optimizedProxies: store.state.optimizedProxies,
      optimizedProxiesEnabled: store.state.optimizedProxiesEnabled,
      proxyTwitchWebpage: store.state.proxyTwitchWebpage,
      proxyUsherRequests: store.state.proxyUsherRequests,
      whitelistedChannels: store.state.whitelistedChannels,
    } as Partial<State>),
    "application/json;charset=utf-8"
  );
});

importButtonElement.addEventListener("click", async () => {
  const DEFAULT_STATE_KEYS = Object.keys(DEFAULT_STATE);

  try {
    const data = await readFile("application/json;charset=utf-8");
    const state = JSON.parse(data);

    for (const entry of Object.entries(state)) {
      const key = entry[0] as keyof State;
      const value = entry[1];

      if (!DEFAULT_STATE_KEYS.includes(key)) {
        console.warn(`Unknown key '${key}' in imported settings`);
        continue;
      }
      let filteredValue = value;
      if (key === "optimizedProxies" && Array.isArray(value)) {
        filteredValue = value.filter(item =>
          item != null ? isOptimizedProxyUrlAllowed(item.toString())[0] : false
        );
      }
      if (key === "normalProxies" && Array.isArray(value)) {
        filteredValue = value.filter(item =>
          item != null ? isNormalProxyUrlAllowed(item.toString())[0] : false
        );
      }
      // @ts-ignore
      store.state[key] = filteredValue;
    }
    window.location.reload(); // Reload page to update UI.
  } catch (error) {
    alert(`An error occurred while importing settings: ${error}`);
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

// From https://stackoverflow.com/a/31627191

const konamiCode = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];
let konamiCodePosition = 0;

document.addEventListener("keydown", function (e) {
  const key = e.key;
  const expectedKey = konamiCode[konamiCodePosition];

  if (key == expectedKey) {
    konamiCodePosition += 1;

    // Complete code entered correctly.
    if (konamiCodePosition == konamiCode.length) {
      konamiCodeActivate();
      konamiCodePosition = 0;
    }
  } else {
    konamiCodePosition = 0;
  }
});

function konamiCodeActivate() {
  proxyTwitchWebpageLiElement.style.display = "block";
}
