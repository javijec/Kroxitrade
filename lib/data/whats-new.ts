export interface WhatsNewItem {
  title?: string;
  description?: string;
  titleKey?: string;
  descriptionKey?: string;
}

export interface WhatsNewGroup {
  titleKey: string;
  items: WhatsNewItem[];
}

export interface WhatsNewSection {
  titleKey?: string;
  title?: string;
  items?: WhatsNewItem[];
  groups?: WhatsNewGroup[];
}

export interface WhatsNewEntry {
  version: string;
  date: string;
  sections: WhatsNewSection[];
}

const version111Items: WhatsNewItem[] = [
  {
    title: "Foulborn items add the correct modifier",
    description:
      "Quick filter buttons now compensate for mutated Foulborn item rows where the trade site shifts modifier stat ids out of visual order."
  },
  {
    title: "Bookmark action buttons no longer open searches",
    description:
      "Editing, refreshing, duplicating, or opening the bookmark menu stays inside that action instead of triggering the saved search row."
  },
  {
    title: "PoE2 copy stays out of PoE1",
    description:
      "The Path of Building copy option is now only shown on the PoE2 trade site."
  },
  {
    title: "Craft of Exile buttons keep their shape",
    description:
      "The CoE action button is now a centered 30px square so it aligns cleanly with the result row controls."
  },
  {
    title: "Craft of Exile copy avoids unsupported modifier slots",
    description:
      "Items with Prefix/Suffix Modifier allowed affixes now show a greyed CoE button with an explanation, while Copy for PoB keeps working."
  },
  {
    title: "Version-specific settings are clearer",
    description:
      "PoE1 and PoE2 can keep separate result-tool preferences where that matters, and PoE2-only tools stay hidden on PoE1."
  }
];

const version1111Features: WhatsNewItem[] = [
  {
    titleKey: "whatsNew.item.tutorialRefreshTitle",
    descriptionKey: "whatsNew.item.tutorialRefreshDescription"
  },
  {
    titleKey: "whatsNew.item.bookmarkPreviewRealTitle",
    descriptionKey: "whatsNew.item.bookmarkPreviewRealDescription"
  }
];

const version1112Fixes: WhatsNewItem[] = [
  {
    titleKey: "whatsNew.item.middleClickAutoScrollTitle",
    descriptionKey: "whatsNew.item.middleClickAutoScrollDescription"
  }
];

const version1113Features: WhatsNewItem[] = [
  {
    titleKey: "whatsNew.item.kakaoTradeSupportTitle",
    descriptionKey: "whatsNew.item.kakaoTradeSupportDescription"
  }
];

const version1114Features: WhatsNewItem[] = [
  {
    titleKey: "whatsNew.item.middleClickFolderTitle",
    descriptionKey: "whatsNew.item.middleClickFolderDescription"
  }
];

const version1116Fixes: WhatsNewItem[] = [
  {
    titleKey: "whatsNew.item.mediumTextSizeTitle",
    descriptionKey: "whatsNew.item.mediumTextSizeDescription"
  }
];

const version1117Features: WhatsNewItem[] = [
  {
    titleKey: "whatsNew.item.syncAcrossDevicesTitle",
    descriptionKey: "whatsNew.item.syncAcrossDevicesDescription"
  }
];

const version1118Features: WhatsNewItem[] = [
  {
    titleKey: "whatsNew.item.pinnedItemsTitle",
    descriptionKey: "whatsNew.item.pinnedItemsDescription"
  }
];

const version1119Features: WhatsNewItem[] = [
  {
    titleKey: "whatsNew.item.duplicateBookmarksTitle",
    descriptionKey: "whatsNew.item.duplicateBookmarksDescription"
  }
];

const version1120Features: WhatsNewItem[] = [
  {
    titleKey: "whatsNew.item.chineseTradeTranslationTitle",
    descriptionKey: "whatsNew.item.chineseTradeTranslationDescription"
  },
  {
    titleKey: "whatsNew.item.archiveBookmarksTitle",
    descriptionKey: "whatsNew.item.archiveBookmarksDescription"
  },
  {
    titleKey: "whatsNew.item.gemReferenceLinksTitle",
    descriptionKey: "whatsNew.item.gemReferenceLinksDescription"
  },
  {
    titleKey: "whatsNew.item.githubReleaseNotesTitle",
    descriptionKey: "whatsNew.item.githubReleaseNotesDescription"
  }
];

