export class SearchPanelService {
  private readonly SEARCH_INPUT_SELECTOR = '.search-panel .search-bar .search-left input, .search-panel-content .search-bar input';
  private readonly CATEGORY_INPUT_SELECTOR = '.search-advanced-items .filter-group:nth-of-type(1) .filter-property:nth-of-type(1) input';
  private readonly RARITY_INPUT_SELECTOR = '.search-advanced-items .filter-group:nth-of-type(1) .filter-property:nth-of-type(2) input';
  private readonly STATS_SELECTOR = '.search-advanced-pane:last-child .filter-group-body .filter:not(.disabled) .filter-title, .filter-group-body .filter .filter-title';

  recommendTitle() {
    return this.getName() || "Trade";
  }

  getCategory() {
    return this._scrapeInputValue(this.CATEGORY_INPUT_SELECTOR, 'Any');
  }

  getName() {
    const value = this._scrapeInputValue(this.SEARCH_INPUT_SELECTOR);
    return this._normalizeSearchName(value);
  }

  getRarity() {
    return this._scrapeInputValue(this.RARITY_INPUT_SELECTOR, 'Any');
  }

  getStats() {
    const stats: string[] = [];

    document.querySelectorAll(this.STATS_SELECTOR).forEach((item: any) => {
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
