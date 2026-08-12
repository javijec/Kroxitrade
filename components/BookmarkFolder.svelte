<script lang="ts">
  import gripVerticalIcon from "lucide-static/icons/grip-vertical.svg?raw";
  import arrowDownIcon from "lucide-static/icons/arrow-down.svg?raw";
  import arrowUpIcon from "lucide-static/icons/arrow-up.svg?raw";
  import moreIcon from "lucide-static/icons/more-horizontal.svg?raw";
  import pencilIcon from "lucide-static/icons/pencil.svg?raw";
  import trashIcon from "lucide-static/icons/trash-2.svg?raw";
  import xIcon from "lucide-static/icons/x.svg?raw";
  import imageIcon from "lucide-static/icons/image.svg?raw";
  import { onDestroy, tick } from "svelte"
  import { slide } from "svelte/transition"


  import {
    activeBookmarkId,
    clearActiveBookmarkId,
    setActiveBookmarkId
  } from "../lib/services/active-bookmark"
  import {
    getActiveTradeTabTitle,
    openUrlInActiveTab,
    openUrlInNewTab,
    openUrlInNewWindow
  } from "../lib/services/active-trade-tab"
  import { saveBookmarkScroll } from "../lib/services/bookmark-scroll"
  import { bookmarksService } from "../lib/services/bookmarks"
  import {
    bookmarkFolderIconOptions,
    getBookmarkFolderIconUrl,
    type BookmarkFolderIconOption
  } from "../lib/data/bookmark-folder-icons"
  import { flashMessages } from "../lib/services/flash"
  import { languageStore, translate } from "../lib/services/i18n"
  import { searchPanelService } from "../lib/services/search-panel"
  import { settings } from "../lib/services/settings"
  import { tradeLocationService } from "../lib/services/trade-location"
  import type {
    BookmarksCategoryStruct,
    BookmarksFolderStruct,
    BookmarksTradeStruct
  } from "../lib/types/bookmarks"
  import {
    setBookmarkDragPayload
  } from "../lib/types/bookmark-drag"
  import { copyToClipboard } from "../lib/utilities/copy-to-clipboard"
  import { resolveTradeUrl } from "../lib/utilities/trade-url"
  import Button from "./Button.svelte"
  import ActionsMenu from "./ActionsMenu.svelte"
  import ConfirmDialog from "./ConfirmDialog.svelte"
  import FolderActionsMenu from "./FolderActionsMenu.svelte"
  import LoadingContainer from "./LoadingContainer.svelte"
  import SvgIcon from "./SvgIcon.svelte"
  import TradeActionsMenu from "./TradeActionsMenu.svelte"

  const COLLAPSED_CATEGORIES_STORAGE_KEY = "bookmark-folder-collapsed-categories"
  const UNCATEGORIZED_CATEGORY_ID = "__uncategorized__"

  interface Props {
    folder: BookmarksFolderStruct;
    previewTrades?: BookmarksTradeStruct[];
    isExpanded?: boolean;
    onToggleExpansion: (id: string) => void;
    onArchiveEvent: () => void;
    onDeleteEvent: () => void;
    onFolderDragStart?: (event: DragEvent, id: string) => void;
    onFolderDragEnter?: (event: DragEvent, id: string) => void;
    onFolderDrop?: (event: DragEvent, id: string) => void;
    onFolderDragEnd?: () => void;
    isFolderDragging?: boolean;
    isFolderDragOver?: boolean;
    scrollContainer?: HTMLElement | null;
    isTutorialSaveTarget?: boolean;
    startInEditMode?: boolean;
    onStartInEditModeHandled?: () => void;
    isNewFolderEdit?: boolean;
    onNewFolderEditSaved?: () => void;
    onNewFolderEditCancelled?: () => void | Promise<void>;
  }

  let {
    folder = $bindable(),
    previewTrades,
    isExpanded = false,
    onToggleExpansion,
    onArchiveEvent,
    onDeleteEvent,
    onFolderDragStart = () => {},
    onFolderDragEnter = () => {},
    onFolderDrop = () => {},
    onFolderDragEnd = () => {},
    isFolderDragging = false,
    isFolderDragOver = false,
    scrollContainer = null,
    isTutorialSaveTarget = false,
    startInEditMode = false,
    onStartInEditModeHandled = () => {},
    isNewFolderEdit = false,
    onNewFolderEditSaved = () => {},
    onNewFolderEditCancelled = () => {}
  }: Props = $props();

  let trades: BookmarksTradeStruct[] = $state([])
  let isLoading = $state(false)
  let hasLoadedTrades = $state(false)
  let isDuplicating = false
  let tradePendingDelete: BookmarksTradeStruct | null = $state(null)
  let archiveCompletedPending = $state(false)
  let showArchivedTrades = $state(false)
  let categoryPendingDelete: BookmarksCategoryStruct | null = $state(null)
  let categoryDeletingId: string | null = $state(null)
  let pendingDeletedCategoryIds: string[] = $state([])
  let currentFolderId: string | null = $state(null)
  let collapsedCategoryIds: string[] = $state([])
  let loadRequestId = 0
  type TradeListEntry =
    | {
        type: "category"
        id: string
        title: string
        category: BookmarksCategoryStruct | null
        categoryId: string
        tradeCount: number
      }
    | {
        type: "trade"
        id: string
        trade: BookmarksTradeStruct
        displayIndex: number
      }

  const loadTrades = async (force = false) => {
    if (previewTrades) {
      trades = previewTrades
      hasLoadedTrades = true
      return
    }
    if (!folder.id) return
    if (!force && (isLoading || hasLoadedTrades)) return

    if (!force) {
      const cachedTrades = bookmarksService.getCachedTradesByFolderId(folder.id)
      if (cachedTrades) {
        trades = cachedTrades
        hasLoadedTrades = true
        return
      }
    }

    const requestId = ++loadRequestId
    isLoading = true
    try {
      const nextTrades = await bookmarksService.fetchTradesByFolderId(folder.id, { force })
      if (requestId !== loadRequestId) return
      trades = nextTrades
    } catch {
      flashMessages.alert(translate($languageStore, "folder.loadTradesError"))
    } finally {
      if (requestId === loadRequestId) {
        hasLoadedTrades = true
        isLoading = false
      }
    }
  }

  const refreshTrades = async () => {
    hasLoadedTrades = false
    await loadTrades(true)
  }

  const syncTradesFromCache = () => {
    if (previewTrades) {
      trades = previewTrades
      hasLoadedTrades = true
      return
    }
    if (!folder.id) return

    const cachedTrades = bookmarksService.getCachedTradesByFolderId(folder.id)
    if (cachedTrades) {
      trades = cachedTrades
      hasLoadedTrades = true
      return
    }

    hasLoadedTrades = false
    trades = []
  }

  const unsubscribeBookmarksChange = bookmarksService.onChange((event) => {
    if (!folder.id || !event?.tradesChanged || event.folderId !== folder.id) {
      return
    }

    if (isExpanded) {
      syncTradesFromCache()
    } else {
      hasLoadedTrades = false
    }
  })

  onDestroy(() => {
    unsubscribeBookmarksChange()
  })

  const normalizeCategoryTitle = (title: string) => title.trim()

  const readCollapsedCategoryIds = (folderId: string | null) => {
    if (!folderId) return []
    try {
      const stored = window.localStorage.getItem(COLLAPSED_CATEGORIES_STORAGE_KEY)
      const allFolders = stored ? JSON.parse(stored) as Record<string, unknown> : {}
      const collapsed = allFolders[folderId]
      return Array.isArray(collapsed)
        ? collapsed.filter((categoryId): categoryId is string => typeof categoryId === "string")
        : []
    } catch {
      return []
    }
  }

  const persistCollapsedCategoryIds = () => {
    if (!folder.id) return
    try {
      const stored = window.localStorage.getItem(COLLAPSED_CATEGORIES_STORAGE_KEY)
      const allFolders = stored ? JSON.parse(stored) as Record<string, string[]> : {}
      if (collapsedCategoryIds.length > 0) {
        allFolders[folder.id] = collapsedCategoryIds
      } else {
        delete allFolders[folder.id]
      }
      window.localStorage.setItem(
        COLLAPSED_CATEGORIES_STORAGE_KEY,
        JSON.stringify(allFolders)
      )
    } catch {
      // Collapsing categories remains available for this visit if storage fails.
    }
  }

  const isCategoryCollapsed = (categoryId: string) =>
    collapsedCategoryIds.includes(categoryId)

  const toggleCategoryCollapse = (categoryId: string) => {
    collapsedCategoryIds = isCategoryCollapsed(categoryId)
      ? collapsedCategoryIds.filter((id) => id !== categoryId)
      : [...collapsedCategoryIds, categoryId]
    persistCollapsedCategoryIds()
  }

  const categoryIdForTrade = (trade: BookmarksTradeStruct) => {
    if (!trade.categoryId) return null
    return categoryById.has(trade.categoryId) ? trade.categoryId : null
  }

  const hasAssignedCategories = () =>
    trades.some((trade) => categoryIdForTrade(trade) !== null)

  const uniqueTrades = () => {
    const ids = new Set<string>()
    return trades.filter((trade) => {
      if (!trade.id || !ids.has(trade.id)) {
        if (trade.id) ids.add(trade.id)
        return true
      }
      return false
    })
  }

  const getDisplayedTrades = () => {
    const visibleTrades = uniqueTrades().filter((trade) =>
      showArchivedTrades ? !!trade.archivedAt : !trade.archivedAt
    )
    if (
      !$settings.bookmarkCategoriesEnabled ||
      categoryOptions.length === 0 ||
      !hasAssignedCategories()
    ) {
      return visibleTrades
    }

    const grouped = new Map<string, BookmarksTradeStruct[]>()
    for (const category of categoryOptions) {
      grouped.set(category.id, [])
    }

    const uncategorized: BookmarksTradeStruct[] = []
    for (const trade of visibleTrades) {
      const categoryId = categoryIdForTrade(trade)
      if (categoryId) {
        grouped.get(categoryId)?.push(trade)
      } else {
        uncategorized.push(trade)
      }
    }

    return [
      ...categoryOptions.flatMap((category) => grouped.get(category.id) || []),
      ...uncategorized
    ]
  }

  const getTradeListEntries = (): TradeListEntry[] => {
    if (
      !$settings.bookmarkCategoriesEnabled ||
      categoryOptions.length === 0 ||
      !hasAssignedCategories()
    ) {
      return displayedTrades.map((trade, displayIndex) => ({
        type: "trade",
        id: trade.id || `trade-${displayIndex}`,
        trade,
        displayIndex
      }))
    }

    const entries: TradeListEntry[] = []
    const tradesByCategory = new Map<string, BookmarksTradeStruct[]>()
    const uncategorized: BookmarksTradeStruct[] = []

    for (const category of categoryOptions) {
      tradesByCategory.set(category.id, [])
    }

    for (const trade of displayedTrades) {
      const categoryId = categoryIdForTrade(trade)
      if (categoryId) {
        tradesByCategory.get(categoryId)?.push(trade)
      } else {
        uncategorized.push(trade)
      }
    }

    for (const category of categoryOptions) {
      const categoryTrades = tradesByCategory.get(category.id) || []
      entries.push({
        type: "category",
        id: `category-${category.id}`,
        title: category.title,
        category,
        categoryId: category.id,
        tradeCount: categoryTrades.length
      })
      if (!isCategoryCollapsed(category.id)) {
        entries.push(...categoryTrades.map((trade) => ({
          type: "trade" as const,
          id: trade.id || `trade-${displayedTrades.indexOf(trade)}`,
          trade,
          displayIndex: displayedTrades.indexOf(trade)
        })))
      }
    }

    if (uncategorized.length > 0) {
      entries.push({
        type: "category",
        id: "category-none",
        title: translate($languageStore, "folder.uncategorized"),
        category: null,
        categoryId: UNCATEGORIZED_CATEGORY_ID,
        tradeCount: uncategorized.length
      })
      if (!isCategoryCollapsed(UNCATEGORIZED_CATEGORY_ID)) {
        entries.push(...uncategorized.map((trade) => ({
          type: "trade" as const,
          id: trade.id || `trade-${displayedTrades.indexOf(trade)}`,
          trade,
          displayIndex: displayedTrades.indexOf(trade)
        })))
      }
    }

    return entries
  }

  const promptForCategoryTitle = (initialTitle = "") => {
    if (typeof window === "undefined") return null
    const title = window.prompt(
      translate($languageStore, "folder.categoryPrompt"),
      initialTitle
    )
    if (title === null) return null
    return normalizeCategoryTitle(title)
  }

  const createCategoryFromTitle = async (title: string) => {
    if (!folder.id) return null
    const safeTitle = normalizeCategoryTitle(title)
    if (!safeTitle) {
      flashMessages.alert(translate($languageStore, "folder.categoryNameRequired"))
      return null
    }

    const category = await bookmarksService.createCategory(folder, safeTitle)
    if (!category) return null
    await bookmarksService.refresh()
    flashMessages.success(
      translate($languageStore, "folder.categoryCreated", { title: safeTitle })
    )
    return category
  }

  const renameCategory = async (category: BookmarksCategoryStruct) => {
    const title = promptForCategoryTitle(category.title)
    if (!title || title === category.title) return
    await bookmarksService.renameCategory(folder, category.id, title)
    await bookmarksService.refresh()
    flashMessages.success(
      translate($languageStore, "folder.categoryRenamed", { title })
    )
  }

  const deleteCategory = async (category: BookmarksCategoryStruct) => {
    if (!folder.id || categoryDeletingId) return
    const previousTrades = [...trades]
    categoryDeletingId = category.id
    categoryPendingDelete = null
    pendingDeletedCategoryIds = [...pendingDeletedCategoryIds, category.id]
    trades = trades.map((trade) =>
      trade.categoryId === category.id ? { ...trade, categoryId: null } : trade
    )
    hasLoadedTrades = true
    collapsedCategoryIds = collapsedCategoryIds.filter((id) => id !== category.id)
    persistCollapsedCategoryIds()
    try {
      trades = await bookmarksService.deleteCategory(folder, category.id)
      pendingDeletedCategoryIds = pendingDeletedCategoryIds.filter(
        (id) => id !== category.id
      )
      flashMessages.success(
        translate($languageStore, "folder.categoryDeleted", { title: category.title })
      )
    } catch {
      pendingDeletedCategoryIds = pendingDeletedCategoryIds.filter(
        (id) => id !== category.id
      )
      trades = previousTrades
      await bookmarksService.refresh()
      flashMessages.alert(translate($languageStore, "folder.dragSaveError"))
    } finally {
      categoryDeletingId = null
    }
  }

  const requestCategoryDelete = (category: BookmarksCategoryStruct) => {
    categoryPendingDelete = category
  }

  const cancelCategoryDelete = () => {
    categoryPendingDelete = null
  }

  const assignTradeCategory = async (
    trade: BookmarksTradeStruct,
    categoryId: string | null
  ) => {
    if (!folder.id || !trade.id) return
    trades = await bookmarksService.assignTradeCategory(trade, folder.id, categoryId)
    hasLoadedTrades = true
  }

  const selectTradeCategory = async (
    trade: BookmarksTradeStruct,
    categoryId: string | null
  ) => {
    await assignTradeCategory(trade, categoryId)
  }

  const createCategoryForTrade = async (trade: BookmarksTradeStruct, title: string) => {
    const category = await createCategoryFromTitle(title)
    if (category) {
      await assignTradeCategory(trade, category.id)
    }
  }

  const toggleTrade = async (trade: BookmarksTradeStruct) => {
    if (!folder.id) return
    trades = await bookmarksService.toggleTradeCompletion(trade, folder.id)
    hasLoadedTrades = true
  }

  const copyTrade = (trade: BookmarksTradeStruct) => {
    const url = resolveTradeUrl(trade.location, "", true)
    void copyToClipboard(url)
      .then(() => {
        flashMessages.success(
          translate($languageStore, "folder.copiedTrade", {
            title: trade.title
          })
        )
      })
      .catch(() => {
        flashMessages.alert(translate($languageStore, "folder.copyTradeError"))
      })
  }

  const openTradeLive = async (trade: BookmarksTradeStruct) => {
    if (trade.id) {
      setActiveBookmarkId(trade.id)
    }
    await openUrlInActiveTab(
      resolveTradeUrl(trade.location, "/live", true)
    )
  }

  const deleteTrade = (trade: BookmarksTradeStruct) => {
    if (!folder.id || !trade.id) return
    const previousTrades = trades
    trades = trades.filter((entry) => entry.id !== trade.id)
    hasLoadedTrades = true
    tradePendingDelete = null

    if (trade.id === $activeBookmarkId) {
      clearActiveBookmarkId()
    }

    void bookmarksService.deleteTrade(trade.id, folder.id)
      .then((persisted) => {
        trades = persisted
        hasLoadedTrades = true
      })
      .catch(() => {
        trades = previousTrades
        hasLoadedTrades = true
        flashMessages.alert(translate($languageStore, "folder.deleteTradeError"))
      })
  }

  const requestTradeDelete = (trade: BookmarksTradeStruct) => {
    tradePendingDelete = trade
  }

  const cancelTradeDelete = () => {
    tradePendingDelete = null
  }

  const duplicateTrade = async (trade: BookmarksTradeStruct) => {
    if (!folder.id || isDuplicating) return
    isDuplicating = true
    try {
      trades = await bookmarksService.duplicateTrade(trade, folder.id)
      hasLoadedTrades = true
      flashMessages.success(
        translate($languageStore, "folder.duplicatedTrade", {
          title: trade.title
        })
      )
    } catch {
      flashMessages.alert(translate($languageStore, "folder.duplicateTradeError"))
    } finally {
      isDuplicating = false
    }
  }

  let draggedIndex: number | null = $state(null)
  let dragOverIndex: number | null = $state(null)
  let draggedCategoryId: string | null = $state(null)
  let dragOverCategoryId: string | null = $state(null)
  let optimisticCategoryOptions: BookmarksCategoryStruct[] | null = $state(null)
  let pendingCategoryMoves = 0
  let suppressNextTradeOpen = false

  const handleDragStart = (e: DragEvent, index: number) => {
    e.stopPropagation()
    draggedIndex = index
    suppressNextTradeOpen = true
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move"
      const trade = displayedTrades[index]
      if (trade?.id && folder.id) {
        setBookmarkDragPayload(e.dataTransfer, {
          type: "trade",
          tradeId: trade.id,
          sourceFolderId: folder.id
        })
      }
    }
  }

  const handleCategoryDragStart = (
    event: DragEvent,
    category: BookmarksCategoryStruct
  ) => {
    event.stopPropagation()
    if (!folder.id || !event.dataTransfer) return
    const index = categoryOptions.findIndex((entry) => entry.id === category.id)
    if (index < 0) return
    draggedCategoryId = category.id
    event.dataTransfer.effectAllowed = "move"
    setBookmarkDragPayload(event.dataTransfer, {
      type: "category",
      folderId: folder.id,
      categoryId: category.id,
      categoryIndex: index
    })
  }

  const handleDragEnter = (e: DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      dragOverIndex = index
    }
  }

  const handleCategoryDragOver = (event: DragEvent, categoryId: string) => {
    if (!draggedCategoryId && draggedIndex === null) return
    event.preventDefault()
    if (dragOverCategoryId !== categoryId) {
      dragOverCategoryId = categoryId
    }
  }

  const clearCategoryDragState = () => {
    draggedCategoryId = null
    dragOverCategoryId = null
  }

  const handleDrop = async (e: DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index && folder.id) {
      const previousTrades = [...trades]
      const orderedTrades = [...displayedTrades]
      const trade = orderedTrades[draggedIndex]
      const targetTrade = orderedTrades[index]
      if (trade && trade.id) {
        const [moved] = orderedTrades.splice(draggedIndex, 1)
        orderedTrades.splice(index, 0, {
          ...moved,
          categoryId: $settings.bookmarkCategoriesEnabled
            ? categoryIdForTrade(targetTrade)
            : categoryIdForTrade(moved)
        })
        trades = orderedTrades
        hasLoadedTrades = true
        try {
          trades = await bookmarksService.persistTrades(orderedTrades, folder.id)
        } catch {
          trades = previousTrades
          await bookmarksService.refresh()
          flashMessages.alert(translate($languageStore, "folder.dragSaveError"))
        }
      }
    }
    draggedIndex = null
    dragOverIndex = null
  }

  const moveCategoryOptimistically = async (fromIndex: number, toIndex: number) => {
    if (!folder.id || fromIndex === toIndex) return

    const categories = [...categoryOptions]
    if (
      fromIndex < 0 ||
      fromIndex >= categories.length ||
      toIndex < 0 ||
      toIndex >= categories.length
    ) return

    const [moved] = categories.splice(fromIndex, 1)
    categories.splice(toIndex, 0, moved)
    optimisticCategoryOptions = categories
    pendingCategoryMoves += 1

    try {
      await bookmarksService.moveCategory(folder.id, fromIndex, toIndex)
    } catch {
      optimisticCategoryOptions = null
      await bookmarksService.refresh()
      flashMessages.alert(translate($languageStore, "folder.dragSaveError"))
    } finally {
      pendingCategoryMoves -= 1
      if (pendingCategoryMoves === 0) {
        optimisticCategoryOptions = null
      }
    }
  }

  const handleCategoryDrop = async (event: DragEvent, targetCategoryId: string) => {
    event.preventDefault()
    if (draggedIndex !== null) {
      const draggedTrade = displayedTrades[draggedIndex]
      draggedIndex = null
      dragOverIndex = null
      dragOverCategoryId = null
      if (!draggedTrade?.id || !folder.id) return

      const previousTrades = [...trades]
      const updatedTrades = displayedTrades.map((trade) =>
        trade.id === draggedTrade.id
          ? { ...trade, categoryId: targetCategoryId }
          : trade
      )
      trades = updatedTrades
      hasLoadedTrades = true
      try {
        trades = await bookmarksService.persistTrades(updatedTrades, folder.id)
      } catch {
        trades = previousTrades
        await bookmarksService.refresh()
        flashMessages.alert(translate($languageStore, "folder.dragSaveError"))
      }
      return
    }

    const sourceIndex = categoryOptions.findIndex((category) => category.id === draggedCategoryId)
    const targetIndex = categoryOptions.findIndex((category) => category.id === targetCategoryId)
    clearCategoryDragState()
    if (sourceIndex >= 0 && targetIndex >= 0 && sourceIndex !== targetIndex) {
      await moveCategoryOptimistically(sourceIndex, targetIndex)
    }
  }

  const moveCategoryWithKeyboard = async (fromIndex: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1
    await moveCategoryOptimistically(fromIndex, toIndex)
  }

  const handleDragEnd = () => {
    draggedIndex = null
    dragOverIndex = null
    dragOverCategoryId = null
    window.setTimeout(() => {
      suppressNextTradeOpen = false
    }, 0)
  }

  const handleCategoryDragEnd = () => {
    clearCategoryDragState()
  }

  const createTradeFromCurrent = async () => {
    if (!folder.id) return
    const current = tradeLocationService.current
    if (!current.slug) {
      flashMessages.alert(translate($languageStore, "folder.invalidTradePage"))
      return
    }
    if (!current.type) {
      flashMessages.alert(translate($languageStore, "folder.missingTradeType"))
      return
    }
    const trade = bookmarksService.initializeTradeStructFrom({
      version: current.version,
      type: current.type,
      slug: current.slug,
      league: current.league
    })
    const activeTabTitle = await getActiveTradeTabTitle()
    trade.title =
      searchPanelService.recommendTitle() ||
      (activeTabTitle || document.title)
        .replace(" - Path of Exile", "")
        .replace(/⚡ /g, "") ||
      translate($languageStore, "folder.tradeFallback")
    await bookmarksService.persistTrade(trade, folder.id)
    await refreshTrades()
    flashMessages.success(
      translate($languageStore, "folder.addedToFolder", { title: trade.title })
    )
  }

  type TradeOpenTarget = "active" | "tab" | "window"

  const openTrade = async (
    trade: BookmarksTradeStruct,
    target: TradeOpenTarget = "active"
  ) => {
    if (target === "active" && trade.id) {
      setActiveBookmarkId(trade.id)
    }
    const scrollTop = scrollContainer?.scrollTop
    if (target === "active" && scrollContainer) {
      await saveBookmarkScroll(scrollContainer.scrollTop)
    }
    await tradeLocationService.stashPendingBookmarkTitles({
      [trade.location.slug]: trade.title
    })
    const url = resolveTradeUrl(trade.location, "", true)
    await (
      target === "tab"
        ? openUrlInNewTab(url, false, trade.id, scrollTop)
        : target === "window"
          ? openUrlInNewWindow(url)
          : openUrlInActiveTab(url)
    )
  }

  const toggleTradeArchive = async (trade: BookmarksTradeStruct) => {
    if (!folder.id) return
    trades = await bookmarksService.toggleTradeArchive(trade, folder.id)
    hasLoadedTrades = true
    if (showArchivedTrades && !trades.some((entry) => entry.archivedAt)) {
      showArchivedTrades = false
    }
  }

  const requestArchiveCompleted = () => {
    archiveCompletedPending = true
  }

  const cancelArchiveCompleted = () => {
    archiveCompletedPending = false
  }

  const archiveCompleted = async () => {
    if (!folder.id) return
    const allTrades = await bookmarksService.fetchTradesByFolderId(folder.id, {
      force: true
    })
    const completedTrades = allTrades.filter(
      (trade) => trade.completedAt && !trade.archivedAt
    )
    if (completedTrades.length === 0) {
      archiveCompletedPending = false
      flashMessages.alert(translate($languageStore, "folder.noCompletedItemsToArchive"))
      return
    }

    const archivedAt = new Date().toISOString()
    trades = await bookmarksService.persistTrades(
      allTrades.map((trade) =>
        trade.completedAt && !trade.archivedAt ? { ...trade, archivedAt } : trade
      ),
      folder.id
    )
    hasLoadedTrades = true
    archiveCompletedPending = false
    flashMessages.success(
      translate($languageStore, "folder.archivedCompleted", {
        count: completedTrades.length
      })
    )
  }

  const restoreArchivedTrades = async () => {
    if (!folder.id) return
    const archivedTrades = trades.filter((trade) => trade.archivedAt)
    if (archivedTrades.length === 0) return
    trades = await bookmarksService.persistTrades(
      trades.map((trade) =>
        trade.archivedAt ? { ...trade, archivedAt: null } : trade
      ),
      folder.id
    )
    showArchivedTrades = false
    flashMessages.success(
      translate($languageStore, "folder.restoredArchivedTrades", {
        count: archivedTrades.length
      })
    )
  }

  const exportFolder = () => {
    const serialized = bookmarksService.serializeFolder(folder, trades)
    void copyToClipboard(serialized)
      .then(() => {
        flashMessages.success(translate($languageStore, "folder.copiedFolder"))
      })
      .catch(() => {
        flashMessages.alert(translate($languageStore, "folder.copyFolderError"))
      })
  }

  const duplicateFolder = async () => {
    if (isDuplicating) return
    isDuplicating = true
    try {
      await bookmarksService.duplicateFolder(folder)
      flashMessages.success(
        translate($languageStore, "folder.duplicatedFolder", {
          title: folder.title
        })
      )
    } catch {
      flashMessages.alert(translate($languageStore, "folder.duplicateFolderError"))
    } finally {
      isDuplicating = false
    }
  }

  let editingFolder = $state(false)
  let folderEditTitle = $state("")
  let folderEditIcon: string | null = $state(null)
  let folderEditInputEl: HTMLInputElement | null = $state(null)
  let isSavingFolderTitle = false

  const startEditingFolder = async () => {
    // Collapse the folder first so its expanded actions (e.g. "Save current search")
    // can't be triggered while editing, which would error.
    if (isExpanded) {
      onToggleExpansion(folder.id || "")
    }
    folderEditTitle = folder.title
    folderEditIcon = folder.icon
    editingFolder = true
    await tick()
    folderEditInputEl?.focus()
    folderEditInputEl?.select()
  }

  const saveFolderTitle = async () => {
    if (isSavingFolderTitle) return
    const newTitle = folderEditTitle.trim()
    const iconChanged = folderEditIcon !== folder.icon
    if (!newTitle) return
    if (newTitle === folder.title && !iconChanged) {
      editingFolder = false
      if (isNewFolderEdit) onNewFolderEditSaved()
      return
    }

    isSavingFolderTitle = true
    try {
      await bookmarksService.persistFolder({
        ...folder,
        title: newTitle,
        icon: folderEditIcon
      })
      folder.title = newTitle
      folder.icon = folderEditIcon
      editingFolder = false
      if (isNewFolderEdit) onNewFolderEditSaved()
      flashMessages.success(
        translate($languageStore, "folder.renamedFolder", { title: newTitle })
      )
    } finally {
      isSavingFolderTitle = false
    }
  }

  const cancelFolderEdit = () => {
    editingFolder = false
    folderEditTitle = folder.title
    folderEditIcon = folder.icon
    if (isNewFolderEdit) void onNewFolderEditCancelled()
  }

  let editingTradeId: string | null = $state(null)
  let tradeEditTitle = $state("")
  let tradeEditInputEl: HTMLInputElement | null = $state(null)
  let savingTradeId: string | null = null

  const startEditingTrade = async (trade: BookmarksTradeStruct) => {
    if (!trade.id) return
    editingTradeId = trade.id
    tradeEditTitle = trade.title
    await tick()
    tradeEditInputEl?.focus()
    tradeEditInputEl?.select()
  }

  const saveTradeTitle = async (trade: BookmarksTradeStruct) => {
    if (!trade.id || savingTradeId === trade.id) return
    editingTradeId = null
    const newTitle = tradeEditTitle.trim()
    if (!newTitle || !folder.id || newTitle === trade.title) return

    savingTradeId = trade.id
    try {
      trades = await bookmarksService.renameTrade(trade, folder.id, newTitle)
      hasLoadedTrades = true
      flashMessages.success(
        translate($languageStore, "folder.renamedSearch", { title: newTitle })
      )
    } finally {
      savingTradeId = null
    }
  }

  const cancelTradeEdit = () => {
    editingTradeId = null
  }

  const openTradeFromCard = (
    trade: BookmarksTradeStruct,
    target: TradeOpenTarget = "active"
  ) => {
    if (suppressNextTradeOpen || editingTradeId === trade.id) return
    void openTrade(trade, target)
  }

  const shouldIgnoreTradeCardClick = (target: EventTarget | null) => {
    const element = target instanceof Element ? target : null
    return !!element?.closest("button, a, input, textarea, select, [data-no-card-open]")
  }

  const handleTradeCardPointerDown = (event: PointerEvent) => {
    if (event.button === 1 && !shouldIgnoreTradeCardClick(event.target)) {
      event.preventDefault()
    }
  }

  const handleTradeCardClick = (event: MouseEvent | PointerEvent, trade: BookmarksTradeStruct) => {
    if (shouldIgnoreTradeCardClick(event.target)) return
    if (event.shiftKey) {
      event.preventDefault()
      openTradeFromCard(trade, "window")
      return
    }

    if (event.ctrlKey || event.metaKey || event.button === 1) {
      event.preventDefault()
      openTradeFromCard(trade, "tab")
      return
    }

    if (event.button === 0) {
      openTradeFromCard(trade)
    }
  }

  const replaceSearchWithCurrent = async (trade: BookmarksTradeStruct) => {
    if (!folder.id || !trade.id) return

    const current = tradeLocationService.current
    if (!current.slug) {
      flashMessages.alert(translate($languageStore, "folder.invalidTradePage"))
      return
    }
    if (!current.type) {
      flashMessages.alert(translate($languageStore, "folder.missingTradeType"))
      return
    }

    const updatedTrade: BookmarksTradeStruct = {
      ...trade,
      location: {
        version: current.version,
        type: current.type,
        slug: current.slug,
        league: current.league
      }
    }

    await bookmarksService.persistTrade(updatedTrade, folder.id)
    await refreshTrades()
    flashMessages.success(
      translate($languageStore, "folder.updatedSearchLocation", {
        title: trade.title
      })
    )
  }
  let isArchived = $derived(!!folder.archivedAt)
  $effect(() => {
    if (startInEditMode && !editingFolder) {
      startEditingFolder()
      onStartInEditModeHandled()
    }
  });
  $effect(() => {
    if ((folder.id || null) !== currentFolderId) {
      currentFolderId = folder.id || null
      collapsedCategoryIds = readCollapsedCategoryIds(currentFolderId)
      trades = []
      hasLoadedTrades = false
      isLoading = false
    }
  });
  $effect(() => {
    if (isExpanded && !hasLoadedTrades && !isLoading) {
      void loadTrades()
    }
  });
  let visibleFolderIconOptions = $derived(bookmarkFolderIconOptions.filter(
    (option) => option.version === folder.version
  ))
  let currencyIconOptions = $derived(
    visibleFolderIconOptions.filter((option) => option.category === "currency")
  )
  let ascendancyIconOptions = $derived(
    visibleFolderIconOptions.filter((option) => option.category === "ascendancy")
  )
  // Group ascendancies into one column per base class (data is contiguous per class).
  // Each column renders bottom-to-top, so the first option ends up at the bottom.
  let ascendancyClassGroups = $derived.by(() => {
    const groups: { key: string; options: BookmarkFolderIconOption[] }[] = []
    for (const option of ascendancyIconOptions) {
      const key = option.characterClass ?? option.id
      const lastGroup = groups[groups.length - 1]
      if (lastGroup && lastGroup.key === key) {
        lastGroup.options.push(option)
      } else {
        groups.push({ key, options: [option] })
      }
    }
    return groups
  })
  let categoryOptions = $derived(
    (optimisticCategoryOptions || folder.categories || []).filter(
      (category) => !pendingDeletedCategoryIds.includes(category.id)
    )
  )
  let categoryById = $derived(new Map(categoryOptions.map((category) => [category.id, category])))
  let displayedTrades = $derived(getDisplayedTrades())
  let tradeListEntries = $derived(getTradeListEntries())
  let folderIconUrl = $derived(getBookmarkFolderIconUrl(folder.icon))
  let folderEditIconUrl = $derived(getBookmarkFolderIconUrl(folderEditIcon))

  const isCurrentTrade = (trade: BookmarksTradeStruct) =>
    !!$activeBookmarkId && trade.id === $activeBookmarkId

  $effect(() => {
    if (previewTrades) {
      trades = previewTrades
      hasLoadedTrades = true
    }
  })
