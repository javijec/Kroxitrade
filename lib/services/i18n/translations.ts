import { germanTranslations } from "./de"
import { englishTranslations } from "./en"
import { spanishTranslations } from "./es"
import { frenchTranslations } from "./fr"
import { japaneseTranslations } from "./ja"
import { koreanTranslations } from "./ko"
import { portugueseTranslations } from "./pt"
import { russianTranslations } from "./ru"
import { swedishTranslations } from "./sv"
import { thaiTranslations } from "./th"
import type { TranslationValue } from "./types"
import { simplifiedChineseTranslations } from "./zh-cn"
import { traditionalChineseTranslations } from "./zh-tw"

export const translations = {
  en: englishTranslations,
  es: spanishTranslations
} as Record<"en" | "es", Record<string, TranslationValue>>

export const englishFallback = englishTranslations

export const extendedTranslations: Record<
  | "en"
  | "es"
  | "pt"
  | "ru"
  | "sv"
  | "th"
  | "de"
  | "fr"
  | "ja"
  | "ko"
  | "zh-cn"
  | "zh-tw",
  Record<string, TranslationValue>
> = {
  ...translations,
  pt: { ...englishFallback, ...portugueseTranslations },
  ru: { ...englishFallback, ...russianTranslations },
  sv: { ...englishFallback, ...swedishTranslations },
  th: { ...englishFallback, ...thaiTranslations },
  de: { ...englishFallback, ...germanTranslations },
  fr: { ...englishFallback, ...frenchTranslations },
  ja: { ...englishFallback, ...japaneseTranslations },
  ko: { ...englishFallback, ...koreanTranslations },
  "zh-cn": { ...englishFallback, ...simplifiedChineseTranslations },
  "zh-tw": { ...englishFallback, ...traditionalChineseTranslations }
}
