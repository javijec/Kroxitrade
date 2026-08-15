import {
  itemLevelDataField,
  itemPopup,
  itemPopupContent,
  itemPopupHeaderLine,
  modLabelField,
  modStatField,
  qualityDataField
} from "../site-adapter/selectors/common";
import {
  explicitMods,
  explicitModsWithDesecrated,
  fracturedMod,
  implicitMod,
  modCraftedClass,
  modFracturedClass
} from "../site-adapter/selectors/poe1";

const SEPARATOR = "--------";
const UNSUPPORTED_CRAFT_OF_EXILE_MOD_PATTERN =
  /[+\-]\s*\d+\s+(?:Prefix|Suffix)\s+Modifiers?\s+allowed/i;

const readNumber = (popup: HTMLElement, selector: string) => {
  const text = popup.querySelector<HTMLElement>(selector)?.textContent || "";
  return text.match(/\d+/)?.[0] || "";
};

const readAnnotatedMods = (
  popup: HTMLElement,
  selector: string,
  fixedType: "Implicit" | null
) =>
  Array.from(popup.querySelectorAll<HTMLElement>(selector))
    .map((row) => {
      const value = row
        .querySelector<HTMLElement>(modStatField)
        ?.textContent
        ?.replace(/\s+/g, " ")
        .trim();
      if (!value) return "";

      let type: "Implicit" | "Prefix" | "Suffix" = fixedType || "Prefix";
      if (!fixedType) {
        const tierLabel = row.querySelector<HTMLElement>(modLabelField)?.textContent?.trim() || "";
        type = tierLabel.charAt(0).toUpperCase() === "S" ? "Suffix" : "Prefix";
      }

      const annotations = [
        row.classList.contains(modFracturedClass) && "Fractured",
        row.classList.contains(modCraftedClass) && "Crafted"
      ].filter(Boolean);

      return `{ ${[...annotations, type, "Modifier"].join(" ")} }\n${value}`;
    })
    .filter(Boolean);

export const buildCraftOfExileText = (
  row: HTMLElement,
  includeDesecratedMods = false
): string | null => {
  const popup = row.querySelector<HTMLElement>(itemPopup);
  if (!popup) return null;

  const headerLines = Array.from(
    popup.querySelectorAll<HTMLElement>(itemPopupHeaderLine)
  )
    .map((line) => line.textContent?.trim() || "")
    .filter(Boolean);
  if (headerLines.length === 0) return null;

  const implicits = readAnnotatedMods(popup, implicitMod, "Implicit");
  const explicitSelector = includeDesecratedMods
    ? explicitModsWithDesecrated
    : explicitMods;
  const explicits = readAnnotatedMods(popup, explicitSelector, null);
  const rarity = headerLines.length >= 2
    ? "Rare"
    : explicits.length > 0
      ? "Magic"
      : "Normal";
  const name = headerLines.length >= 2 ? headerLines[0] : "";
  const base = headerLines.length >= 2 ? headerLines[1] : headerLines[0];
  const quality = readNumber(popup, qualityDataField);
  const itemLevel = readNumber(popup, itemLevelDataField);
  const fractured = popup.querySelector(fracturedMod) !== null;
  const corrupted = /\bcorrupted\b/i.test(popup.textContent || "");

  const sections: string[][] = [
    [`Rarity: ${rarity}`, name, base].filter(Boolean)
  ];
  if (quality) sections.push([`Quality: +${quality}% (augmented)`]);
  if (itemLevel) sections.push([`Item Level: ${itemLevel}`]);
  if (implicits.length) sections.push(implicits);
  if (explicits.length) sections.push(explicits);
  if (fractured) sections.push(["Fractured Item"]);
  if (corrupted) sections.push(["Corrupted"]);

  return sections.map((section) => section.join("\n")).join(`\n${SEPARATOR}\n`);
};

export const hasUnsupportedCraftOfExileMod = (row: HTMLElement): boolean => {
  const content = row.querySelector<HTMLElement>(itemPopupContent) || row;
  return UNSUPPORTED_CRAFT_OF_EXILE_MOD_PATTERN.test(content.textContent || "");
};

export const copyTextSynchronously = (text: string): boolean => {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);

  const selection = window.getSelection();
  const savedRanges: Range[] = [];
  if (selection) {
    for (let index = 0; index < selection.rangeCount; index++) {
      savedRanges.push(selection.getRangeAt(index).cloneRange());
    }
  }

  let copied = false;
  try {
    textarea.select();
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    textarea.remove();
    if (selection) {
      selection.removeAllRanges();
      savedRanges.forEach((range) => selection.addRange(range));
    }
  }

  return copied;
};
