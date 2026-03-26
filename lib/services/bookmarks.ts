import { Base64 } from "js-base64";
import { writable } from "svelte/store";
import { uniqueId } from "../utilities/unique-id";
import { storageService } from "./storage";
import type { 
  BookmarksFolderStruct, 
  BookmarksTradeStruct, 
  PartialBookmarksTradeLocation,
  BookmarksFolderIcon 
} from "../types/bookmarks";
import type { TradeSiteVersion } from "../types/trade-location";

const FOLDERS_KEY = "bookmark-folders";
const TRADES_PREFIX_KEY = "bookmark-trades";
const SECTION_DELIMITER = "\n--------------------\n";
const LINE_DELIMITER = "\n";

type ExportVersion = 1 | 2 | 3 | 4;

interface ExportedFolderStruct {
  icn: string;
  tit: string;
  ver?: TradeSiteVersion;
  trs: Array<{ tit: string; loc: string }>;
}

export class BookmarksService {
  private foldersStore = writable<BookmarksFolderStruct[]>([]);
  private listeners = new Set<() => void>();
  public subscribe = this.foldersStore.subscribe;

  constructor() {
    this.refresh();
  }

  async refresh() {
    const folders = await this.fetchFolders();
    this.foldersStore.set(folders);
    this.notifyChange();
  }

