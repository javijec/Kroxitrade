import { writable } from "svelte/store";
import type { TradeSiteVersion } from "../types/trade-location";
import { extensionBus } from "../core/extension-bus";
import { tradeDom } from "../site-adapter/trade-dom";
import { settings } from "./settings";

const BODY_CLASS = "bt-dev-result-actions-visible";
const POE2_COPY_BODY_CLASS = "bt-dev-poe2-copy-visible";
const POE2_BODY_CLASS = "bt-trade-poe2";
const COE_BODY_CLASS = "bt-dev-coe-visible";
const WIKI_BODY_CLASS = "bt-dev-wiki-visible";

let activeVersion: TradeSiteVersion = "1";
const { subscribe, set } = writable(false);
const {
  subscribe: subscribePoe2Copy,
  set: setPoe2Copy
} = writable(false);
let isPoe2CopyVisible = false;
const {
  subscribe: subscribeCoe,
  set: setCoe
} = writable(false);
let isCoeVisible = false;
const {
  subscribe: subscribeCoeDesecratedMods,
  set: setCoeDesecratedMods
} = writable(false);
let isCoeDesecratedModsEnabled = false;
const {
  subscribe: subscribeWiki,
  set: setWiki
} = writable(false);
let isWikiVisible = false;

function apply(value: boolean) {
  set(value);
  document.body?.classList.toggle(BODY_CLASS, value);
}

function applyPoe2CopyVisibility(value: boolean) {
  isPoe2CopyVisible = activeVersion === "2" && value;
  setPoe2Copy(isPoe2CopyVisible);
  document.body?.classList.toggle(POE2_COPY_BODY_CLASS, isPoe2CopyVisible);

  if (activeVersion === "2") {
    tradeDom.getPoe2CopyButtons().forEach((button) => {
      experimentalSettings.applyPoe2CopyButton(button);
    });
  }
}

function applyCoeVisibility(value: boolean) {
  isCoeVisible = value;
  setCoe(isCoeVisible);
  document.body?.classList.toggle(COE_BODY_CLASS, isCoeVisible);
  extensionBus.send("item-results:experimental-change");
}

function applyCoeDesecratedModsEnabled(value: boolean) {
  isCoeDesecratedModsEnabled = value;
  setCoeDesecratedMods(isCoeDesecratedModsEnabled);
}

function applyWikiVisibility(value: boolean) {
  isWikiVisible = value;
  setWiki(isWikiVisible);
  document.body?.classList.toggle(WIKI_BODY_CLASS, isWikiVisible);
  extensionBus.send("item-results:experimental-change");
}

function applyCurrentSettings() {
  const current = settings.getCurrent();
  apply(current.showResultActions);
  applyPoe2CopyVisibility(current.showPoe2CopyButton);
  applyCoeVisibility(current.showCraftOfExileButton);
  applyCoeDesecratedModsEnabled(current.includeDesecratedMods);
  applyWikiVisibility(current.showWikiButton);
}

settings.subscribe(applyCurrentSettings);

export const experimentalSettings = {
  subscribe,
  subscribePoe2Copy,
  subscribeCoe,
  subscribeCoeDesecratedMods,
  subscribeWiki,
  useVersion(version: TradeSiteVersion) {
    activeVersion = version;
    document.body?.classList.toggle(POE2_BODY_CLASS, version === "2");
    applyCurrentSettings();
  },
  setResultActionsVisible(value: boolean) {
    return settings.updateResultActionsVisibility(value);
  },
  setPoe2CopyVisible(value: boolean) {
    return settings.updatePoe2CopyButtonVisibility(value);
  },
  setCoeVisible(value: boolean) {
    return settings.updateCraftOfExileButtonVisibility(value);
  },
  setCoeDesecratedModsEnabled(value: boolean) {
    return settings.updateDesecratedModsVisibility(value);
  },
  setWikiVisible(value: boolean) {
    return settings.updateWikiButtonVisibility(value);
  },
  isCoeVisible() {
    return isCoeVisible;
  },
  isCoeDesecratedModsEnabled() {
    return isCoeDesecratedModsEnabled;
  },
  isWikiVisible() {
    return isWikiVisible;
  },
  isPoe2CopyVisible() {
    return isPoe2CopyVisible;
  },
  applyPoe2CopyButton(button: HTMLButtonElement) {
    if (activeVersion !== "2") {
      button.style.removeProperty("display");
      button.style.removeProperty("visibility");
      return;
    }

    if (isPoe2CopyVisible) {
      button.hidden = false;
      button.removeAttribute("hidden");
      button.classList.remove("hidden");
      button.style.removeProperty("display");
      button.style.removeProperty("visibility");
      return;
    }

    button.hidden = true;
    button.classList.add("hidden");
    button.style.setProperty("display", "none");
  },
  teardown() {
    document.body?.classList.remove(BODY_CLASS);
    document.body?.classList.remove(POE2_COPY_BODY_CLASS);
    document.body?.classList.remove(POE2_BODY_CLASS);
    document.body?.classList.remove(COE_BODY_CLASS);
    document.body?.classList.remove(WIKI_BODY_CLASS);
  }
};

export const poe2CopyButtonSetting = {
  subscribe: subscribePoe2Copy
};

export const coeButtonSetting = {
  subscribe: subscribeCoe
};

export const coeDesecratedModsSetting = {
  subscribe: subscribeCoeDesecratedMods
};

export const wikiButtonSetting = {
  subscribe: subscribeWiki
};
