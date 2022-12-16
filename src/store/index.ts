import browser from "webextension-polyfill";
import getDefaultState from "./getDefaultState";
import getStateHandler from "./handlers/getStateHandler";
import { EventType, ReadyState, State, StorageArea } from "./types";

class Store {
  private _areaName: StorageArea;
  private _state = getDefaultState();
  private _listenersByEvent: Record<string, Function[]> = {};

  readyState: ReadyState = "loading";
  state: State; // Proxy

  constructor(areaName: StorageArea) {
    this._areaName = areaName;
    const stateHandler = getStateHandler(this._areaName, this._state);
    const stateProxy = new Proxy(this._state, stateHandler);
    this.state = stateProxy;
    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== this._areaName) return;
      for (const [key, { newValue }] of Object.entries(changes)) {
        this._state[key] = newValue;
      }
      this.dispatchEvent("change");
    });
    this._init().then(() => {
      this.readyState = "complete";
      this.dispatchEvent("load");
    });
  }

  private async _init() {
    // Retrieve the entire storage contents.
    // See https://stackoverflow.com/questions/18150774/get-all-keys-from-chrome-storage
    const storage = await browser.storage[this._areaName].get(null);
    // Update state.
    for (const [key, value] of Object.entries(storage)) {
      this._state[key] = value;
    }
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
