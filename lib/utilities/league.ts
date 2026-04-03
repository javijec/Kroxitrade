export const formatLeagueLabel = (league: string): string => {
  const normalizedLeague = league.replace(/^(poe2|xbox|sony)\//i, "")

  try {
    return decodeURIComponent(normalizedLeague)
  } catch {
    return normalizedLeague.replace(/%20/g, " ")
  }
}