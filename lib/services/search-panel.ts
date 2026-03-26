export class SearchPanelService {
  private readonly SEARCH_INPUT_SELECTOR = '.search-panel .search-bar .search-left input';
  private readonly CATEGORY_INPUT_SELECTOR = '.search-advanced-items .filter-group:nth-of-type(1) .filter-property:nth-of-type(1) input';
  private readonly RARITY_INPUT_SELECTOR = '.search-advanced-items .filter-group:nth-of-type(1) .filter-property:nth-of-type(2) input';
  private readonly STATS_SELECTOR = '.search-advanced-pane:last-child .filter-group-body .filter:not(.disabled) .filter-title';

  recommendTitle() {
    const name = this.getName();
    if (name) return name;

    const category = this.getCategory();
    const rarity = this.getRarity();

    if (!category) return '';
    if (!rarity) return category;

    return `${category} (${rarity})`;
  }

  getCategory() {
    return this._scrapeInputValue(this.CATEGORY_INPUT_SELECTOR, 'Any');
  }

  getName() {
    return this._scrapeInputValue(this.SEARCH_INPUT_SELECTOR);
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
}

export const searchPanelService = new SearchPanelService();