  onChange(callback: () => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyChange() {
    this.listeners.forEach((listener) => listener());
  }

  // ─── STORAGE ──────────────────────────────────────────────

  async fetchFolders(): Promise<BookmarksFolderStruct[]> {
    const folders = await storageService.getValue<Partial<BookmarksFolderStruct>[]>(FOLDERS_KEY);
    return (folders || []).map(f => this.initializeFolderStruct(f.version || "1", f));
  }

  async fetchTradesByFolderId(folderId: string): Promise<BookmarksTradeStruct[]> {
    const trades = await storageService.getValue<BookmarksTradeStruct[]>(`${TRADES_PREFIX_KEY}--${folderId}`);
    return (trades || []).map(t => ({
      ...t,
      location: { ...t.location, version: t.location.version || "1", league: t.location.league || null }
    }));
  }

  async fetchTradeByLocation(location: PartialBookmarksTradeLocation): Promise<BookmarksTradeStruct | null> {
    const folders = await this.fetchFolders();
    const foldersWithTrades = await Promise.all(
      folders.map(async (folder) => ({
        ...folder,
        trades: await this.fetchTradesByFolderId(folder.id!),
      }))
    );
    
    let matches = foldersWithTrades
      .map(f => ({
        ...f,
        trades: f.trades.filter(
          t => t.location.version === location.version &&
               t.location.slug === location.slug &&
               t.location.type === location.type &&
               (t.location.league === null || t.location.league === location.league)
        ),
      }))
      .filter(f => f.trades.length > 0);

    if (matches.length === 0) return null;

    const unarchivedMatches = matches.filter(m => !m.archivedAt);
    if (unarchivedMatches.length > 0) matches = unarchivedMatches;

    const matchingTrades = matches.flatMap(m => m.trades);
    matchingTrades.sort((a, b) => (a.title < b.title ? -1 : a.title > b.title ? 1 : 0));
    return matchingTrades[0];
  }

  async persistFolder(folder: BookmarksFolderStruct, options?: { moveToEnd?: boolean }): Promise<string> {
    const folders = await this.fetchFolders();
    let updated: BookmarksFolderStruct[];
    const id = folder.id || uniqueId();

    if (!folder.id) {
      updated = [...folders, { ...folder, id }];
    } else {
      updated = folders.map(f => f.id === folder.id ? { ...f, ...folder } : f);
      if (options?.moveToEnd) {
        updated = [...updated.filter(f => f.id !== id), ...updated.filter(f => f.id === id)];
      }
    }
    await this.persistFolders(updated);
    await this.refresh();
    return id;
  }

  async persistFolders(folders: BookmarksFolderStruct[]) {
    await storageService.setValue(FOLDERS_KEY, folders);
  }

  async persistTrade(trade: BookmarksTradeStruct, folderId: string): Promise<string> {
    const trades = await this.fetchTradesByFolderId(folderId);
    let updated: BookmarksTradeStruct[];
    const id = trade.id || uniqueId();

    if (!trade.id) {
      updated = [...trades, { ...trade, id }];
    } else {
      updated = trades.map(t => t.id === trade.id ? { ...t, ...trade } : t);
    }
    await this.persistTrades(updated, folderId);
    await this.refresh();
    return id;
  }

  async persistTrades(trades: BookmarksTradeStruct[], folderId: string) {
    const safeTrades = trades.map(t => ({ ...t, id: t.id || uniqueId() }));
    await storageService.setValue(`${TRADES_PREFIX_KEY}--${folderId}`, safeTrades);
  }

  async deleteTrade(tradeId: string, folderId: string) {
    const trades = await this.fetchTradesByFolderId(folderId);
    const updated = trades.filter(t => t.id !== tradeId);
    await this.persistTrades(updated, folderId);
    await this.refresh();
  }

  async deleteFolder(folderId: string) {
    const folders = await this.fetchFolders();
    const updated = folders.filter(f => f.id !== folderId);
    await this.persistFolders(updated);
    await storageService.deleteValue(`${TRADES_PREFIX_KEY}--${folderId}`);
    await this.refresh();
  }

  async duplicateTrade(trade: BookmarksTradeStruct, targetFolderId: string) {
    const newTrade = { ...trade, id: uniqueId() };
    await this.persistTrade(newTrade, targetFolderId);
  }

  async renameFolder(folder: BookmarksFolderStruct, title: string) {
    return this.persistFolder({ ...folder, title });
  }

  async renameTrade(trade: BookmarksTradeStruct, folderId: string, title: string) {
    return this.persistTrade({ ...trade, title }, folderId);
  }

  async reorderTrade(tradeId: string, folderId: string, direction: "up" | "down") {
    const trades = await this.fetchTradesByFolderId(folderId);
    const index = trades.findIndex(t => t.id === tradeId);
    if (index === -1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= trades.length) return;

    const updated = [...trades];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    await this.persistTrades(updated, folderId);
    await this.refresh();
  }

  // ─── LOGIC ────────────────────────────────────────────────

  async toggleTradeCompletion(trade: BookmarksTradeStruct, folderId: string) {
    return this.persistTrade(
      { ...trade, completedAt: trade.completedAt ? null : new Date().toISOString() },
      folderId
    );
  }

  async toggleFolderArchive(folder: BookmarksFolderStruct) {
    return this.persistFolder(
      { ...folder, archivedAt: folder.archivedAt ? null : new Date().toISOString() },
      { moveToEnd: true }
    );
  }

  partiallyReorderFolders(
    allFolders: BookmarksFolderStruct[],
    reorderedFolders: BookmarksFolderStruct[]
  ): BookmarksFolderStruct[] {
    const reorderedSet = new Set(reorderedFolders);
    const result = [...allFolders];
    let reorderedIndex = 0;
    for (let i = 0; i < allFolders.length; i++) {
      if (reorderedSet.has(allFolders[i])) {
        result[i] = reorderedFolders[reorderedIndex];
        reorderedIndex++;
      }
    }
    return result;
  }

  // ─── EXPORT / IMPORT ──────────────────────────────────────

  serializeFolder(folder: BookmarksFolderStruct, trades: BookmarksTradeStruct[]): string {
    const payload: ExportedFolderStruct = {
      icn: folder.icon as string,
      tit: folder.title,
      ver: folder.version,
      trs: trades.map(t => ({
        tit: t.title,
        loc: `${t.location.version}:${t.location.type}:${t.location.league || ""}:${t.location.slug}`
      }))
    };
    return `4:${Base64.encode(JSON.stringify(payload))}`;
  }

  deserializeFolder(serializedFolder: string): [BookmarksFolderStruct, BookmarksTradeStruct[]] | null {
    try {
      const exportVersion = this.parseExportVersion(serializedFolder);
      const json = this.jsonFromExportString(exportVersion, serializedFolder);
      const payload: ExportedFolderStruct = JSON.parse(json);

      const folder: BookmarksFolderStruct = {
        version: "1",
        icon: payload.icn as BookmarksFolderIcon,
        title: payload.tit,
        archivedAt: null,
      };

      if (exportVersion >= 3 && payload.ver) {
        folder.version = payload.ver;
      }

      const trades: BookmarksTradeStruct[] = payload.trs.map(trade => {
        let version: string, type: string, slug: string, league: string | null;
        if (exportVersion >= 4) {
          [version, type, league, slug] = trade.loc.split(":");
        } else if (exportVersion >= 3) {
          [version, type, slug] = trade.loc.split(":");
          league = null;
        } else {
          version = "1";
          [type, slug] = trade.loc.split(":");
          league = null;
        }
        return {
          title: trade.tit,
          completedAt: null,
          location: { version: version as TradeSiteVersion, type, slug, league },
        };
      });

      return [folder, trades];
    } catch {
      return null;
    }
  }

  private parseExportVersion(exportString: string): ExportVersion {
    if (exportString.startsWith("4:")) return 4;
    if (exportString.startsWith("3:")) return 3;
    if (exportString.startsWith("2:")) return 2;
    return 1;
  }

  private jsonFromExportString(version: ExportVersion, exportString: string): string {
    if (version >= 2) {
      return Base64.decode(exportString.slice(2));
    }
    return atob(exportString);
  }

  // ─── BACKUP / RESTORE ─────────────────────────────────────

  async generateBackupDataString(): Promise<string> {
    const activeFolderStrings: string[] = [];
    const archivedFolderStrings: string[] = [];

    const folders = await this.fetchFolders();
    for (const folder of folders) {
      if (!folder.id) continue;
      const trades = await this.fetchTradesByFolderId(folder.id);
      const serialized = this.serializeFolder(folder, trades);
      (folder.archivedAt ? archivedFolderStrings : activeFolderStrings).push(serialized);
    }

    return [
      activeFolderStrings.join(LINE_DELIMITER),
      archivedFolderStrings.join(LINE_DELIMITER)
    ].join(SECTION_DELIMITER);
  }

  async restoreFromDataString(dataString: string): Promise<boolean> {
    try {
      const [activeSection, archivedSection] = dataString.split(SECTION_DELIMITER);
      const activeFolderStrings = activeSection.split(LINE_DELIMITER).filter(Boolean);
      const archivedFolderStrings = (archivedSection || "").split(LINE_DELIMITER).filter(Boolean);

      let restoredCount = 0;
      restoredCount += await this.restoreFolders(activeFolderStrings);
      restoredCount += await this.restoreFolders(archivedFolderStrings, { archivedAt: new Date().toISOString() });

      await this.refresh();
      return restoredCount > 0;
    } catch {
      return false;
    }
  }

  private async restoreFolders(folderStrings: string[], overrides: Partial<BookmarksFolderStruct> = {}): Promise<number> {
    let count = 0;
    for (const folderString of folderStrings) {
      const deserialized = this.deserializeFolder(folderString);
      if (!deserialized) continue;

      const [folder, trades] = deserialized;
      const folderId = await this.persistFolder({ ...folder, ...overrides });
      await this.persistTrades(trades, folderId);
      count++;
    }
    return count;
  }

  // ─── HELPERS ──────────────────────────────────────────────

  initializeFolderStruct(version: TradeSiteVersion, partial?: Partial<BookmarksFolderStruct>): BookmarksFolderStruct {
    return {
      version,
      icon: null,
      title: "",
      archivedAt: null,
      ...partial
    };
  }

  initializeTradeStructFrom(location: { version: TradeSiteVersion; type: string; slug: string; league: string | null }): BookmarksTradeStruct {
    return {
      location,
      title: "",
      completedAt: null,
    };
  }
}

export const bookmarksService = new BookmarksService();