</script>

<div
  role="region"
  class="folder {isExpanded ? 'is-expanded' : ''} {isArchived
    ? 'is-archived'
    : ''}"
  class:is-ultra-compact={$settings.ultraCompactBookmarks}
  class:is-editing={editingFolder}
  class:is-folder-dragging={isFolderDragging}
  class:is-folder-drag-over={isFolderDragOver}
  ondragenter={(e) => onFolderDragEnter(e, folder.id || "")}
  ondragover={(event) => event.preventDefault()}
  ondrop={(event) => {
    event.preventDefault()
    onFolderDrop(event, folder.id || "")
  }}>
  <div class="folder-header">
    <div
      class="folder-drag-handle"
      draggable="true"
      ondragstart={(e) => onFolderDragStart(e, folder.id || "")}
      ondragend={onFolderDragEnd}
      title={translate($languageStore, "folder.dragReorder")}
      aria-hidden="true">
      <span class="action-icon"><SvgIcon svg={gripVerticalIcon} /></span>
    </div>
    <button
      type="button"
      class="expansion-wrapper"
      onclick={(e) => {
        e.stopPropagation()
        if (!editingFolder) onToggleExpansion(folder.id || "")
      }}
      aria-expanded={isExpanded}
      aria-label={`${isExpanded ? translate($languageStore, "folder.collapse") : translate($languageStore, "folder.expand")} ${folder.title}`}>
      {#if editingFolder}
        <input
          type="text"
          class="inline-edit-input"
          bind:this={folderEditInputEl}
          bind:value={folderEditTitle}
          onkeydown={(e) => {
            e.stopPropagation()
            if (e.key === "Enter") saveFolderTitle()
            if (e.key === "Escape") cancelFolderEdit()
          }}
          onclick={(event) => event.stopPropagation()} />
      {:else}
        <div class="header-copy">
          <div class="header-main">
            {#if folderIconUrl}
              <span class="folder-icon" aria-hidden="true">
                <img src={folderIconUrl} alt="" />
              </span>
            {/if}
            <div class="header-label">{folder.title}</div>
            {#if isArchived}
              <span class="archive-status">{translate($languageStore, "bookmarks.toolbar.archive")}</span>
            {/if}
          </div>
        </div>
      {/if}
      {#if !isArchived}
        <span class="indicator">{isExpanded ? "▼" : "▶"}</span>
      {/if}
    </button>

    <div class="header-actions">
      <FolderActionsMenu
        {folder}
        onRename={startEditingFolder}
        onArchive={onArchiveEvent}
        onExport={exportFolder}
        onDuplicate={duplicateFolder}
        onClearCompleted={requestArchiveCompleted}
        hasArchivedTrades={showArchivedTrades || trades.some((trade) => trade.archivedAt)}
        {showArchivedTrades}
        onToggleArchivedTrades={() => showArchivedTrades = !showArchivedTrades}
        onRestoreArchivedTrades={() => void restoreArchivedTrades()}
        onDelete={onDeleteEvent} />
    </div>
  </div>

  {#if editingFolder}
    <div class="folder-edit-panel">
      <div class="folder-edit-panel__title">{translate($languageStore, "folder.chooseIcon")}</div>

      <div class="folder-edit-panel__top">
        {#if currencyIconOptions.length > 0}
          <div class="folder-icon-divider" role="separator">
            <span>{translate($languageStore, "folder.currencies")}</span>
          </div>

          {#each currencyIconOptions as option (option.id)}
            <button
              type="button"
              class="folder-icon-option"
              class:is-selected={folderEditIcon === option.id}
              title={option.label}
              aria-label={option.label}
              onclick={() => (folderEditIcon = option.id)}
            >
              <img src={option.url} alt="" />
            </button>
          {/each}
        {/if}
      </div>

      {#if ascendancyClassGroups.length > 0}
        <div class="folder-icon-divider" role="separator">
          <span>{translate($languageStore, "folder.ascendancies")}</span>
        </div>

        <div class="folder-icon-classes">
          {#each ascendancyClassGroups as group (group.key)}
            <div class="folder-icon-class-column">
              {#each group.options as option (option.id)}
                <button
                  type="button"
                  class="folder-icon-option"
                  class:is-selected={folderEditIcon === option.id}
                  title={option.label}
                  aria-label={option.label}
                  onclick={() => (folderEditIcon = option.id)}
                >
                  <img src={option.url} alt="" />
                </button>
              {/each}
            </div>
          {/each}
        </div>
      {/if}

      <div class="folder-edit-panel__actions">
        <div class="folder-edit-panel__preview">
          {#if folderEditIconUrl}
            <span class="folder-icon folder-icon--preview" aria-hidden="true">
              <img src={folderEditIconUrl} alt="" />
            </span>
            <button
              type="button"
              class="category-action is-danger"
              title={translate($languageStore, "folder.noIcon")}
              aria-label={translate($languageStore, "folder.noIcon")}
              onclick={() => (folderEditIcon = null)}
            >
              <span class="action-icon"><SvgIcon svg={xIcon} /></span>
            </button>
          {:else}
            <span
              class="folder-icon folder-icon--preview folder-icon--placeholder"
              aria-hidden="true"
            >
              <SvgIcon svg={imageIcon} size={16} />
            </span>
          {/if}
        </div>

        <div class="folder-edit-panel__buttons">
          <Button
            label={translate($languageStore, "confirm.cancel")}
            theme="blue"
            onClick={cancelFolderEdit}
          />
          <Button
            label={translate($languageStore, "folder.saveFolderChanges")}
            theme="gold"
            onClick={saveFolderTitle}
          />
        </div>
      </div>
    </div>
  {/if}

  {#if isExpanded}
    <div class="trades-content" transition:slide={{ duration: 180 }}>
      <LoadingContainer {isLoading} size="small">
        <ul class="trades-list">
          {#each tradeListEntries as entry (entry.id)}
            {#if entry.type === "category"}
              {@const categoryIndex = entry.category ? categoryOptions.findIndex((category) => category.id === entry.category.id) : -1}
              <li
                class="category-row"
                class:is-drag-over={entry.category && dragOverCategoryId === entry.category.id}
                class:is-dragging={entry.category && draggedCategoryId === entry.category.id}
                ondragover={entry.category ? (event) => handleCategoryDragOver(event, entry.category!.id) : undefined}
                ondrop={entry.category ? (event) => {
                  event.preventDefault()
                  void handleCategoryDrop(event, entry.category!.id)
                } : undefined}
                ondragend={entry.category ? handleCategoryDragEnd : undefined}>
                <div
                  class="category-heading"
                  onclick={() => toggleCategoryCollapse(entry.categoryId)}>
                  {#if entry.category}
                    <button
                      type="button"
                      class="category-drag-handle"
                      draggable="true"
                      title={translate($languageStore, "folder.dragCategory")}
                      aria-label={translate($languageStore, "folder.dragCategory")}
                      ondragstart={(event) => handleCategoryDragStart(event, entry.category!)}
                      ondragend={handleCategoryDragEnd}>
                      <span class="action-icon"><SvgIcon svg={gripVerticalIcon} /></span>
                    </button>
                  {/if}
                  <button
                    type="button"
                    class="category-toggle"
                    aria-expanded={!isCategoryCollapsed(entry.categoryId)}
                    aria-label={`${isCategoryCollapsed(entry.categoryId) ? translate($languageStore, "folder.expand") : translate($languageStore, "folder.collapse")} ${entry.title}`}
                  >
                    {isCategoryCollapsed(entry.categoryId) ? "▸" : "▾"}
                  </button>
                  <span class="category-heading__rule" aria-hidden="true"></span>
                  <span
                    class="category-heading__title category-heading__drag-area"
                    role="button"
                    aria-label={`${isCategoryCollapsed(entry.categoryId) ? translate($languageStore, "folder.expand") : translate($languageStore, "folder.collapse")} ${entry.title}`}
                    tabindex={entry.category ? 0 : -1}
                    draggable={!!entry.category}
                    ondragstart={entry.category
                      ? (event) => handleCategoryDragStart(event, entry.category!)
                      : undefined}
                    ondragend={entry.category ? handleCategoryDragEnd : undefined}>{entry.title}</span>
                  <span class="category-heading__count">{entry.tradeCount}</span>
                  <span class="category-heading__rule" aria-hidden="true"></span>
                  {#if entry.category}
                    <div
                      class="category-heading__actions"
                      onclick={(event) => event.stopPropagation()}>
                      <ActionsMenu
                        actions={[
                          ...(categoryIndex > 0 ? [{
                            id: "move-up",
                            icon: arrowUpIcon,
                            labelKey: "folder.moveCategoryUp",
                            handler: () => void moveCategoryWithKeyboard(categoryIndex, "up")
                          }] : []),
                          ...(categoryIndex < categoryOptions.length - 1 ? [{
                            id: "move-down",
                            icon: arrowDownIcon,
                            labelKey: "folder.moveCategoryDown",
                            handler: () => void moveCategoryWithKeyboard(categoryIndex, "down")
                          }] : []),
                          {
                            id: "rename",
                            icon: pencilIcon,
                            labelKey: "folder.renameCategory",
                            handler: () => void renameCategory(entry.category!)
                          },
                          {
                            id: "delete",
                            icon: trashIcon,
                            labelKey: "folder.deleteCategory",
                            handler: () => requestCategoryDelete(entry.category!),
                            danger: true
                          }
                        ]}
                        primaryActionIds={[]}
                        compactVisibleActionIds={[]}
                        dropdownLabel="folder.actionsMenu"
                        dropdownIcon={moreIcon}
                        translate={(key) => translate($languageStore, key)} />
                    </div>
                  {/if}
                </div>
              </li>
            {:else}
              {@const trade = entry.trade}
              {@const i = entry.displayIndex}
              {@const tradeCategoryId = categoryIdForTrade(trade)}
              {@const isActiveTrade = isCurrentTrade(trade)}
              <li
                draggable="true"
                ondragstart={(e) => handleDragStart(e, i)}
                ondragenter={(event) => {
                  if (draggedCategoryId !== null) {
                    if (tradeCategoryId) {
                      handleCategoryDragOver(event, tradeCategoryId)
                    }
                    return
                  }
                  handleDragEnter(event, i)
                }}
                ondragover={(event) => {
                  if (draggedCategoryId !== null) {
                    if (tradeCategoryId) {
                      handleCategoryDragOver(event, tradeCategoryId)
                    }
                    return
                  }
                  event.preventDefault()
                }}
                ondrop={(event) => {
                  event.preventDefault()
                  if (draggedCategoryId !== null) {
                    if (tradeCategoryId) {
                      void handleCategoryDrop(event, tradeCategoryId)
                    }
                    return
                  }
                  void handleDrop(event, i)
                }}
                ondragend={handleDragEnd}>
                <div
                  class="trade-item"
                  class:is-completed={!!trade.completedAt}
                  class:is-archived={!!trade.archivedAt}
                  class:is-current={isActiveTrade}
                  class:is-dragging={draggedIndex === i}
                  class:is-drag-over={dragOverIndex === i}
                  role="group"
                  aria-current={isActiveTrade ? "page" : undefined}
                  aria-label={trade.title}
                  onpointerdown={handleTradeCardPointerDown}
                  onpointerup={(event) => handleTradeCardClick(event, trade)}>
                  <button
                    type="button"
                    class="drag-handle"
                    title={translate($languageStore, "folder.dragTrade")}
                    aria-label={translate($languageStore, "folder.dragTrade")}
                    data-no-card-open="true"
                    onclick={(event) => event.stopPropagation()}>
                    ≡
                  </button>
                  <div class="trade-content">
                    <div class="trade-top">
                      {#if editingTradeId === trade.id}
                        <input
                          type="text"
                          class="inline-edit-input trade-edit"
                          bind:this={tradeEditInputEl}
                          bind:value={tradeEditTitle}
                          onblur={() => saveTradeTitle(trade)}
                          onkeydown={(e) => {
                            e.stopPropagation()
                            if (e.key === "Enter") saveTradeTitle(trade)
                            if (e.key === "Escape") cancelTradeEdit()
                          }}
                          onclick={(event) => event.stopPropagation()} />
                      {:else}
                        <div class="trade-copy">
                          <div class="trade-title-row">
                            <span
                              class="trade-link"
                              title={trade.title}>
                              {trade.title}
                            </span>
                            {#if trade.archivedAt}
                              <span class="archive-status">{translate($languageStore, "bookmarks.toolbar.archive")}</span>
                            {/if}
                          </div>
                        </div>
                      {/if}

                      {#if $settings.compactActionsMenu}
                        <div class="trade-actions trade-actions--compact">
                          <TradeActionsMenu
                            {trade}
                            onEdit={() => void startEditingTrade(trade)}
                            onReplace={() => void replaceSearchWithCurrent(trade)}
                            onCopy={() => copyTrade(trade)}
                            onOpenNewTab={() => void openTrade(trade, "tab")}
                            onDuplicate={() => void duplicateTrade(trade)}
                            onOpenLive={() => void openTradeLive(trade)}
                            onToggleArchive={() => void toggleTradeArchive(trade)}
                            onToggle={() => void toggleTrade(trade)}
                            onDelete={() => requestTradeDelete(trade)}
                            categoriesEnabled={$settings.bookmarkCategoriesEnabled}
                            {categoryOptions}
                            selectedCategoryId={categoryIdForTrade(trade)}
                            onCategorySelect={(categoryId) => void selectTradeCategory(trade, categoryId)}
                            onCategoryCreate={(title) => void createCategoryForTrade(trade, title)} />
                        </div>
                      {/if}
                    </div>
                    {#if !$settings.compactActionsMenu}
                      <div class="trade-actions trade-actions--classic">
                        <TradeActionsMenu
                          {trade}
                          onEdit={() => void startEditingTrade(trade)}
                          onReplace={() => void replaceSearchWithCurrent(trade)}
                          onCopy={() => copyTrade(trade)}
                          onOpenNewTab={() => void openTrade(trade, "tab")}
                          onDuplicate={() => void duplicateTrade(trade)}
                          onOpenLive={() => void openTradeLive(trade)}
                          onToggleArchive={() => void toggleTradeArchive(trade)}
                          onToggle={() => void toggleTrade(trade)}
                          onDelete={() => requestTradeDelete(trade)}
                          categoriesEnabled={$settings.bookmarkCategoriesEnabled}
                          {categoryOptions}
                          selectedCategoryId={categoryIdForTrade(trade)}
                          onCategorySelect={(categoryId) => void selectTradeCategory(trade, categoryId)}
                          onCategoryCreate={(title) => void createCategoryForTrade(trade, title)} />
                      </div>
                    {/if}
                  </div>
                </div>
              </li>
            {/if}
          {/each}
        </ul>
        {#if !previewTrades}
          <div class="footer-actions">
            <div
              class="save-search-anchor"
              data-tutorial={isTutorialSaveTarget ? "save-search" : undefined}>
              <Button
                label={translate($languageStore, "folder.saveCurrentSearch")}
                theme="gold"
                onClick={createTradeFromCurrent} />
            </div>
          </div>
        {/if}
      </LoadingContainer>
    </div>
  {/if}
</div>

<ConfirmDialog
  open={archiveCompletedPending}
  title={translate($languageStore, "confirm.archiveCompletedTitle")}
  message={translate($languageStore, "confirm.archiveCompletedMessage", {
    title: folder.title
  })}
  confirmLabel={translate($languageStore, "confirm.archive")}
  cancelLabel={translate($languageStore, "confirm.cancel")}
  onCancel={cancelArchiveCompleted}
  onConfirm={() => void archiveCompleted()} />

<ConfirmDialog
  open={!!tradePendingDelete}
  title={translate($languageStore, "confirm.deleteTradeTitle")}
  message={translate($languageStore, "confirm.deleteTradeMessage", {
    title: tradePendingDelete?.title || ""
  })}
  confirmLabel={translate($languageStore, "confirm.delete")}
  cancelLabel={translate($languageStore, "confirm.cancel")}
  onCancel={cancelTradeDelete}
  onConfirm={() => {
    if (tradePendingDelete) {
      void deleteTrade(tradePendingDelete)
    }
  }} />

<ConfirmDialog
  open={!!categoryPendingDelete}
  title={translate($languageStore, "folder.deleteCategory")}
  message={translate($languageStore, "folder.deleteCategoryConfirm", {
    title: categoryPendingDelete?.title || ""
  })}
  confirmLabel={translate($languageStore, "confirm.delete")}
  cancelLabel={translate($languageStore, "confirm.cancel")}
  onCancel={cancelCategoryDelete}
  onConfirm={() => {
    if (categoryPendingDelete) {
      void deleteCategory(categoryPendingDelete)
    }
  }} />

<style>
.folder {
  margin-bottom: 10px;
  border: 1px solid rgba(163, 141, 109, 0.12);
  border-radius: 8px;
  overflow: visible;
  font-family: "FontinSmallcaps", serif;
  background: linear-gradient(180deg, rgba(163, 141, 109, 0.035), rgba(163, 141, 109, 0.015)), rgba(5, 5, 5, 0.4);
  box-shadow: inset 0 1px 0 rgba(238, 238, 238, 0.02), 0 8px 18px rgba(0, 0, 0, 0.18);
  transition: transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}
.folder.is-archived {
  opacity: 0.72;
}
.folder.is-folder-dragging {
  opacity: 0.45;
  transform: scale(0.985);
}
.folder.is-folder-drag-over {
  border-color: rgba(163, 141, 109, 0.34);
  box-shadow: inset 0 1px 0 rgba(238, 238, 238, 0.02), 0 0 0 1px rgba(163, 141, 109, 0.2), 0 10px 22px rgba(0, 0, 0, 0.24);
}

.folder-header {
  display: flex;
  align-items: stretch;
  gap: 8px;
  background: linear-gradient(180deg, rgba(26, 42, 58, 0.92), rgba(15, 28, 46, 0.96)), #0f1c2e;
  padding: 8px 10px;
  color: #eeeeee;
  font-family: "FontinSmallcaps", serif;
  border-bottom: 1px solid rgba(163, 141, 109, 0.1);
  border-radius: 8px 8px 0 0;
}

.folder:not(.is-expanded):not(.is-editing) .folder-header {
  border-radius: 8px;
}

.folder-drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 18px;
  color: rgba(196, 177, 140, 0.34);
  cursor: grab;
  user-select: none;
}
.folder-drag-handle:active {
  cursor: grabbing;
}

.expansion-wrapper {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  color: inherit;
  text-align: left;
  width: 100%;
}
.expansion-wrapper:focus-visible {
  border-radius: 4px;
  box-shadow: 0 0 0 1px rgba(163, 141, 109, 0.22), 0 0 0 3px rgba(163, 141, 109, 0.1);
}

.header-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.folder-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  overflow: hidden;
  border-radius: 4px;
}
.folder-icon img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.folder-icon--preview {
  width: 28.8px;
  height: 28.8px;
  flex-basis: 28.8px;
}

.folder-icon--placeholder {
  border: 1px dashed rgba(238, 238, 238, 0.2);
  background: rgba(5, 5, 5, 0.28);
  color: rgba(238, 238, 238, 0.38);
}
.folder-icon--placeholder :global(.action-svg) {
  width: 16px;
  height: 16px;
}

.header-label {
  flex: 1;
  font-family: "FontinSmallcaps", serif;
  font-size: calc(14px * var(--bt-text-scale, 1));
  font-weight: 700;
  letter-spacing: 0.02em;
  color: rgba(238, 238, 238, 0.96);
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.inline-edit-input {
  flex: 1;
  width: 0;
  min-width: 0;
  background: rgba(5, 5, 5, 0.4);
  border: 1px solid rgba(163, 141, 109, 0.5);
  color: #eeeeee;
  font-family: "FontinSmallcaps", serif;
  font-size: calc(14px * var(--bt-text-scale, 1));
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 2px;
  margin-right: 8px;
}
.inline-edit-input:focus-visible {
  border-color: #a38d6d;
  box-shadow: 0 0 0 1px rgba(163, 141, 109, 0.2);
}

.trade-edit {
  font-size: calc(12px * var(--bt-text-scale, 1));
  margin-right: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding-left: 8px;
  border-left: 1px solid rgba(238, 238, 238, 0.06);
}

.folder-edit-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border-top: 1px solid rgba(238, 238, 238, 0.06);
  background: rgba(5, 5, 5, 0.22);
}

.folder-edit-panel__top {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(34px, 1fr));
  gap: 6px;
}

.folder-icon-divider {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 0 2px;
}
.folder-icon-divider::before,
.folder-icon-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: rgba(238, 238, 238, 0.12);
}
.folder-icon-divider span {
  font-family: "FontinSmallcaps", serif;
  font-size: calc(10.35px * var(--bt-text-scale, 1));
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(163, 141, 109, 0.72);
  white-space: nowrap;
}

.folder-icon-classes {
  display: flex;
  align-items: stretch;
  gap: 6px;
  overflow-x: auto;
}

.folder-icon-class-column {
  display: flex;
  flex-direction: column-reverse;
  justify-content: flex-start;
  gap: 6px;
  flex: 1 1 0;
  min-width: 34px;
}

.folder-icon-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 34px;
  padding: 4px;
  border: 1px solid rgba(238, 238, 238, 0.08);
  border-radius: 4px;
  background: rgba(5, 5, 5, 0.28);
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
}
.folder-icon-option img {
  display: block;
  width: 24px;
  height: 24px;
  object-fit: cover;
  object-position: center;
  border-radius: 3px;
}
.folder-icon-option:hover {
  border-color: rgba(163, 141, 109, 0.26);
  background: rgba(238, 238, 238, 0.05);
  transform: translateY(-1px);
}
.folder-icon-option:focus-visible {
  border-color: rgba(163, 141, 109, 0.3);
  box-shadow: 0 0 0 1px rgba(163, 141, 109, 0.18), 0 0 0 3px rgba(163, 141, 109, 0.08);
}
.folder-icon-option.is-selected {
  border-color: rgba(163, 141, 109, 0.42);
  background: rgba(163, 141, 109, 0.08);
}

.folder-edit-panel__title {
  font-family: "FontinSmallcaps", serif;
  font-size: calc(12.65px * var(--bt-text-scale, 1));
  letter-spacing: 0.02em;
  color: rgba(238, 238, 238, 0.82);
}

.folder-edit-panel__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  /* Horizontal rule separating the save/cancel row from the selectable icons. */
  margin-top: 2px;
  padding-top: 12px;
  border-top: 1px solid rgba(238, 238, 238, 0.12);
}

.folder-edit-panel__preview {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.folder-edit-panel__buttons {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  font-size: 0;
}

.action-icon :global(.action-svg) {
  width: 13px;
  height: 13px;
  min-width: 13px;
  min-height: 13px;
  display: block;
  overflow: visible;
  stroke-width: 1.6;
}

.trades-list {
  list-style: none;
  padding: 10px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: linear-gradient(180deg, rgba(238, 238, 238, 0.015), rgba(238, 238, 238, 0)), rgba(5, 5, 5, 0.36);
}

.category-row {
  position: relative;
  list-style: none;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.category-row.is-drag-over .category-heading {
  border-radius: 4px;
  background: rgba(163, 141, 109, 0.1);
  box-shadow: inset 0 0 0 1px rgba(163, 141, 109, 0.2), 0 0 0 1px rgba(163, 141, 109, 0.14);
}

.category-drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  min-width: 18px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: rgba(238, 238, 238, 0.3);
  cursor: grab;
  user-select: none;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.category-drag-handle:hover {
  color: #a38d6d;
  background: rgba(238, 238, 238, 0.05);
}

.category-drag-handle:focus-visible {
  outline: 1px solid rgba(163, 141, 109, 0.65);
  outline-offset: 1px;
}

.category-drag-handle:active {
  cursor: grabbing;
}

.category-drag-handle :global(.action-svg) {
  width: 13px;
  height: 13px;
  min-width: 13px;
  min-height: 13px;
  stroke-width: 1.6;
}

.category-row.is-dragging {
  opacity: 0.45;
  transform: scale(0.985);
}

.category-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 2px 4px;
  color: rgba(196, 177, 140, 0.82);
  cursor: pointer;
  font-family: "FontinSmallcaps", serif;
  font-size: calc(11px * var(--bt-text-scale, 1));
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.category-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  min-width: 18px;
  height: 22px;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(238, 238, 238, 0.68);
  cursor: pointer;
  font-size: calc(15px * var(--bt-text-scale, 1));
  line-height: 1;
}

.category-toggle:hover,
.category-toggle:focus-visible {
  color: #eeeeee;
}

.category-toggle:focus-visible {
  outline: 1px solid rgba(163, 141, 109, 0.65);
  border-radius: 3px;
}

.category-heading__rule {
  height: 1px;
  min-width: 14px;
  flex: 1;
  background: rgba(163, 141, 109, 0.2);
}

.category-heading__title {
  max-width: 62%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-heading__drag-area {
  cursor: grab;
  user-select: none;
}

.category-heading__drag-area:active {
  cursor: grabbing;
}

.category-heading__count {
  color: rgba(238, 238, 238, 0.48);
  font-size: calc(10px * var(--bt-text-scale, 1));
}

.category-heading__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
}

.category-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid rgba(238, 238, 238, 0.1);
  border-radius: 3px;
  background: rgba(5, 5, 5, 0.35);
  color: rgba(238, 238, 238, 0.72);
  cursor: pointer;
}
.category-action:hover {
  border-color: rgba(163, 141, 109, 0.32);
  color: #eeeeee;
  background: rgba(238, 238, 238, 0.06);
}
.category-action.is-danger:hover {
  border-color: rgba(109, 28, 28, 0.45);
  color: #ffd7d7;
  background: rgba(109, 28, 28, 0.16);
}

.trade-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: 1px solid rgba(238, 238, 238, 0.06);
  border-radius: 6px;
  background: rgba(5, 5, 5, 0.34);
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, opacity 0.2s, transform 0.2s;
}
.trade-item:hover {
  background-color: rgba(238, 238, 238, 0.05);
  border-color: rgba(163, 141, 109, 0.16);
  transform: translateY(-1px);
}
.trade-item:focus-visible {
  border-color: rgba(163, 141, 109, 0.42);
  box-shadow: 0 0 0 2px rgba(163, 141, 109, 0.14);
  outline: none;
}
.trade-item.is-dragging {
  opacity: 0.3;
  background-color: rgba(163, 141, 109, 0.1);
}
.trade-item.is-completed {
  background: rgba(30, 77, 30, 0.14);
  border-color: rgba(30, 77, 30, 0.28);
}
.trade-item.is-current {
  border-color: rgba(163, 141, 109, 0.42);
  background: rgba(163, 141, 109, 0.12);
}
.trade-item.is-current.is-completed {
  border-color: rgba(163, 141, 109, 0.36);
  background: linear-gradient(
    90deg,
    rgba(30, 77, 30, 0.14),
    rgba(163, 141, 109, 0.12)
  );
}
.trade-item.is-drag-over {
  border-color: rgba(163, 141, 109, 0.42);
  background-color: rgba(163, 141, 109, 0.15);
  box-shadow: 0 0 0 1px rgba(163, 141, 109, 0.18);
}

.drag-handle {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: grab;
  color: rgba(238, 238, 238, 0.3);
  font-size: calc(15px * var(--bt-text-scale, 1));
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  flex: 0 0 16px;
}
.drag-handle:hover {
  color: #a38d6d;
}
.drag-handle:active {
  cursor: grabbing;
}

.trade-content {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex: 1;
  min-width: 0;
  gap: 4px;
}

.trade-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.trade-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trade-link {
  flex: 1;
  color: #eeeeee;
  text-decoration: none;
  font-size: calc(13px * var(--bt-text-scale, 1));
  line-height: 1.2;
  cursor: inherit;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.trade-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.archive-status {
  flex: 0 0 auto;
  border: 1px solid rgba(163, 141, 109, 0.42);
  border-radius: 3px;
  padding: 1px 5px;
  color: rgba(205, 180, 137, 0.95);
  background: rgba(163, 141, 109, 0.12);
  font-family: "FontinSmallcaps", serif;
  font-size: calc(9px * var(--bt-text-scale, 1));
  font-weight: 700;
  letter-spacing: 0.05em;
  line-height: 1.2;
  text-transform: uppercase;
}

.trade-actions {
  display: flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
  flex-shrink: 0;
  padding: 0;
  margin: 0;
}

.trade-actions--compact {
  margin-left: auto;
}

.trade-actions--classic {
  margin-left: auto;
}

.indicator {
  flex: 0 0 auto;
  color: rgba(196, 177, 140, 0.78);
  font-size: calc(11px * var(--bt-text-scale, 1));
}

.trades-content {
  background: rgba(5, 5, 5, 0.24);
  border-radius: 0 0 8px 8px;
}

.footer-actions {
  padding: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  border-top: 1px solid rgba(163, 141, 109, 0.08);
  background: linear-gradient(180deg, rgba(163, 141, 109, 0.04), rgba(163, 141, 109, 0));
}

.folder.is-ultra-compact .trades-list {
  gap: 1px;
  padding: 4px;
}
.folder.is-ultra-compact .category-heading {
  min-height: 22px;
  padding: 0 4px;
  font-size: calc(10px * var(--bt-text-scale, 1));
}
.folder.is-ultra-compact .category-row {
  padding-top: 4px;
  padding-bottom: 4px;
}
.folder.is-ultra-compact .trade-item {
  gap: 6px;
  min-height: 29px;
  padding: 4px 7px;
  border-color: rgba(238, 238, 238, 0.075);
  border-radius: 3px;
}
.folder.is-ultra-compact .trade-item:hover {
  transform: none;
}
.folder.is-ultra-compact .drag-handle {
  width: 12px;
  flex-basis: 12px;
  font-size: calc(12px * var(--bt-text-scale, 1));
}
.folder.is-ultra-compact .trade-content,
.folder.is-ultra-compact .trade-copy {
  gap: 0;
}
.folder.is-ultra-compact .trade-top {
  gap: 4px;
}
.folder.is-ultra-compact .trade-link {
  font-size: calc(12px * var(--bt-text-scale, 1));
  line-height: 1.1;
}

.save-search-anchor {
  display: flex;
  flex: 0 1 auto;
  min-width: 0;
}

.trade-item.is-archived {
  opacity: 0.68;
}

:global(.folder-action-footer-btn) {
  flex: 0 0 auto;
}
</style>
