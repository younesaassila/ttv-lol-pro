import browser from "webextension-polyfill";

class Storage {
  storage: { [key: string]: any } = {};
  private areaName: "sync" | "local" | "managed";
  private listenersByEvent: { [type: string]: Function[] } = {};

  constructor(areaName: "sync" | "local" | "managed") {
    this.areaName = areaName;
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
    this.storage = await browser.storage[this.areaName].get(null);
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

  addEventListener(type: string, listener: Function) {
    if (!this.listenersByEvent[type]) this.listenersByEvent[type] = [];
    this.listenersByEvent[type].push(listener);
  }

  private dispatchEvent(type: string) {
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

const storage = new Storage("local");

export default storage;
