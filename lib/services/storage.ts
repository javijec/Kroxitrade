interface StoragePayload {
  value: any;
  expiresAt: string | null;
}

export class StorageService {
  private static instance: StorageService;
  
  static getInstance() {
    if (!this.instance) this.instance = new StorageService();
    return this.instance;
  }

  async setValue(key: string, value: any, league: string | null = null) {
    return this.write(this.formatKey(key, league), {
      expiresAt: null,
      value,
    });
  }

  async setEphemeralValue(key: string, value: any, expirationDate: Date, league: string | null = null) {
    return this.write(this.formatKey(key, league), {
      expiresAt: expirationDate.toUTCString(),
      value,
    });
  }

  async getValue<T>(key: string, league: string | null = null): Promise<T | null> {
    const payload = await this.read(this.formatKey(key, league));
    if (!payload) return null;

    const { expiresAt, value } = payload;
    if (!expiresAt) return value;

    if (new Date().getTime() > new Date(expiresAt).getTime()) return null;
    return value;
  }

  private formatKey(key: string, league: string | null) {
    return (league ? `${key}--${league}` : key).toLowerCase();
  }

  private async read(key: string): Promise<StoragePayload | null> {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
        console.warn("Storage not available");
        return null;
    }
    const result = await chrome.storage.local.get([key]);
    return result[key] || null;
  }

  async deleteValue(key: string, league: string | null = null) {
    return this.remove(this.formatKey(key, league));
  }

  setLocalValue(key: string, value: string, league: string | null = null) {
    window.localStorage.setItem(`bt-${this.formatKey(key, league)}`, value);
  }

  getLocalValue(key: string, league: string | null = null): string | null {
    return window.localStorage.getItem(`bt-${this.formatKey(key, league)}`);
  }

  deleteLocalValue(key: string, league: string | null = null) {
    window.localStorage.removeItem(`bt-${this.formatKey(key, league)}`);
  }

  private async write(key: string, value: StoragePayload): Promise<void> {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    await chrome.storage.local.set({ [key]: value });
  }

  private async remove(keys: string | string[]): Promise<void> {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    await chrome.storage.local.remove(keys);
  }
}

export const storageService = StorageService.getInstance();
