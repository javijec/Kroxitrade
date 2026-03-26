import { bookmarksService } from "./bookmarks";
import { searchPanelService } from "./search-panel";
import { tradeLocationService } from "./trade-location";

const WOOP_PREFIX_REGEX = /^\((\d+)\) /;
const TITLE_MUTATION_THROTTLE_MS = 100;

export class PageTitleService {
  private baseSiteTitle: string = "";
  private lastWoopCount: number | null = null;
  private title: string | null = null;
  private observer: MutationObserver | null = null;
  private throttleTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeBookmarks: (() => void) | null = null;
  private unsubscribeLocation: (() => void) | null = null;

  initialize() {
    const titleElement = document.querySelector("title");
    if (!titleElement) return;

    this.baseSiteTitle = document.title;

    // Observe title mutations (the trade site resets the title frequently)
    this.observer = new MutationObserver(() => this.throttledTitleMutation());
    this.observer.observe(titleElement, { childList: true });

    // Recalculate on bookmark or location changes
    this.unsubscribeBookmarks?.();
    this.unsubscribeLocation?.();
    this.unsubscribeBookmarks = bookmarksService.onChange(() => void this.recalculateTitle());
    this.unsubscribeLocation = tradeLocationService.onChange(() => void this.recalculateTitle());

    void this.recalculateTitle();
  }

  private throttledTitleMutation() {
    if (this.throttleTimer) return;
    this.throttleTimer = setTimeout(() => {
      this.throttleTimer = null;
      this.onDocumentTitleMutation();
    }, TITLE_MUTATION_THROTTLE_MS);
  }

  private async recalculateTitle() {
    const currentLocation = tradeLocationService.current;
    const activeBookmark = await bookmarksService.fetchTradeByLocation(currentLocation);

    let activeTradeTitle = "";
    if (activeBookmark) {
      activeTradeTitle = activeBookmark.title;
    } else if (currentLocation.type === "search") {
      activeTradeTitle = searchPanelService.recommendTitle() || "";
    }

    const isLiveSegment = currentLocation.isLive ? "⚡ " : "";
    const tradeTitleSegment = activeTradeTitle ? `${activeTradeTitle} - ` : "";

    this.title = `${isLiveSegment}${tradeTitleSegment}${this.baseSiteTitle}`;
    this.updateTitle();
  }

  private updateTitle() {
    if (this.title === null) return;

    const woopPrefix = this.lastWoopCount !== null ? `(${this.lastWoopCount}) ` : "";
    const newTitle = woopPrefix + this.title;
    if (document.title !== newTitle) {
      document.title = newTitle;
    }
  }

  private parseWoopCount(title: string): number | null {
    const match = WOOP_PREFIX_REGEX.exec(title);
    if (match) {
      const parsed = parseInt(match[1], 10);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  private onDocumentTitleMutation() {
    this.lastWoopCount = this.parseWoopCount(document.title);
    this.updateTitle();
  }
}

export const pageTitleService = new PageTitleService();
