import assert from "node:assert/strict"
import test from "node:test"

import { formatTradeUrl } from "../lib/utilities/trade-url-format.ts"

test("keeps Better Trading's embedded search state in the query string", () => {
  const query = "?q=%7B%22query%22%3A%7B%22status%22%3A%7B%22option%22%3A%22online%22%7D%7D%7D"

  assert.equal(
    formatTradeUrl(
      "https://www.pathofexile.com",
      "trade",
      "search",
      "search",
      "Standard",
      query,
      encodeURIComponent(query)
    ),
    `https://www.pathofexile.com/trade/search/Standard/${query}`
  )
})

test("continues to encode ordinary short search IDs as path segments", () => {
  assert.equal(
    formatTradeUrl(
      "https://www.pathofexile.com",
      "trade",
      "search",
      "search",
      "Standard",
      "My Search",
      encodeURIComponent("My Search")
    ),
    "https://www.pathofexile.com/trade/search/Standard/My%20Search"
  )
})
