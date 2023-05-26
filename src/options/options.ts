import hamburgerAudio from "url:../audio/hamburger.mp3";
import konamiEndAudio from "url:../audio/konami_end.mp3";
import konamiProgress1Audio from "url:../audio/konami_progress_1.mp3";
import konamiProgress2Audio from "url:../audio/konami_progress_2.mp3";
import konamiProgress3Audio from "url:../audio/konami_progress_3.mp3";
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
const usherProxiesListElement = $("#usher-proxies-list") as HTMLOListElement;
// Whitelisted channels
const whitelistedChannelsSectionElement = $(
  "#whitelisted-channels-section"
) as HTMLElement;
const whitelistedChannelsListElement = $(
  "#whitelisted-channels-list"
) as HTMLUListElement;
$;
// Video Weaver proxies
const videoWeaverProxiesListElement = $(
  "#video-weaver-proxies-list"
) as HTMLOListElement;
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

const DEFAULT_STATE_KEYS = Object.freeze(Object.keys(getDefaultState()));
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
  if (store.state.proxyUsherRequests)
    usherProxiesListElement.style.display = "block";
  else usherProxiesListElement.style.display = "none";
  proxyUsherRequestsCheckboxElement.addEventListener("change", () => {
    store.state.proxyUsherRequests = proxyUsherRequestsCheckboxElement.checked;
    if (isChromium) updateProxySettings();
    if (store.state.proxyUsherRequests) {
      usherProxiesListElement.style.display = "block";
      new Audio(hamburgerAudio).play();
    } else usherProxiesListElement.style.display = "none";
  });
  proxyTwitchWebpageCheckboxElement.checked = store.state.proxyTwitchWebpage;
  proxyTwitchWebpageCheckboxElement.addEventListener("change", () => {
    store.state.proxyTwitchWebpage = proxyTwitchWebpageCheckboxElement.checked;
    if (isChromium) updateProxySettings();
  });
  listInit(usherProxiesListElement, "usherProxies", store.state.usherProxies, {
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
  // Video Weaver proxies
  listInit(
    videoWeaverProxiesListElement,
    "videoWeaverProxies",
    store.state.videoWeaverProxies,
    {
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
    }
  );
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

function isProxyUrlValid(host: string): AllowedResult {
  try {
    new URL(`http://${host}`);
    if (host.includes("/")) {
      return [false, "Proxy URLs cannot contain a path (e.g. '/path')"];
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
      proxyTwitchWebpage: store.state.proxyTwitchWebpage,
      proxyUsherRequests: store.state.proxyUsherRequests,
      usherProxies: store.state.usherProxies,
      videoWeaverProxies: store.state.videoWeaverProxies,
      whitelistedChannels: store.state.whitelistedChannels,
    } as Partial<State>),
    "application/json;charset=utf-8"
  );
});

importButtonElement.addEventListener("click", async () => {
  try {
    const data = await readFile("application/json;charset=utf-8");
    const state = JSON.parse(data);
    for (const [key, value] of Object.entries(state)) {
      if (!DEFAULT_STATE_KEYS.includes(key)) {
        console.warn(`Unknown key '${key}' in imported settings`);
        continue;
      }
      store.state[key] = value;
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

const documentTitles = [
  "What was that?",
  "What are you doing?",
  "A secret code you say?",
  "For what?",
  "A hidden feature you say?",
  "And what would it do?",
  "Improve ad blocking with what?",
  "A Whopper you say???",
  "Sir, this is a Wendy's.",
];
let restoreTitleTimeout: number | null = null;
function restoreTitle() {
  document.title = "Options - TTV LOL PRO";
}

document.addEventListener("keydown", function (e) {
  const key = e.key;
  const expectedKey = konamiCode[konamiCodePosition];

  if (key == expectedKey) {
    konamiCodePosition += 1;

    const randomAudio = Math.floor(Math.random() * 3);
    let src = "";
    if (randomAudio === 0) src = konamiProgress1Audio;
    else if (randomAudio === 1) src = konamiProgress2Audio;
    else src = konamiProgress3Audio;
    const audio = new Audio(src);
    audio.volume = 0.5;
    audio.play();

    // Complete code entered correctly.
    if (konamiCodePosition == konamiCode.length) {
      new Audio(konamiEndAudio).play();
      konamiCodeActivate();
      konamiCodePosition = 0;
    } else {
      document.title = documentTitles[konamiCodePosition - 1];
    }

    if (restoreTitleTimeout) clearTimeout(restoreTitleTimeout);
    restoreTitleTimeout = setTimeout(restoreTitle, 5000);
  } else {
    konamiCodePosition = 0;
  }
});

function konamiCodeActivate() {
  setTimeout(() => {
    document.title = "YOU SCARED ME!!!";
    proxyTwitchWebpageLiElement.style.display = "block";
  }, 200);
}