const version1120Fixes: WhatsNewItem[] = [
  {
    titleKey: "whatsNew.item.historyReliabilityTitle",
    descriptionKey: "whatsNew.item.historyReliabilityDescription"
  }
];

const version1121Fixes: WhatsNewItem[] = [
  {
    titleKey: "whatsNew.item.reducedPermissionsTitle",
    descriptionKey: "whatsNew.item.reducedPermissionsDescription"
  }
];

const version1122Features: WhatsNewItem[] = [
  {
    titleKey: "whatsNew.item.valdoRewardPricingTitle",
    descriptionKey: "whatsNew.item.valdoRewardPricingDescription"
  }
];

const version1122Fixes: WhatsNewItem[] = [
  {
    titleKey: "whatsNew.item.chineseTradeCacheRecoveryTitle",
    descriptionKey: "whatsNew.item.chineseTradeCacheRecoveryDescription"
  }
];

const version1123Fixes: WhatsNewItem[] = [
  {
    titleKey: "whatsNew.item.chineseTradeTranslationLoadingTitle",
    descriptionKey: "whatsNew.item.chineseTradeTranslationLoadingDescription"
  },
  {
    titleKey: "whatsNew.item.syncRecoveryTitle",
    descriptionKey: "whatsNew.item.syncRecoveryDescription"
  },
  {
    titleKey: "whatsNew.item.valdoTaiwanAvailabilityTitle",
    descriptionKey: "whatsNew.item.valdoTaiwanAvailabilityDescription"
  }
];

const version1124Fixes: WhatsNewItem[] = [
  {
    title: "Bulk folder opening is temporarily disabled",
    description:
      "Opening every saved search in a folder is temporarily disabled to avoid Path of Exile Trade rate limits. Individual searches can still be opened in a new background tab with middle-click."
  }
];

const version112Features: WhatsNewItem[] = [
  {
    title: "External reference links in the popup",
    description:
      "The popup can now show grouped PoE1 and PoE2 shortcuts for the official trade-adjacent tools, including the Path of Exile Wiki, Path of Exile 2 Wiki, Path of Regex, Craft of Exile, PoEDb, PoE2Db, and poe.ninja."
  },
  {
    title: "New PoE2 bookmark folder icons",
    description:
      "Disciple of Varashta, Martial Artist, and Spirit Walker icons are available for PoE2 bookmark folders."
  },
  {
    title: "Mageblood Legacy descriptions for PoE2",
    description:
      "A new Results setting can show hidden Mageblood Legacy effects below PoE2 item results, including duplicate Legacy scaling."
  }
];

const version112Fixes: WhatsNewItem[] = [
  {
    title: "Localized PoE2 trade links load correctly",
    description:
      "Bookmarks and helper panels now recognize localized trade2 hosts such as es.pathofexile.com and keep league URLs with spaces encoded correctly."
  },
  {
    title: "Mageblood Legacy works across languages",
    description:
      "Legacy detection now uses stable trade stat ids, with localized effect descriptions for English, Spanish, Portuguese, Russian, Thai, German, French, Japanese, and Korean."
  }
];

const version112Polish: WhatsNewItem[] = [
  {
    title: "Mageblood details stay quiet until hover",
    description:
      "Legacy descriptions show the final value by default, while base value and duplicate effect details appear inline on hover."
  },
  {
    title: "Mageblood descriptions match item layout",
    description:
      "Legacy description blocks now sit below corrupt/explicit separators like native notable descriptions and stay out of copied item text."
  }
];

const version113Items: WhatsNewItem[] = [
  {
    title: "Full extension backup",
    description:
      "Backup files now include saved folders, searches, global settings, PoE1/PoE2 result settings, and extension preferences in one portable JSON file."
  },
  {
    title: "Old folder backups still restore",
    description:
      "The restore action still accepts older folder-only .txt exports, so existing backups remain usable."
  }
];

