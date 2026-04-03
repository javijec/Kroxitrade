export const normalizeIcon = (
  svg: string,
  size = 13,
  viewBox = "-2 -2 28 28",
  strokeWidth = 1.7,
  className = "action-svg"
): string =>
  svg.replace(/<svg\b([^>]*)>/, (_match, attrs) => {
    const cleaned = attrs
      .replace(/\sclass="[^"]*"/g, "")
      .replace(/\swidth="[^"]*"/g, "")
      .replace(/\sheight="[^"]*"/g, "")
      .replace(/\sviewBox="[^"]*"/g, "")
      .trim()
    return `<svg ${cleaned} viewBox="${viewBox}" class="${className}" style="width:${size}px;height:${size}px;min-width:${size}px;min-height:${size}px;display:block;overflow:visible;stroke-width:${strokeWidth};">`
  })
