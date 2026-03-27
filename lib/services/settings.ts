import { writable } from 'svelte/store';
import { storageService } from './storage';

export type SidebarSide = 'left' | 'right';

export interface AppSettings {
  sidebarSide: SidebarSide;
}

const DEFAULT_SETTINGS: AppSettings = {
  sidebarSide: 'left',
};

const { subscribe, set, update } = writable<AppSettings>(DEFAULT_SETTINGS);

// Load settings from storage
async function load() {
  const settings = await storageService.getValue<AppSettings>('app-settings');
  if (settings) {
    set({ ...DEFAULT_SETTINGS, ...settings });
  }
}

// Persist settings to storage
async function save(newSettings: AppSettings) {
  await storageService.setValue('app-settings', newSettings);
}

export const settings = {
  subscribe,
  load,
  async updateSide(side: SidebarSide) {
    update(s => {
      const next = { ...s, sidebarSide: side };
      save(next);
      return next;
    });
  }
};
