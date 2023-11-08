import LocalizationProvider from "../../libraries/common/cs/l10n.js";

export default class UserscriptLocalizationProvider extends LocalizationProvider {
  constructor(urls) {
    super();
    this._urls = new Set(urls);
    this.generalLoaded = false;
  }

  async loadByAddonId(addonId) {
    if (addonId !== "general" && !this.generalLoaded) {
      await this.loadByAddonId("general");
    }
    let addonMessages = {};
    for (const dir of this._urls) {
      let resp;
      let messages = {};
      const url = `${dir}/${addonId}.json`;
      try {
        resp = await fetch(url);
        messages = await resp.json();
      } catch (_) {
        if (addonId === "general") {
          this._urls.delete(dir);
        }
        continue;
      }
      addonMessages = Object.assign(messages, addonMessages);
      this.messages = Object.assign(messages, this.messages);
    }
    if (addonId === "general") {
      this._reconfigure();
      this.generalLoaded = true;
    }
  }
}
