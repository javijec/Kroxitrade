import { writable } from "svelte/store";
import { getActiveTradeTab } from "./active-trade-tab";
import { storageService } from "./storage";
import { searchPanelService } from "./search-panel";
import { uniqueId } from "../utilities/unique-id";
import type { 
  TradeLocationStruct, 
  ExactTradeLocationStruct, 
  TradeLocationHistoryStruct,
  TradeSiteVersion 
} from "../types/trade-location";

const BASE_URL = "https://www.pathofexile.com";
const HISTORY_KEY = "trade-history";
const MAX_HISTORY = 50;
const TRADE_REALMS = ["xbox", "sony", "poe2"];
const PATHOFEXILE_HOSTNAME_PATTERN = /(?:^|\.)pathofexile\.com$/i;

export class TradeLocationService {
  private lastLocation: ExactTradeLocationStruct | null = null;
  private listeners = new Set<(event: { old: ExactTradeLocationStruct, new: ExactTradeLocationStruct }) => void>();
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private focusHandler: (() => void) | null = null;
  private blurHandler: (() => void) | null = null;
  private activeTabUpdatedHandler: ((tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => void) | null = null;
  private activeTabActivatedHandler: ((activeInfo: chrome.tabs.TabActiveInfo) => void) | null = null;
  
  // Svelte store for reactivity
  public locationStore = writable<ExactTradeLocationStruct>(this.parseCurrentLocation());

  constructor() {
    this.lastLocation = this.parseCurrentLocation();
  }

  get current() {
    if (this.isExtensionUi()) {
      return this.lastLocation ?? this.emptyLocation();
    }

    return this.parseCurrentPath();
  }

  startPolling(interval: number = 1000) {
    if (this.isExtensionUi()) {
      void this.startActiveTabTracking();
      return;
    }

    if (this.pollingTimer) return; // Don't start twice

    this.pollingTimer = setInterval(() => {
      this.syncCurrentLocation();
    }, interval);

    // Also listen for focus/blur to pause/resume
    if (!this.focusHandler) {
      this.focusHandler = () => this.resumePolling(interval);
      window.addEventListener("focus", this.focusHandler);
    }

    if (!this.blurHandler) {
      this.blurHandler = () => this.pausePolling();
      window.addEventListener("blur", this.blurHandler);
    }
  }

  private resumePolling(interval: number) {
    if (this.pollingTimer) return;
    this.pollingTimer = setInterval(() => {
      this.syncCurrentLocation();
    }, interval);
  }

  private async startActiveTabTracking() {
    await this.refreshFromActiveTab();

    if (typeof chrome === "undefined" || !chrome.tabs) {
      return;
    }

    if (!this.activeTabUpdatedHandler && chrome.tabs.onUpdated) {
      this.activeTabUpdatedHandler = (tabId, changeInfo, tab) => {
        if (changeInfo.url || tab.active) {
          void this.refreshFromActiveTab();
        }
      };
      chrome.tabs.onUpdated.addListener(this.activeTabUpdatedHandler);
    }

    if (!this.activeTabActivatedHandler && chrome.tabs.onActivated) {
      this.activeTabActivatedHandler = () => {
        void this.refreshFromActiveTab();
      };
      chrome.tabs.onActivated.addListener(this.activeTabActivatedHandler);
    }

    if (!this.focusHandler) {
      this.focusHandler = () => {
        void this.refreshFromActiveTab();
      };
      window.addEventListener("focus", this.focusHandler);
    }
  }

  private async refreshFromActiveTab() {
    const tab = await getActiveTradeTab();
    const current = this.parseUrl(tab?.url ?? null);
    this.locationStore.set(current);

    if (!this.lastLocation || !this.isExactEqual(this.lastLocation, current)) {
      const old = this.lastLocation ?? current;
      this.lastLocation = current;
      this.notify(old, current);
    }
  }

  private pausePolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  onChange(callback: (event: { old: ExactTradeLocationStruct, new: ExactTradeLocationStruct }) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(old: ExactTradeLocationStruct, current: ExactTradeLocationStruct) {
    this.listeners.forEach(l => l({ old, new: current }));
  }

  private syncCurrentLocation() {
    const current = this.parseCurrentPath();
    this.locationStore.set(current);
    if (!this.lastLocation || !this.isExactEqual(this.lastLocation, current)) {
      const old = this.lastLocation ?? current;
      this.lastLocation = current;
      this.notify(old, current);
      void this.maybeLogHistory(current);
    }
  }

  private async maybeLogHistory(location: ExactTradeLocationStruct) {
    if (!location.slug || !location.type || !location.league) return;
    
    const history = await this.fetchHistory();
    if (history[0] && this.isEqual(history[0], location)) return;

    history.unshift({
      ...location,
      id: uniqueId(),
      title: searchPanelService.recommendTitle() || "Untitled Search",
      createdAt: new Date().toISOString()
    } as TradeLocationHistoryStruct);

    await storageService.setValue(HISTORY_KEY, history.slice(0, MAX_HISTORY));
  }

  async fetchHistory(): Promise<TradeLocationHistoryStruct[]> {
    return (await storageService.getValue<TradeLocationHistoryStruct[]>(HISTORY_KEY)) || [];
  }

  async clearHistoryEntries() {
    await storageService.deleteValue(HISTORY_KEY);
  }

  getTradeUrl(version: TradeSiteVersion, type: string, slug: string, league: string) {
    const basePath = version === "2" ? "trade2" : "trade";
    return `${BASE_URL}/${basePath}/${type}/${league}/${slug}`;
  }

  compareTradeLocations(a: TradeLocationStruct, b: TradeLocationStruct) {
    return a.version === b.version && a.league === b.league && a.slug === b.slug && a.type === b.type;
  }

  private isEqual(a: TradeLocationStruct, b: TradeLocationStruct) {
    return this.compareTradeLocations(a, b);
  }

  private isExactEqual(a: ExactTradeLocationStruct, b: ExactTradeLocationStruct) {
    return this.isEqual(a, b) && a.isLive === b.isLive;
  }

  private isExtensionUi() {
    return window.location.protocol === "chrome-extension:";
  }

  private parseCurrentLocation() {
    if (this.isExtensionUi()) {
      return this.emptyLocation();
    }

    return this.parseCurrentPath();
  }

  private emptyLocation(): ExactTradeLocationStruct {
    return {
      version: "1",
      type: null,
      league: null,
      slug: null,
      isLive: false
    };
  }

  private parseCurrentPath(): ExactTradeLocationStruct {
    return this.parseUrl(window.location.href);
  }

  private parseUrl(urlString: string | null): ExactTradeLocationStruct {
    if (!urlString) {
      return this.emptyLocation();
    }

    let url: URL;

    try {
      url = new URL(urlString);
    } catch {
      return this.emptyLocation();
    }

    if (!PATHOFEXILE_HOSTNAME_PATTERN.test(url.hostname) || !url.pathname.startsWith("/trade")) {
      return this.emptyLocation();
    }

    const pathParts = url.pathname.split("/").slice(1);
    let versionPart: string, type: string | undefined, league: string | undefined, slug: string | undefined, live: string | undefined;

    // Handle realm-based URLs: /trade/search/xbox/LeagueName/slug
    if (pathParts.length > 2 && TRADE_REALMS.includes(pathParts[2])) {
      let realm: string, leagueInRealm: string;
      [versionPart, type, realm, leagueInRealm, slug, live] = pathParts;
      league = `${realm}/${leagueInRealm}`;
    } else {
      [versionPart, type, league, slug, live] = pathParts;
    }

    return {
      version: versionPart === "trade2" ? "2" : "1",
      type: type || null,
      league: league || null,
      slug: slug || null,
      isLive: live === "live"
    };
  }
}

export const tradeLocationService = new TradeLocationService();
