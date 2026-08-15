export const listModifiers: Array<{
  name: string
  types: string[]
  prefix: string
}> = [
  {
    name: "Pseudo Res/Life",
    types: ["life", "cold", "fire", "light", "chaos"],
    prefix: "pseudo.pseudo_"
  },
  {
    name: "Explicit Res/Life",
    types: [
      "explicit_life",
      "explicit_cold",
      "explicit_fire",
      "explicit_light",
      "explicit_chaos"
    ],
    prefix: "explicit.stat_"
  },
  {
    name: "Attack Weapon",
    types: [
      "explicit_inc_phy_dmg",
      "explicit_add_phy_local",
      "explicit_add_fire_local",
      "explicit_add_cold_local",
      "explicit_add_light_local",
      "explicit_add_chaos_local",
      "explicit_inc_attack_speed_local",
      "explicit_inc_crit_chance",
      "explicit_global_crit_mult"
    ],
    prefix: "explicit.stat_"
  },
  {
    name: "Spell Weapon",
    types: [
      "explicit_inc_spell_dmg",
      "explicit_inc_fire_spell_dmg",
      "explicit_inc_cold_spell_dmg",
      "explicit_inc_light_spell_dmg",
      "explicit_add_fire_spell_dmg",
      "explicit_add_cold_spell_dmg",
      "explicit_add_light_spell_dmg",
      "explicit_gain_extra_fire_damage",
      "explicit_gain_extra_cold_damage",
      "explicit_gain_extra_light_damage",
      "explicit_level_all_spells",
      "explicit_level_all_fire_spells",
      "explicit_level_all_cold_spells",
      "explicit_level_all_light_spells",
      "explicit_level_all_physical_spells",
      "explicit_level_all_chaos_spells",
      "explicit_inc_cast_speed",
      "explicit_global_crit_mult"
    ],
    prefix: "explicit.stat_"
  }
]
