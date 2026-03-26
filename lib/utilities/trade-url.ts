import { tradeLocationService } from "../services/trade-location";
import type { TradeSiteVersion } from "../types/trade-location";

export const getTradeUrl = (
  version: TradeSiteVersion, 
  type: string, 
  slug: string, 
  league: string, 
  suffix: string = ""
) => {
  return tradeLocationService.getTradeUrl(version, type, slug, league) + suffix;
};
