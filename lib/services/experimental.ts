import { writable } from "svelte/store";
import type { TradeSiteVersion } from "../types/trade-location";
import { storageService } from "./storage";

const BODY_CLASS = "bt-dev-result-actions-visible";
const POE2_COPY_BODY_CLASS = "bt-dev-poe2-copy-visible";
const POE2_BODY_CLASS = "bt-trade-poe2";
const COE_BODY_CLASS = "bt-dev-coe-visible";
const WIKI_BODY_CLASS = "bt-dev-wiki-visible";
const storageKey = (version: TradeSiteVersion) =>
  `experimental-result-actions-visible-poe${version}`;
const POE2_COPY_STORAGE_KEY = "experimental-poe2-copy-visible";
const COE_STORAGE_KEY = "experimental-coe-visible";
const COE_DESECRATED_MODS_STORAGE_KEY = "experimental-coe-desecrated-mods-enabled";
const WIKI_STORAGE_KEY = "experimental-wiki-visible";
const versionStorageKey = (key: string, version: TradeSiteVersion) =>
  `${key}-poe${version}`;

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
    document.querySelectorAll<HTMLButtonElement>(".row > .left > button.copy").forEach((button) => {
      experimentalSettings.applyPoe2CopyButton(button);
    });
  }
}

function applyCoeVisibility(value: boolean) {
  isCoeVisible = value;
  setCoe(isCoeVisible);
  document.body?.classList.toggle(COE_BODY_CLASS, isCoeVisible);
  document.dispatchEvent(new CustomEvent("poe-trade-plus:experimental-change"));
}

function applyCoeDesecratedModsEnabled(value: boolean) {
  isCoeDesecratedModsEnabled = value;
  setCoeDesecratedMods(isCoeDesecratedModsEnabled);
}

function applyWikiVisibility(value: boolean) {
  isWikiVisible = value;
  setWiki(isWikiVisible);
  document.body?.classList.toggle(WIKI_BODY_CLASS, isWikiVisible);
  document.dispatchEvent(new CustomEvent("poe-trade-plus:experimental-change"));
}

function getVersionSetting(key: string, version: TradeSiteVersion) {
  return storageService.getLocalValue(versionStorageKey(key, version)) ??
    storageService.getLocalValue(key);
}

export const experimentalSettings = {
  subscribe,
  subscribePoe2Copy,
  subscribeCoe,
  subscribeCoeDesecratedMods,
  subscribeWiki,
  useVersion(version: TradeSiteVersion) {
    activeVersion = version;
    document.body?.classList.toggle(POE2_BODY_CLASS, version === "2");
    apply(storageService.getLocalValue(storageKey(version)) === "true");
    applyPoe2CopyVisibility(
      getVersionSetting(POE2_COPY_STORAGE_KEY, version) !== "false"
    );
    applyCoeVisibility(
      getVersionSetting(COE_STORAGE_KEY, version) === "true"
    );
    applyCoeDesecratedModsEnabled(
      getVersionSetting(COE_DESECRATED_MODS_STORAGE_KEY, version) === "true"
    );
    applyWikiVisibility(
      getVersionSetting(WIKI_STORAGE_KEY, version) === "true"
    );
  },
  setResultActionsVisible(value: boolean) {
    storageService.setLocalValue(storageKey(activeVersion), String(value));
    apply(value);
  },
  setPoe2CopyVisible(value: boolean) {
    storageService.setLocalValue(
      versionStorageKey(POE2_COPY_STORAGE_KEY, activeVersion),
      String(value)
    );
    applyPoe2CopyVisibility(value);
  },
  setCoeVisible(value: boolean) {
    storageService.setLocalValue(
      versionStorageKey(COE_STORAGE_KEY, activeVersion),
      String(value)
    );
    applyCoeVisibility(value);
  },
  setCoeDesecratedModsEnabled(value: boolean) {
    storageService.setLocalValue(
      versionStorageKey(COE_DESECRATED_MODS_STORAGE_KEY, activeVersion),
      String(value)
    );
    applyCoeDesecratedModsEnabled(value);
  },
  setWikiVisible(value: boolean) {
    storageService.setLocalValue(
      versionStorageKey(WIKI_STORAGE_KEY, activeVersion),
      String(value)
    );
    applyWikiVisibility(value);
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
