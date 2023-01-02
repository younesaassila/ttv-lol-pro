const $ = (selectors: string): Element | null =>
  document.querySelector(selectors);

export default $;
