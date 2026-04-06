import { slugify } from "../utilities/slugify";
import { dateDelta } from "../utilities/date-delta";
import { hasValidExtensionContext, isExtensionContextInvalidatedError } from "../utilities/extension-context";
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

const RATIOS_CACHE_DURATION = 900000; // 15 minutes
const RATIOS_CACHE_KEY = "poe-ninja-chaos-ratios-cache";

export class PoeNinjaService {
  async fetchChaosRatiosFor(league: string): Promise<PoeNinjaCurrenciesRatios> {
    const cached = await storageService.getValue<PoeNinjaCurrenciesRatios>(RATIOS_CACHE_KEY, league);
    if (cached) return cached;
    return this.fetchFreshChaosRatiosFor(league);
  }

  async fetchFreshChaosRatiosFor(league: string): Promise<PoeNinjaCurrenciesRatios> {
    await storageService.deleteValue(RATIOS_CACHE_KEY, league);

    const ratios = await this.requestChaosRatiosFor(league);
    await storageService.setEphemeralValue(RATIOS_CACHE_KEY, ratios, dateDelta(RATIOS_CACHE_DURATION), league);

    return ratios;
  }

  private async requestChaosRatiosFor(league: string): Promise<PoeNinjaCurrenciesRatios> {
    const uri = `${URIS.currencies}&league=${league}`;
    if (!hasValidExtensionContext()) {
      throw new Error("Extension context invalidated");
    }

    let response: PoeNinjaCurrenciesPayload | null = null;

    try {
      response = await chrome.runtime.sendMessage({ query: "poe-ninja", resource: uri });
    } catch (error) {
      if (isExtensionContextInvalidatedError(error)) {
        throw new Error("Extension context invalidated");
      }

      throw error;
    }
    
    if (!response) throw new Error("Failed to fetch from poe.ninja via background");

    return this.parseChaosRatios(response);
  }

  private parseChaosRatios(payload: PoeNinjaCurrenciesPayload): PoeNinjaCurrenciesRatios {
    return payload.lines.reduce((acc, { currencyTypeName, chaosEquivalent }) => {
      acc[slugify(currencyTypeName)] = chaosEquivalent;
      return acc;
    }, {} as PoeNinjaCurrenciesRatios);
  }
}

export const poeNinjaService = new PoeNinjaService();