const version114Items: WhatsNewItem[] = [
  {
    title: "Adjustable text size",
    description:
      "Interface settings now include Small, Medium, Large, and Extra text sizes, with Large as the default."
  },
  {
    title: "Tutorial access moved to About",
    description:
      "The button to reopen the onboarding tutorial now lives in About, keeping Interface settings focused on display and language options."
  }
];

const version115Features: WhatsNewItem[] = [
  {
    title: "Bookmark categories inside folders",
    description:
      "Saved searches can now be grouped into optional categories inside each bookmark folder. The feature is off by default, and turning it off returns every bookmark to the main folder list."
  },
  {
    title: "Cleaner bookmark action menus",
    description:
      "Category assignment, category creation, and category deletion now live inside the bookmark action menu, with inline creation and the same delete confirmation modal used elsewhere."
  }
];

const version115Polish: WhatsNewItem[] = [
  {
    title: "Settings are more compact",
    description:
      "Long setting descriptions now appear as hover help, reducing visual clutter while keeping the details available when you need them."
  },
  {
    title: "General settings are clearer",
    description:
      "The Interface tab is now General, and Backup & Restore lives there alongside the other extension-wide options."
  }
];

const version116Features: WhatsNewItem[] = [
  {
    title: "Wiki button for unique items",
    description:
      "Results can now show an optional W action on unique items that opens the matching PoE Wiki or PoE2 Wiki page."
  },
  {
    titleKey: "whatsNew.item.minimalBookmarksTitle",
    descriptionKey: "whatsNew.item.minimalBookmarksDescription"
  },
  {
    titleKey: "whatsNew.item.bookmarkActionsByLayoutTitle",
    descriptionKey: "whatsNew.item.bookmarkActionsByLayoutDescription"
  }
];

const version118Features: WhatsNewItem[] = [
  {
    title: "Optional desecrated mods in Craft of Exile exports",
    description:
      "Craft of Exile exports now exclude desecrated mods by default. You can opt in from Results settings to include them as normal modifiers, with a warning that Craft of Exile does not yet support importing them."
  }
];

const version118Fixes: WhatsNewItem[] = [
  {
    title: "Bookmarks update more reliably",
    description:
      "Saved bookmark changes now validate stored data before updating the sidebar, preventing malformed or outdated storage entries from causing problems."
  },
  {
    title: "Cleaner Bookmark Layout preview",
    description:
      "The live Bookmark Layout preview no longer shows a league label, keeping the sample focused on the layout and actions."
  }
];

const version117Features: WhatsNewItem[] = [
  {
    titleKey: "whatsNew.item.activeRealmBookmarksTitle",
    descriptionKey: "whatsNew.item.activeRealmBookmarksDescription"
  },
  {
    titleKey: "whatsNew.item.buyoutClearTitle",
    descriptionKey: "whatsNew.item.buyoutClearDescription"
  }
];

const version110Features: WhatsNewItem[] = [
  {
    title: "Settings are now easier to navigate",
    description:
      "Customization is grouped into Interface, Sidebar, Results, and Bookmarks so each option has a clearer home."
  },
  {
    title: "Bookmark Layout now has a live preview",
    description:
      "The Bookmarks settings tab shows a real-time saved-search preview using the same action menu as the actual bookmark list."
  },
  {
    title: "What's New is now built into the sidebar",
    description:
      "New releases can show a compact update prompt, plus a full release notes modal from About."
  },
  {
    title: "Quick Filter Presets can live where you work",
    description:
      "Enable them from Results settings, then choose whether they appear in the sidebar or directly above the trade site's Stat Filters."
  },
  {
    title: "Craft of Exile export is easier to reach",
    description:
      "PoE1 and PoE2 result rows can now expose a CoE action that copies items in Craft of Exile's advanced import format."
  },
  {
    title: "PoE2 copy support for Path of Building",
    description:
      "A dedicated PoE2 copy option can surface beside other result actions and copy item text ready for PoB."
  },
  {
    title: "Equivalent pricing works across both games",
    description:
      "poe.ninja ratios now support PoE1 and PoE2 so chaos/divine conversion stays useful on either trade site."
  }
];

