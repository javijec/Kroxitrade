// Selectors for the Trade Site's own DOM (pathofexile.com trade pages).
// If GGG changes a class or structure, fix it here in one place.
// These are the exact selector strings currently used by the features; keep
// them byte-identical when migrating call sites so behavior does not change.

export const resultsContainer = ".search-results, .resultset, .results"

export const bulkSellerRows =
  ".search-results .row, .search-results .result-item, .result-list .row, .result-list .result-item, .row[data-id]"

export const itemResultRows =
  ".search-results .result-item, .search-results .row, .result-list .result-item, .row"

export const finerResultRows =
  ".resultset > .row, .resultset > .result-item, .search-results .result-item, .search-results .row"

export const mods =
  '.item-popup__content .item-mod, .itemBoxContent > .content > div, .content [class*="Mod"], .item-stats .stat-line'

export const modsForAction =
  '.item-mod, .itemBoxContent > .content > div, .content [class*="Mod"], .item-stats .stat-line'

export const modHashField = ".lc.s"
export const modLabelField = ".lc.l"
export const modValueField = ".lc.r.su, .lc.r.pr, .lc.r"

export const layoutButton = ".layout-btn"

export const searchInput =
  ".search-panel .search-bar .search-left input, .search-panel-content .search-bar input"
export const categoryInput =
  ".search-advanced-items .filter-group:nth-of-type(1) .filter-property:nth-of-type(1) input"
export const rarityInput =
  ".search-advanced-items .filter-group:nth-of-type(1) .filter-property:nth-of-type(2) input"
export const statsTitles =
  ".search-advanced-pane:last-child .filter-group-body .filter:not(.disabled) .filter-title, .filter-group-body .filter .filter-title"

export const quickFiltersPane = ".search-advanced-pane.brown"
export const expandedFilterGroup = ".filter-group.expanded"

export const filterProperty = ".filter.filter-property"
export const filterTitle = ".filter-title"
export const multiselect = ".multiselect"
export const multiselectInput = "input.multiselect__input"
export const multiselectOption = ".multiselect__option"
export const multiselectItem = ".multiselect__option, .multiselect__single"

export const searchButton = ".btn.search-btn"
export const directBuyButton =
  "button.direct-btn, .direct-btn, button.btn.direct-btn"

export const itemLevelField =
  '.item-property [data-field="ilvl"], [data-field="ilvl"], .itemLevel'
export const socket = ".sockets .socket"
export const itemIcon = ".icon img"
export const itemRendered = ".itemRendered"
export const modValueSpan = '.item-mod [data-field^="stat."]'
