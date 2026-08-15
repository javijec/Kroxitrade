import { get } from "svelte/store";
import {
  categoryInput,
  rarityInput,
  searchInput,
  statsTitles
} from "../site-adapter/selectors/common";
import { languageStore, translate } from "./i18n";

export class SearchPanelService {
  recommendTitle() {
    return this.getName() || translate(get(languageStore), "search.tradeFallback");
  }

  getCategory() {
    return this._scrapeInputValue(categoryInput, 'Any');
  }

  getName() {
    const value = this._scrapeInputValue(searchInput);
    return this._normalizeSearchName(value);
  }

  getRarity() {
    return this._scrapeInputValue(rarityInput, 'Any');
  }

  getStats() {
    const stats: string[] = [];

    document.querySelectorAll(statsTitles).forEach((item: any) => {
      let stat = item.innerText;
      stat = stat.trim().toLowerCase().replace(/^pseudo /, "");
      stats.push(stat);
    });

    return stats;
  }

  private _scrapeInputValue(selector: string, nullValue?: string): string | null {
    const input = document.querySelector(selector) as HTMLInputElement | null;
    if (!input) return null;

    const value = input.value;
    if (!value || (nullValue && value === nullValue)) return null;

    return value;
  }

  private _normalizeSearchName(value: string | null): string | null {
    if (!value) return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    return trimmed.replace(/^~/, "").trim() || null;
  }
}

export const searchPanelService = new SearchPanelService();
