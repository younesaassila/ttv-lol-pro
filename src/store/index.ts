import browser from "webextension-polyfill";
import getDefaultState from "./getDefaultState";
import getStateHandler from "./handlers/getStateHandler";
import { EventType, ReadyState, State, StorageArea } from "./types";

class Store {
  private _state = getDefaultState();
  private listenersByEvent: Record<string, Function[]> = {};

  areaName: StorageArea;
  readyState: ReadyState = "loading";
  state: State; // Proxy

  constructor(areaName: StorageArea) {
    this.areaName = areaName;
    const stateHandler = getStateHandler(this.areaName, this._state);
    const stateProxy = new Proxy(this._state, stateHandler);
    this.state = stateProxy;
    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== this.areaName) return;
      for (const [key, { newValue }] of Object.entries(changes)) {
        this._state[key] = newValue;
      }
      this.dispatchEvent("change");
    });
    this.init().then(() => {
      this.readyState = "complete";
      this.dispatchEvent("load");
    });
  }

  async init() {
    // Retrieve the entire storage contents.
    // See https://stackoverflow.com/questions/18150774/get-all-keys-from-chrome-storage
    const storage = await browser.storage[this.areaName].get(null);
    // Set default values for undefined properties.
    for (const [key, value] of Object.entries(getDefaultState())) {
      if (!storage[key]) storage[key] = value;
    }
    // Update state.
    for (const [key, value] of Object.entries(storage)) {
      this._state[key] = value;
    }
  }

  addEventListener(type: EventType, listener: Function) {
    if (!this.listenersByEvent[type]) this.listenersByEvent[type] = [];
    this.listenersByEvent[type].push(listener);
  }

  removeEventListener(type: EventType, listener: Function) {
    if (!this.listenersByEvent[type]) return;
    const index = this.listenersByEvent[type].findIndex(x => x === listener);
    if (index !== -1) this.listenersByEvent[type].splice(index, 1);
  }

  dispatchEvent(type: EventType) {
    const listeners = this.listenersByEvent[type] || [];
    listeners.forEach(listener => listener());
  }
}

const store = new Store("local");

export default store;
