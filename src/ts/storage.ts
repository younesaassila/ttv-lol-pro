import browser from "webextension-polyfill";

type Area = "sync" | "local" | "managed";
type EventType = "load";

const defaultValues = {
  whitelistedChannels: [],
  removeToken: false,
  servers: ["https://api.ttv.lol"],
};

/**
 * Synchronous wrapper around `browser.storage`.
 */
class Storage {
  storage: { [key: string]: any } = {};
  private areaName: Area;
  private defaultValues: { [key: string]: any } = {};
  private listenersByEvent: { [type: string]: Function[] } = {};

  constructor(areaName: Area, defaultValues: { [key: string]: any } = {}) {
    this.areaName = areaName;
    this.defaultValues = defaultValues;
    this.storage = this.defaultValues;
    this.init().then(() => this.dispatchEvent("load"));
    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== areaName) return;
      for (const [key, { newValue }] of Object.entries(changes)) {
        this.storage[key] = newValue;
      }
    });
  }

  async init() {
    // Retrieve the entire storage contents.
    // See https://stackoverflow.com/questions/18150774/get-all-keys-from-chrome-storage
    const storage = await browser.storage[this.areaName].get(null);
    for (const [key, defaultValue] of Object.entries(this.defaultValues)) {
      if (storage[key] == null) storage[key] = defaultValue;
    }
    this.storage = storage;
  }

  get(key: string) {
    return this.storage[key];
  }

  set(key: string, value: any) {
    this.storage[key] = value;
    browser.storage[this.areaName].set({ [key]: value });
  }

  remove(key: string) {
    delete this.storage[key];
    browser.storage[this.areaName].remove(key);
  }

  clear() {
    this.storage = {};
    browser.storage[this.areaName].clear();
  }

  addEventListener(type: EventType, listener: Function) {
    if (!this.listenersByEvent[type]) this.listenersByEvent[type] = [];
    this.listenersByEvent[type].push(listener);
  }

  private dispatchEvent(type: EventType) {
    const listeners = this.listenersByEvent[type] || [];
    listeners.forEach(listener => listener());
  }

  toString() {
    return JSON.stringify(this.storage);
  }

  toJSON() {
    return JSON.parse(JSON.stringify(this.storage));
  }
}

const storage = new Storage("local", defaultValues);

export default storage;