const version110Fixes: WhatsNewItem[] = [
  {
    title: "More reliable background messaging",
    description:
      "Background requests and bulk seller caching now handle failure cases more defensively."
  },
  {
    title: "Finer Filters hover behavior is smoother",
    description:
      "Compact result layouts and item filter buttons now behave more consistently."
  },
  {
    title: "Bookmark text opens saved searches again",
    description:
      "Clicking the saved-search title now opens the bookmark instead of being ignored."
  },
  {
    title: "Extension dependencies were hardened",
    description:
      "Dependency overrides and validation changes reduce known package and request risks."
  }
];

const version110Changes: WhatsNewItem[] = [
  {
    title: "Sidebar and result options were separated",
    description:
      "Visible sidebar modules now live under Sidebar, while injected trade-result tools stay under Results."
  },
  {
    title: "Add To Filters moved out of the sidebar by default",
    description:
      "Quick filter presets can now be injected into the trade page, keeping the sidebar focused on navigation and saved searches."
  },
  {
    title: "Bookmark folders remember their open state",
    description:
      "Expanded and collapsed folders persist more predictably across sessions."
  },
  {
    title: "History labels and trade URLs are cleaner",
    description:
      "League names, fallbacks, and trade-link handling received small consistency improvements."
  },
  {
    title: "Result cards are easier to use",
    description:
      "Card click handling and seller panel accessibility were tightened for repeated trade workflows."
  }
];

const version1110Features: WhatsNewItem[] = [
  {
    title: "Open saved searches in new tabs",
    description:
      "Middle-click a saved search to open it in a background tab, so you can queue several searches without leaving the current one."
  },
  {
    title: "Bookmark icons are easier to browse",
    description:
      "The folder icon picker now groups currency and ascendancy icons, making the right icon faster to find."
  },
  {
    title: "Sidebar preferences are more reliable",
    description:
      "Sidebar defaults are shared consistently, and the Path of Building copy action remains visible where it is available on PoE2."
  }
];

