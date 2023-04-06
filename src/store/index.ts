import browser from "webextension-polyfill";
import getDefaultState from "./getDefaultState";
import getStateHandler from "./handlers/getStateHandler";
import type { EventType, ReadyState, State, StorageAreaName } from "./types";

/**
 * A synchronous wrapper around the `browser.storage` API.
 */
class Store {
  private readonly _areaName: StorageAreaName;
  private _state: State = getDefaultState();
  private _listenersByEvent: Record<string, Function[]> = {};

  readyState: ReadyState = "loading";
  state: State; // Proxy

  constructor(areaName: StorageAreaName) {
    this._areaName = areaName;
    this._init().then(() => {
      this.readyState = "complete";
      this.dispatchEvent("load");
    });
    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== this._areaName) return;
      for (const [key, { newValue }] of Object.entries(changes)) {
        if (newValue === undefined) continue; // Ignore deletions.
        this._state[key] = newValue;
      }
      this.dispatchEvent("change");
    });
  }

  private async _init() {
    // Retrieve the entire storage contents.
    // From https://stackoverflow.com/questions/18150774/get-all-keys-from-chrome-storage
    const storage = await browser.storage[this._areaName].get(null);

    this._state = getDefaultState();
    // Check for updates on startup for unpacked installs.
    if (browser.management?.getSelf != null) {
      const info = await browser.management.getSelf();
      if (info.installType === "development") {
        this._state.checkForUpdates = true;
      }
    }
    for (const [key, value] of Object.entries(storage)) {
      this._state[key] = value;
    }
    const stateHandler = getStateHandler(this._areaName, this._state);
    const stateProxy = new Proxy(this._state, stateHandler);
    this.state = stateProxy;
  }

  async clear() {
    const defaultState = getDefaultState();
    for (const [key, value] of Object.entries(defaultState)) {
      this.state[key] = value;
    }
    await browser.storage[this._areaName].clear();
  }

  addEventListener(type: EventType, listener: Function) {
    if (!this._listenersByEvent[type]) this._listenersByEvent[type] = [];
    this._listenersByEvent[type].push(listener);
  }

  removeEventListener(type: EventType, listener: Function) {
    if (!this._listenersByEvent[type]) return;
    const index = this._listenersByEvent[type].findIndex(x => x === listener);
    if (index !== -1) this._listenersByEvent[type].splice(index, 1);
  }

  dispatchEvent(type: EventType) {
    const listeners = this._listenersByEvent[type] || [];
    listeners.forEach(listener => listener());
  }
}

const store = new Store("local");

export default store;
