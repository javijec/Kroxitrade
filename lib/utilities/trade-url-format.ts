export const formatTradeUrl = (
  baseUrl: string,
  basePath: string,
  type: string,
  encodedType: string,
  encodedLeague: string,
  slug: string,
  encodedSlug: string
) => {
  const tradeUrl = `${baseUrl}/${basePath}/${encodedType}/${encodedLeague}`

  // Better Trading exports from before short search IDs stored the complete
  // query string in the bookmark slug (for example, `?q=%7B...%7D`). This
  // must remain a URL query rather than being encoded as a path segment.
  if (type === "search" && slug.startsWith("?")) {
    return `${tradeUrl}/${slug}`
  }

  return `${tradeUrl}/${encodedSlug}`
}