export const latestWhatsNew: WhatsNewEntry = {
  version: "1.1.24",
  date: "2026-08-10",
  sections: [
    {
      title: "1.1.24",
      groups: [
        {
          titleKey: "whatsNew.section.fixes",
          items: version1124Fixes
        }
      ]
    },
    {
      title: "1.1.23",
      groups: [
        {
          titleKey: "whatsNew.section.fixes",
          items: version1123Fixes
        }
      ]
    },
    {
      title: "1.1.22",
      groups: [
        {
          titleKey: "whatsNew.section.features",
          items: version1122Features
        },
        {
          titleKey: "whatsNew.section.fixes",
          items: version1122Fixes
        }
      ]
    },
    {
      title: "1.1.21",
      groups: [
        {
          titleKey: "whatsNew.section.fixes",
          items: version1121Fixes
        }
      ]
    },
    {
      title: "1.1.20",
      groups: [
        {
          titleKey: "whatsNew.section.features",
          items: version1120Features
        },
        {
          titleKey: "whatsNew.section.fixes",
          items: version1120Fixes
        }
      ]
    },
    {
      title: "1.1.19",
      groups: [
        {
          titleKey: "whatsNew.section.features",
          items: version1119Features
        }
      ]
    },
    {
      title: "1.1.18",
      groups: [
        {
          titleKey: "whatsNew.section.features",
          items: version1118Features
        }
      ]
    },
    {
      title: "1.1.17",
      groups: [
        {
          titleKey: "whatsNew.section.features",
          items: version1117Features
        }
      ]
    },
    {
      title: "1.1.16",
      groups: [
        {
          titleKey: "whatsNew.section.fixes",
          items: version1116Fixes
        }
      ]
    },
    {
      title: "1.1.14",
      groups: [
        {
          titleKey: "whatsNew.section.features",
          items: version1114Features
        }
      ]
    },
    {
      title: "1.1.13",
      groups: [
        {
          titleKey: "whatsNew.section.features",
          items: version1113Features
        }
      ]
    },
    {
      title: "1.1.12",
      groups: [
        {
          titleKey: "whatsNew.section.fixes",
          items: version1112Fixes
        }
      ]
    },
    {
      title: "1.1.11",
      groups: [
        {
          titleKey: "whatsNew.section.features",
          items: version1111Features
        }
      ]
    },
    {
      title: "1.1.10",
      groups: [
        {
          titleKey: "whatsNew.section.features",
          items: version1110Features
        }
      ]
    },
    {
      title: "1.1.9",
      groups: [
        {
          titleKey: "whatsNew.section.fixes",
          items: version118Fixes
        }
      ]
    },
    {
      title: "1.1.8",
      groups: [
        {
          titleKey: "whatsNew.section.features",
          items: version118Features
        }
      ]
    },
    {
      title: "1.1.7",
      groups: [
        {
          titleKey: "whatsNew.section.features",
          items: version117Features
        }
      ]
    },
    {
      title: "1.1.6",
      groups: [
        {
          titleKey: "whatsNew.section.features",
          items: version116Features
        }
      ]
    },
    {
      title: "1.1.5",
      groups: [
        {
          titleKey: "whatsNew.section.features",
          items: version115Features
        },
        {
          titleKey: "whatsNew.section.polish",
          items: version115Polish
        }
      ]
    },
    {
      title: "1.1.4",
      groups: [
        {
          titleKey: "whatsNew.section.features",
          items: version114Items
        }
      ]
    },
    {
      title: "1.1.3",
      groups: [
        {
          titleKey: "whatsNew.section.features",
          items: version113Items
        }
      ]
    },
    {
      title: "1.1.2",
      groups: [
        {
          titleKey: "whatsNew.section.features",
          items: version112Features
        },
        {
          titleKey: "whatsNew.section.fixes",
          items: version112Fixes
        },
        {
          titleKey: "whatsNew.section.polish",
          items: version112Polish
        }
      ]
    },
    {
      title: "1.1.1",
      groups: [
        {
          titleKey: "whatsNew.section.fixes",
          items: version111Items.slice(0, 4)
        },
        {
          titleKey: "whatsNew.section.polish",
          items: version111Items.slice(4)
        }
      ]
    },
    {
      title: "1.1.0",
      groups: [
        {
          titleKey: "whatsNew.section.features",
          items: version110Features
        },
        {
          titleKey: "whatsNew.section.polish",
          items: version110Changes
        },
        {
          titleKey: "whatsNew.section.fixes",
          items: version110Fixes
        }
      ]
    }
  ]
};

