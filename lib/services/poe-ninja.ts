import { slugify } from "../utilities/slugify";
import { dateDelta } from "../utilities/date-delta";
import { storageService } from "./storage";

export interface PoeNinjaCurrenciesPayloadLine {
  currencyTypeName: string;
  chaosEquivalent: number;
}

export interface PoeNinjaCurrenciesPayload {
  lines: PoeNinjaCurrenciesPayloadLine[];
}

export interface PoeNinjaCurrenciesRatios {
  [key: string]: number;
}

const URIS = {
  currencies: "/data/currencyoverview?type=Currency"
};

const RATIOS_CACHE_DURATION = 3600000; // 1 hour
const RATIOS_CACHE_KEY = "poe-ninja-chaos-ratios-cache";

export class PoeNinjaService {
  async fetchChaosRatiosFor(league: string): Promise<PoeNinjaCurrenciesRatios> {
    const cached = await storageService.getValue<PoeNinjaCurrenciesRatios>(RATIOS_CACHE_KEY, league);
    if (cached) return cached;

    const uri = `${URIS.currencies}&league=${league}`;
    const response = await chrome.runtime.sendMessage({ query: "poe-ninja", resource: uri });
    
    if (!response) throw new Error("Failed to fetch from poe.ninja via background");

    const ratios = this.parseChaosRatios(response);
    await storageService.setEphemeralValue(RATIOS_CACHE_KEY, ratios, dateDelta(RATIOS_CACHE_DURATION), league);

    return ratios;
  }

  private parseChaosRatios(payload: PoeNinjaCurrenciesPayload): PoeNinjaCurrenciesRatios {
    return payload.lines.reduce((acc, { currencyTypeName, chaosEquivalent }) => {
      acc[slugify(currencyTypeName)] = chaosEquivalent;
      return acc;
    }, {} as PoeNinjaCurrenciesRatios);
  }
}

export const poeNinjaService = new PoeNinjaService();
