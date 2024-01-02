import $ from "../common/ts/$";
import { readFile, saveFile } from "../common/ts/file";
import getProxyInfoFromUrl from "../common/ts/getProxyInfoFromUrl";
import isChromium from "../common/ts/isChromium";
import {
  clearProxySettings,
  updateProxySettings,
} from "../common/ts/proxySettings";
import sendAdLog from "../common/ts/sendAdLog";
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
// Passport
const passportLevelRangeElement = $(
  "#passport-type-slider"
) as HTMLInputElement;
const anonymousModeCheckboxElement = $(
  "#anonymous-mode-checkbox"
) as HTMLInputElement;
// Whitelisted channels
const whitelistedChannelsListElement = $(
  "#whitelisted-channels-list"
) as HTMLUListElement;
// Proxy usage
const passportTypeProxyUsageElement = $(
  "#passport-type-proxy-usage"
) as HTMLDetailsElement;
const passportTypeProxyUsageSummaryElement = $(
  "#passport-type-proxy-usage-summary"
) as HTMLElement;
const passportTypeProxyUsagePassportElement = $(
  "#passport-type-proxy-usage-passport"
) as HTMLTableCellElement;
const passportTypeProxyUsageUsherElement = $(
  "#passport-type-proxy-usage-usher"
) as HTMLTableCellElement;
const passportTypeProxyUsageVideoWeaverElement = $(
  "#passport-type-proxy-usage-video-weaver"
) as HTMLTableCellElement;
const passportTypeProxyUsageGqlElement = $(
  "#passport-type-proxy-usage-gql"
) as HTMLTableCellElement;
const passportTypeProxyUsageWwwElement = $(
  "#passport-type-proxy-usage-www"
) as HTMLTableCellElement;
// Proxies
const optimizedProxiesInputElement = $("#optimized") as HTMLInputElement;
const optimizedProxiesListElement = $(
  "#optimized-proxies-list"
) as HTMLOListElement;
const normalProxiesInputElement = $("#normal") as HTMLInputElement;
const normalProxiesListElement = $("#normal-proxies-list") as HTMLOListElement;
// Ad log
const adLogSectionElement = $("#ad-log") as HTMLElement;
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
const unsetPacScriptButtonElement = $(
  "#unset-pac-script-button"
) as HTMLButtonElement;
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
  // Proxy settings
  passportLevelRangeElement.value = store.state.passportLevel.toString();
  updateProxyUsage();
  passportLevelRangeElement.addEventListener("input", () => {
    store.state.passportLevel = parseInt(passportLevelRangeElement.value);
    if (isChromium && store.state.chromiumProxyActive) {
      updateProxySettings();
    }
    updateProxyUsage();
  });
  anonymousModeCheckboxElement.checked = store.state.anonymousMode;
  anonymousModeCheckboxElement.addEventListener("change", () => {
    store.state.anonymousMode = anonymousModeCheckboxElement.checked;
  });
  // Whitelisted channels
  listInit(whitelistedChannelsListElement, "whitelistedChannels", {
    getAlreadyExistsAlertMessage: channelName =>
      `'${channelName}' is already whitelisted`,
    getPromptPlaceholder: () => "Enter a channel name…",
  });
  // Proxies
  if (store.state.optimizedProxiesEnabled)
    optimizedProxiesInputElement.checked = true;
  else normalProxiesInputElement.checked = true;
  const onProxyTypeChange = () => {
    store.state.optimizedProxiesEnabled = optimizedProxiesInputElement.checked;
    updateProxyUsage();
  };
  optimizedProxiesInputElement.addEventListener("change", onProxyTypeChange);
  normalProxiesInputElement.addEventListener("change", onProxyTypeChange);
  // }
  listInit(optimizedProxiesListElement, "optimizedProxies", {
    getPromptPlaceholder: insertMode => {
      if (insertMode == "prepend") return "Enter a proxy URL… (Primary)";
      return "Enter a proxy URL… (Fallback)";
    },
    isAddAllowed: isOptimizedProxyUrlAllowed,
    isEditAllowed: isOptimizedProxyUrlAllowed,
    onEdit() {
      if (isChromium && store.state.chromiumProxyActive) {
        updateProxySettings();
      }
    },
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
      if (isChromium && store.state.chromiumProxyActive) {
        updateProxySettings();
      }
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
  if (!isChromium) {
    unsetPacScriptButtonElement.style.display = "none";
  }
}

function updateProxyUsage() {
  let usageScore = 0;
  if (!store.state.optimizedProxiesEnabled) usageScore += 1;
  if (
    store.state.passportLevel >= 1 &&
    !(
      !isChromium &&
      store.state.passportLevel == 1 &&
      store.state.optimizedProxiesEnabled
    )
  ) {
    usageScore += 1;
  }
  switch (usageScore) {
    case 0:
      passportTypeProxyUsageSummaryElement.textContent = "🙂 Low proxy usage";
      passportTypeProxyUsageElement.dataset.usage = "low";
      break;
    case 1:
      passportTypeProxyUsageSummaryElement.textContent =
        "😐 Medium proxy usage";
      passportTypeProxyUsageElement.dataset.usage = "medium";
      break;
    case 2:
      passportTypeProxyUsageSummaryElement.textContent = "🙁 High proxy usage";
      passportTypeProxyUsageElement.dataset.usage = "high";
      break;
  }

  passportTypeProxyUsagePassportElement.textContent = "All";
  passportTypeProxyUsageUsherElement.textContent = "All";
  passportTypeProxyUsageVideoWeaverElement.textContent = store.state
    .optimizedProxiesEnabled
    ? "Containing ad"
    : "All";
  if (isChromium) {
    if (store.state.passportLevel == 2) {
      passportTypeProxyUsageGqlElement.textContent = store.state
        .optimizedProxiesEnabled
        ? "PlaybackAccessToken & Integrity"
        : "All";
    } else if (store.state.passportLevel == 1) {
      passportTypeProxyUsageGqlElement.textContent =
        "PlaybackAccessToken & Integrity";
    } else {
      passportTypeProxyUsageGqlElement.textContent = "None";
    }
  } else {
    if (store.state.passportLevel == 2) {
      passportTypeProxyUsageGqlElement.textContent = store.state
        .optimizedProxiesEnabled
        ? "PlaybackAccessToken & Integrity"
        : "All";
    } else if (store.state.passportLevel == 1) {
      passportTypeProxyUsageGqlElement.textContent = store.state
        .optimizedProxiesEnabled
        ? "PlaybackAccessToken"
        : "PlaybackAccessToken & Integrity";
    } else {
      passportTypeProxyUsageGqlElement.textContent = "None";
    }
  }
  passportTypeProxyUsageWwwElement.textContent =
    store.state.passportLevel >= 2 ? "All" : "None";
}

function isOptimizedProxyUrlAllowed(url: string): AllowedResult {
  const urlLower = url.toLowerCase();

  // Allow default proxies.
  if (DEFAULT_STATE.optimizedProxies.includes(urlLower)) {
    return [true];
  }

  // Forbid v1 proxies.
  const proxiesV1 = [
    // *.ttv.lol
    "api.ttv.lol",
    // *.luminous.dev
    "eu.luminous.dev",
    "eu2.luminous.dev",
    "as.luminous.dev",
    "bg.luminous.dev",
    // *.perfprod.com
    "lb-eu.perfprod.com",
    "lb-eu2.perfprod.com",
    "lb-na.perfprod.com",
    "lb-as.perfprod.com",
    // *.cdn-perfprod.com
    "lb-eu.cdn-perfprod.com",
    "lb-eu2.cdn-perfprod.com",
    "lb-na.cdn-perfprod.com",
    "lb-as.cdn-perfprod.com",
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
    const host = url.substring(url.lastIndexOf("@") + 1, url.length);
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
  if (DEFAULT_STATE.normalProxies.includes(urlLower)) {
    return [true];
  }

  // Allow donator proxy (password protected).
  const proxyInfo = getProxyInfoFromUrl(urlLower);
  const restrictedProxyHost = "restricted.api.cdn-perfprod.com";
  if (
    proxyInfo.host === restrictedProxyHost ||
    proxyInfo.host.endsWith(`.${restrictedProxyHost}`)
  ) {
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
      anonymousMode: store.state.anonymousMode,
      normalProxies: store.state.normalProxies,
      optimizedProxies: store.state.optimizedProxies,
      optimizedProxiesEnabled: store.state.optimizedProxiesEnabled,
      passportLevel: store.state.passportLevel,
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
      if (key === "passportLevel") {
        if (typeof value !== "number") {
          filteredValue = isChromium ? 0 : 1;
        } else if (value < 0 || value > 2) {
          filteredValue = Math.min(Math.max(value, 0), 2);
        }
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

unsetPacScriptButtonElement.addEventListener("click", () => {
  if (isChromium) {
    clearProxySettings();
    alert("PAC script unset successfully.");
  }
});