export const whatsNewEntries: WhatsNewEntry[] = [
  latestWhatsNew,
  {
    version: "1.1.6",
    date: "2026-07-07",
    sections: [
      {
        title: "1.1.6",
        groups: [
          {
            titleKey: "whatsNew.section.features",
            items: version116Features
          }
        ]
      },
      {
        title: "1.1.5",
        groups: [
          {
            titleKey: "whatsNew.section.features",
            items: version115Features
          },
          {
            titleKey: "whatsNew.section.polish",
            items: version115Polish
          }
        ]
      },
      {
        title: "1.1.4",
        groups: [
          {
            titleKey: "whatsNew.section.features",
            items: version114Items
          }
        ]
      },
      {
        title: "1.1.3",
        groups: [
          {
            titleKey: "whatsNew.section.features",
            items: version113Items
          }
        ]
      },
      {
        title: "1.1.2",
        groups: [
          {
            titleKey: "whatsNew.section.features",
            items: version112Features
          },
          {
            titleKey: "whatsNew.section.fixes",
            items: version112Fixes
          },
          {
            titleKey: "whatsNew.section.polish",
            items: version112Polish
          }
        ]
      },
      {
        title: "1.1.1",
        groups: [
          {
            titleKey: "whatsNew.section.fixes",
            items: version111Items.slice(0, 4)
          },
          {
            titleKey: "whatsNew.section.polish",
            items: version111Items.slice(4)
          }
        ]
      },
      {
        title: "1.1.0",
        groups: [
          {
            titleKey: "whatsNew.section.features",
            items: version110Features
          },
          {
            titleKey: "whatsNew.section.polish",
            items: version110Changes
          },
          {
            titleKey: "whatsNew.section.fixes",
            items: version110Fixes
          }
        ]
      }
    ]
  },
  {
    version: "1.1.5",
    date: "2026-07-07",
    sections: [
      {
        title: "1.1.5",
        groups: [
          {
            titleKey: "whatsNew.section.features",
            items: version115Features
          },
          {
            titleKey: "whatsNew.section.polish",
            items: version115Polish
          }
        ]
      },
      {
        title: "1.1.4",
        groups: [
          {
            titleKey: "whatsNew.section.features",
            items: version114Items
          }
        ]
      },
      {
        title: "1.1.3",
        groups: [
          {
            titleKey: "whatsNew.section.features",
            items: version113Items
          }
        ]
      },
      {
        title: "1.1.2",
        groups: [
          {
            titleKey: "whatsNew.section.features",
            items: version112Features
          },
          {
            titleKey: "whatsNew.section.fixes",
            items: version112Fixes
          },
          {
            titleKey: "whatsNew.section.polish",
            items: version112Polish
          }
        ]
      },
      {
        title: "1.1.1",
        groups: [
          {
            titleKey: "whatsNew.section.fixes",
            items: version111Items.slice(0, 4)
          },
          {
            titleKey: "whatsNew.section.polish",
            items: version111Items.slice(4)
          }
        ]
      },
      {
        title: "1.1.0",
        groups: [
          {
            titleKey: "whatsNew.section.features",
            items: version110Features
          },
          {
            titleKey: "whatsNew.section.polish",
            items: version110Changes
          },
          {
            titleKey: "whatsNew.section.fixes",
            items: version110Fixes
          }
        ]
      }
    ]
  },
  {
    version: "1.1.4",
    date: "2026-07-05",
    sections: [
      {
        titleKey: "whatsNew.section.features",
        items: version114Items
      }
    ]
  },
  {
    version: "1.1.3",
    date: "2026-06-30",
    sections: [
      {
        titleKey: "whatsNew.section.features",
        items: version113Items
      }
    ]
  },
  {
    version: "1.1.2",
    date: "2026-06-30",
    sections: [
      {
        title: "1.1.2",
        groups: [
          {
            titleKey: "whatsNew.section.features",
            items: version112Features
          },
          {
            titleKey: "whatsNew.section.fixes",
            items: version112Fixes
          },
          {
            titleKey: "whatsNew.section.polish",
            items: version112Polish
          }
        ]
      },
      {
        title: "1.1.1",
        groups: [
          {
            titleKey: "whatsNew.section.fixes",
            items: version111Items.slice(0, 4)
          },
          {
            titleKey: "whatsNew.section.polish",
            items: version111Items.slice(4)
          }
        ]
      },
      {
        title: "1.1.0",
        groups: [
          {
            titleKey: "whatsNew.section.features",
            items: version110Features
          },
          {
            titleKey: "whatsNew.section.polish",
            items: version110Changes
          },
          {
            titleKey: "whatsNew.section.fixes",
            items: version110Fixes
          }
        ]
      }
    ]
  },
  {
    version: "1.1.1",
    date: "2026-06-27",
    sections: [
      {
        title: "1.1.1",
        groups: [
          {
            titleKey: "whatsNew.section.fixes",
            items: version111Items.slice(0, 4)
          },
          {
            titleKey: "whatsNew.section.polish",
            items: version111Items.slice(4)
          }
        ]
      },
      {
        title: "1.1.0",
        groups: [
          {
            titleKey: "whatsNew.section.features",
            items: version110Features
          },
          {
            titleKey: "whatsNew.section.polish",
            items: version110Changes
          },
          {
            titleKey: "whatsNew.section.fixes",
            items: version110Fixes
          }
        ]
      }
    ]
  },
  {
    version: "1.1.0",
    date: "2026-06-27",
    sections: [
      {
        titleKey: "whatsNew.section.features",
        items: version110Features
      },
      {
        titleKey: "whatsNew.section.fixes",
        items: version110Fixes
      },
      {
        titleKey: "whatsNew.section.polish",
        items: version110Changes
      }
    ]
  }
];

export const getWhatsNewEntry = (version: string) =>
  whatsNewEntries.find((entry) => entry.version === version) || whatsNewEntries[0];
