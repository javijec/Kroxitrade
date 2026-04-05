import { writable } from 'svelte/store';
import { setLanguage, type AppLanguage } from './i18n';
import { storageService } from './storage';

export type SidebarSide = 'left' | 'right';
export type BookmarkTradeActionId = 'edit' | 'replace' | 'copy' | 'toggle' | 'delete';

export interface AppSettings {
  sidebarSide: SidebarSide;
  showEquivalentPricing: boolean;
  showBulkSellers: boolean;
  sidebarWidth: number;
  language: AppLanguage;
  compactActionsMenu: boolean;
  compactBookmarkTradeActions: BookmarkTradeActionId[];
}

const DEFAULT_SETTINGS: AppSettings = {
  sidebarSide: 'right',
  showEquivalentPricing: false,
  showBulkSellers: false,
  sidebarWidth: 360,
  language: 'en',
  compactActionsMenu: false,
  compactBookmarkTradeActions: []
};

let currentSettings: AppSettings = DEFAULT_SETTINGS;

const { subscribe, set, update } = writable<AppSettings>(DEFAULT_SETTINGS);

subscribe((value) => {
  currentSettings = value;
});

// Load settings from storage
async function load() {
  const settings = await storageService.getValue<AppSettings>('app-settings');
  const next = { ...DEFAULT_SETTINGS, ...settings };
  set(next);
  setLanguage(next.language);
}

// Persist settings to storage
async function save(newSettings: AppSettings) {
  await storageService.setValue('app-settings', newSettings);
}

export const settings = {
  subscribe,
  load,
  getCurrent() {
    return currentSettings;
  },
  async updateSide(side: SidebarSide) {
    update(s => {
      const next = { ...s, sidebarSide: side };
      save(next);
      return next;
    });
  },
  async updateEquivalentPricingVisibility(showEquivalentPricing: boolean) {
    update(s => {
      const next = { ...s, showEquivalentPricing };
      save(next);
      return next;
    });
  },
  async updateBulkSellersVisibility(showBulkSellers: boolean) {
    update(s => {
      const next = { ...s, showBulkSellers };
      save(next);
      return next;
    });
  },
  async updateSidebarWidth(sidebarWidth: number) {
    update(s => {
      const next = { ...s, sidebarWidth };
      save(next);
      return next;
    });
  },
  async updateLanguage(language: AppLanguage) {
    update(s => {
      const next = { ...s, language };
      save(next);
      setLanguage(language);
      return next;
    });
  },
  async updateCompactActionsMenu(compactActionsMenu: boolean) {
    update(s => {
      const next = { ...s, compactActionsMenu };
      save(next);
      return next;
    });
  },
  async updateCompactBookmarkTradeActions(compactBookmarkTradeActions: BookmarkTradeActionId[]) {
    update(s => {
      const next = { ...s, compactBookmarkTradeActions };
      save(next);
      return next;
    });
  }
};
