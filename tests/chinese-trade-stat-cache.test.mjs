import assert from "node:assert/strict"
import test from "node:test"

import {
  buildLocalizedStatCache,
  buildLocalizedItemCache,
  buildModifierTranslationMap
} from "../lib/services/chinese-trade/stat-cache-transform.ts"

const international = [
  {
    id: "explicit",
    label: "Explicit",
    entries: [
      {
        id: "stat_fire",
        text: "+#% to Fire Resistance",
        option: { options: [{ id: 1, text: "Any" }] }
      }
    ]
  }
]

const taiwan = [
  {
    id: "explicit",
    label: "明確",
    entries: [
      {
        id: "stat_fire",
        text: "+#% 火焰抗性",
        option: { options: [{ id: 1, text: "任何" }] }
      },
      { id: "stat_boss|4", text: "佔據：塑界者" }
    ]
  }
]

test("keeps official ids while making stat labels bilingual", () => {
  const [group] = buildLocalizedStatCache(taiwan, international, {}, "tw")
  assert.equal(group.label, "明確")
  assert.equal(group.entries[0].id, "stat_fire")
  assert.equal(group.entries[0].text, "+#% 火焰抗性 (+#% to Fire Resistance)")
  assert.equal(group.entries[0].option.options[0].id, 1)
  assert.equal(group.entries[0].option.options[0].text, "任何 (Any)")
})

test("fills a missing official label from the local dictionary", () => {
  const [group] = buildLocalizedStatCache(
    [{ id: "explicit", entries: [] }],
    international,
    { tw: { "#tofireresistance": "+#% 火焰抗性" } },
    "tw"
  )
  assert.equal(group.entries[0].text, "+#% 火焰抗性 (+#% to Fire Resistance)")
})

test("converts Taiwan-only option rows into an API-safe base entry", () => {
  const [group] = buildLocalizedStatCache(taiwan, international, {}, "tw")
  const boss = group.entries.find((entry) => entry.id === "stat_boss")
  assert.deepEqual(boss?.option?.options, [{ id: 4, text: "佔據：塑界者" }])
})

test("pairs item-result modifiers by stat id and option id", () => {
  const map = buildModifierTranslationMap(taiwan, international)
  assert.deepEqual(map.stat_fire, {
    tw: "+#% 火焰抗性",
    us: "+#% to Fire Resistance",
    opt: { Any: "任何" }
  })
})

test("keeps Trade2 item ids while making their labels bilingual", () => {
  const [group] = buildLocalizedItemCache(
    [{ id: "weapon", label: "武器", entries: [{ id: "wand", text: "魔杖" }] }],
    [{ id: "weapon", label: "Weapon", entries: [{ id: "wand", text: "Wand" }] }],
    "tw"
  )
  assert.equal(group.label, "武器")
  assert.equal(group.entries[0].id, "wand")
  assert.equal(group.entries[0].text, "魔杖 (Wand)")
})
