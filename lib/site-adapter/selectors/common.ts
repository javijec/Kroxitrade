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

export const resultRowId = "[data-id]"
export const resultRowAncestor = ".row, .result-item"
export const modElement = ".item-mod"
export const uniqueItemPopup = ".item-popup--unique"
export const compactResults = ".results.compact"

export const itemPopup = ".item-popup"
export const itemPopupHeaderLine = ".item-popup__header-line"
export const itemPopupContent = ".item-popup__content"
export const uniqueItemHeader =
  ".item-popup__header--unique, .item-popup__header--gem"
export const itemTitleLine = ".itemName .itemHeader, .item-popup__header-line"
export const itemTitleCandidates = [
  ".itemName",
  ".itemHeader .name",
  ".itemHeader .title",
  ".itemHeader .lprice .title",
  ".item-popup__header",
  ".item-popup__header-line",
  ".details .itemName",
  ".details .title",
  ".details h3",
  ".header .title"
] as const
export const itemDetails = ".details"
export const sellerName = "span.profile-link a, .profile-link a, .account-name"
export const pinnedItemDetails = ".itemPopupContainer, .item-popup"

export const itemPrice = '[data-field="price"], .price'
export const itemPriceIcon =
  '[data-field="price"] img, .price img.currency-icon, .price img'
export const priceNote = ".price-note, .note"
export const priceInfo =
  '[data-field="price"], .details .price, .itemHeader .lprice, .price'
export const priceCurrency =
  '[data-field="price"] .currency-text span, .currency-text span, .currency-text'
export const buyoutPriceInputs = "input.minmax, input[placeholder]"

export const modStatField = '[data-field^="stat."]'
export const qualityDataField = '[data-field="quality"]'
export const itemLevelDataField = '[data-field="ilvl"]'
export const flagsSeparator = 'hr[name="flags"]'
export const explicitSeparator = 'hr[name="explicit"]'

export const itemLevelField =
  '.item-property [data-field="ilvl"], [data-field="ilvl"], .itemLevel'
export const socket = ".sockets .socket"
export const itemIcon = ".icon img"
export const itemRendered = ".itemRendered"
export const modValueSpan = '.item-mod [data-field^="stat."]'
