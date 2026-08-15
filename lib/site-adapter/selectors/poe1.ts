// Selectors that only exist on PoE1 Trade pages.

export const mutatedModContainer =
  ".item-popup__content, .itemBoxContent > .content"

export const modImplicitClass = "item-mod--implicit"
export const modExplicitClass = "item-mod--explicit"
export const modMutatedClass = "item-mod--mutated"
export const modFracturedClass = "item-mod--fractured"
export const modCraftedClass = "item-mod--crafted"
export const modDesecratedClass = "item-mod--desecrated"

export const implicitMod = ".item-mod--implicit"
export const fracturedMod = ".item-mod--fractured"
export const containerModItems =
  ":scope > .item-mod--mutated, :scope > .item-mod--explicit"
export const explicitMods =
  ".item-mod:is(.item-mod--explicit, .item-mod--fractured, .item-mod--crafted)"
export const explicitModsWithDesecrated =
  ".item-mod:is(.item-mod--explicit, .item-mod--fractured, .item-mod--desecrated, .item-mod--crafted)"
