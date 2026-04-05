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
  private tradesCache = new Map<string, BookmarksTradeStruct[]>();
  private tradesRequests = new Map<string, Promise<BookmarksTradeStruct[]>>();
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

  private normalizeTrades(trades: BookmarksTradeStruct[] | null | undefined): BookmarksTradeStruct[] {
    return (trades || []).map(t => ({
      ...t,
      location: { ...t.location, version: t.location.version || "1", league: t.location.league || null }
    }));
  }

  getCachedTradesByFolderId(folderId: string): BookmarksTradeStruct[] | null {
    const cached = this.tradesCache.get(folderId);
    return cached ? [...cached] : null;
  }

  async fetchTradesByFolderId(folderId: string, options?: { force?: boolean }): Promise<BookmarksTradeStruct[]> {
    if (!options?.force) {
      const cached = this.getCachedTradesByFolderId(folderId);
      if (cached) {
        return cached;
      }

      const pending = this.tradesRequests.get(folderId);
      if (pending) {
        return pending;
      }
    }

    const request = storageService
      .getValue<BookmarksTradeStruct[]>(`${TRADES_PREFIX_KEY}--${folderId}`)
      .then((trades) => {
        const normalized = this.normalizeTrades(trades);
        this.tradesCache.set(folderId, normalized);
        return [...normalized];
      })
      .finally(() => {
        this.tradesRequests.delete(folderId);
      });

    this.tradesRequests.set(folderId, request);
    return request;
  }

  async fetchTradeByLocation(location: PartialBookmarksTradeLocation): Promise<BookmarksTradeStruct | null> {
    const folders = await this.fetchFolders();

    const unarchivedFolders = folders.filter(f => !f.archivedAt);
    const archivedFolders = folders.filter(f => f.archivedAt);

    const matchLocation = (t: BookmarksTradeStruct) =>
      t.location.version === location.version &&
      t.location.slug === location.slug &&
      t.location.type === location.type &&
      (t.location.league === null || t.location.league === location.league);

    const unarchivedResults = await Promise.all(
      unarchivedFolders.map(f => this.fetchTradesByFolderId(f.id!))
    );
    for (const trades of unarchivedResults) {
      const match = trades.find(matchLocation);
      if (match) return match;
    }

    const archivedResults = await Promise.all(
      archivedFolders.map(f => this.fetchTradesByFolderId(f.id!))
    );
    for (const trades of archivedResults) {
      const match = trades.find(matchLocation);
      if (match) return match;
    }

    return null;
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

  async persistTrades(trades: BookmarksTradeStruct[], folderId: string): Promise<BookmarksTradeStruct[]> {
    const safeTrades = this.normalizeTrades(trades.map(t => ({ ...t, id: t.id || uniqueId() })));
    this.tradesCache.set(folderId, safeTrades);
    await storageService.setValue(`${TRADES_PREFIX_KEY}--${folderId}`, safeTrades);
    return [...safeTrades];
  }

  async deleteTrade(tradeId: string, folderId: string): Promise<BookmarksTradeStruct[]> {
    const trades = await this.fetchTradesByFolderId(folderId);
    const updated = trades.filter(t => t.id !== tradeId);
    const persisted = await this.persistTrades(updated, folderId);
    await this.refresh();
    return persisted;
  }

  async deleteFolder(folderId: string) {
    const folders = await this.fetchFolders();
    const updated = folders.filter(f => f.id !== folderId);
    await this.persistFolders(updated);
    this.tradesCache.delete(folderId);
    this.tradesRequests.delete(folderId);
    await storageService.deleteValue(`${TRADES_PREFIX_KEY}--${folderId}`);
    await this.refresh();
  }

  async duplicateTrade(trade: BookmarksTradeStruct, targetFolderId: string): Promise<BookmarksTradeStruct[]> {
    const newTrade = { ...trade, id: uniqueId() };
    const trades = await this.fetchTradesByFolderId(targetFolderId);
    const persisted = await this.persistTrades([...trades, newTrade], targetFolderId);
    await this.refresh();
    return persisted;
  }

  async renameFolder(folder: BookmarksFolderStruct, title: string) {
    return this.persistFolder({ ...folder, title });
  }

  async duplicateFolder(folder: BookmarksFolderStruct) {
    if (!folder.id) throw new Error("Cannot duplicate a folder without an id");
    const newFolder = {
      ...folder,
      id: undefined,
      title: `${folder.title} (copy)`
    };
    const newFolderId = await this.persistFolder(newFolder);
    const trades = await this.fetchTradesByFolderId(folder.id);
    const duplicatedTrades = trades.map(trade => {
      const { id, ...tradeWithoutId } = trade;
      return { ...tradeWithoutId, id: undefined };
    });
    await this.persistTrades(duplicatedTrades, newFolderId);
    await this.refresh();
  }

  async renameTrade(trade: BookmarksTradeStruct, folderId: string, title: string): Promise<BookmarksTradeStruct[]> {
    const trades = await this.fetchTradesByFolderId(folderId);
    const updated = trades.map(t => t.id === trade.id ? { ...t, title } : t);
    const persisted = await this.persistTrades(updated, folderId);
    await this.refresh();
    return persisted;
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

  async moveTrade(tradeId: string, folderId: string, newIndex: number): Promise<BookmarksTradeStruct[]> {
    const trades = await this.fetchTradesByFolderId(folderId);
    const index = trades.findIndex(t => t.id === tradeId);
    if (index === -1) return trades;
    
    const safeIndex = Math.max(0, Math.min(newIndex, trades.length - 1));
    if (index === safeIndex) return trades;

    const updated = [...trades];
    const [movedElement] = updated.splice(index, 1);
    updated.splice(safeIndex, 0, movedElement);
    
    const persisted = await this.persistTrades(updated, folderId);
    await this.refresh();
    return persisted;
  }

  async moveFolder(folderId: string, newIndex: number, options: { version: TradeSiteVersion; archived: boolean }) {
    const folders = await this.fetchFolders();
    const matchingFolders = folders.filter(
      (folder) => folder.version === options.version && !!folder.archivedAt === options.archived
    );
    const currentIndex = matchingFolders.findIndex((folder) => folder.id === folderId);
    if (currentIndex === -1) return;

    const safeIndex = Math.max(0, Math.min(newIndex, matchingFolders.length - 1));
    if (currentIndex === safeIndex) return;

    const reorderedFolders = [...matchingFolders];
    const [movedFolder] = reorderedFolders.splice(currentIndex, 1);
    reorderedFolders.splice(safeIndex, 0, movedFolder);

    const updatedFolders = this.partiallyReorderFolders(folders, reorderedFolders);
    await this.persistFolders(updatedFolders);
    await this.refresh();
  }

  // ─── LOGIC ────────────────────────────────────────────────

  async toggleTradeCompletion(trade: BookmarksTradeStruct, folderId: string): Promise<BookmarksTradeStruct[]> {
    const trades = await this.fetchTradesByFolderId(folderId);
    const updated = trades.map((entry) =>
      entry.id === trade.id
        ? { ...entry, completedAt: entry.completedAt ? null : new Date().toISOString() }
        : entry
    );
    const persisted = await this.persistTrades(updated, folderId);
    await this.refresh();
    return persisted;
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
