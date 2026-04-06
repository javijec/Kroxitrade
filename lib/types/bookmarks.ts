import type {TradeSiteVersion} from './trade-location';

export interface BookmarksTradeLocation {
  version: TradeSiteVersion;
  type: string;
  slug: string;
  league: string | null;
}

export interface PartialBookmarksTradeLocation {
  version: TradeSiteVersion;
  type: string | null;
  slug: string | null;
  league: string | null;
}

export interface BookmarksTradeStruct {
  id?: string;
  title: string;
  location: BookmarksTradeLocation;
  completedAt: string | null;
}

export interface BookmarksFolderStruct {
  id?: string;
  title: string;
  version: TradeSiteVersion;
  icon: BookmarksFolderIcon | null;
  archivedAt: string | null;
}

export type BookmarksFolderIcon = string; // Simplified for now, or use the enum

export enum BookmarksFolderPoE1ItemIcon {
  ALCHEMY = 'poe1-alchemy',
  CHAOS = 'poe1-chaos',
  EXALT = 'poe1-exalt',
  DIVINE = 'poe1-divine',
  MIRROR = 'poe1-mirror',
  CARD = 'poe1-card',
  ESSENCE = 'poe1-essence',
  FOSSIL = 'poe1-fossil',
  MAP = 'poe1-map',
  SCARAB = 'poe1-scarab',
}

export enum BookmarksFolderPoE2ItemIcon {
  ALCHEMY = 'poe2-alchemy',
  ANNUL = 'poe2-annul',
  ARTIFICER = 'poe2-artificer',
  AUGMENT = 'poe2-augment',
  CHANCE = 'poe2-chance',
  CHAOS = 'poe2-chaos',
  DIVINE = 'poe2-divine',
  ESSENCE = 'poe2-essence',
  EXALT = 'poe2-exalt',
  GEMCUTTER = 'poe2-gemcutter',
  GLASSBLOWER = 'poe2-glassblower',
  MIRROR = 'poe2-mirror',
  REGAL = 'poe2-regal',
  RUNE = 'poe2-rune',
  TRANSMUTE = 'poe2-transmute',
  VAAL = 'poe2-vaal',
  WAYSTONE = 'poe2-waystone',
  WISDOM = 'poe2-wisdom',
}
