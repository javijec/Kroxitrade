import assert from "node:assert/strict"
import test from "node:test"

const { createFeatureLifecycle } =
  await import("../lib/core/feature-lifecycle.ts")

test("start() wires the feature exactly once and stop() tears it down", () => {
  let wires = 0
  let tears = 0
  const feature = createFeatureLifecycle("test", () => {
    wires++
    return () => {
      tears++
    }
  })

  feature.start()
  feature.start()
  assert.equal(wires, 1)

  feature.stop()
  feature.stop()
  assert.equal(tears, 1)
})

test("a stopped feature can be restarted from scratch", () => {
  let wires = 0
  let tears = 0
  const feature = createFeatureLifecycle("test", () => {
    wires++
    return () => {
      tears++
    }
  })

  feature.start()
  feature.stop()
  feature.start()
  assert.equal(wires, 2)
  assert.equal(tears, 1)

  feature.stop()
  assert.equal(tears, 2)
})

test("exposes its id", () => {
  assert.equal(
    createFeatureLifecycle("finer-filters", () => () => {}).id,
    "finer-filters"
  )
})

test("calling stop() before start() is a no-op", () => {
  let tears = 0
  const feature = createFeatureLifecycle("test", () => () => {
    tears++
  })

  feature.stop()
  assert.equal(tears, 0)
  feature.start()
  assert.equal(tears, 0)
})
