<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { languageStore, translate } from "~lib/services/i18n";
  import { settings, type BookmarkTradeActionId } from "~lib/services/settings";
  import type { BookmarksTradeStruct } from "~lib/types/bookmarks";
  import { normalizeIcon } from "~lib/utilities/icons";

  import editIcon from "data-text:lucide-static/icons/pencil.svg";
  import replaceIcon from "data-text:lucide-static/icons/refresh-cw.svg";
  import copyIcon from "data-text:lucide-static/icons/copy.svg";
  import liveIcon from "data-text:lucide-static/icons/activity.svg";
  import checkIcon from "data-text:lucide-static/icons/check.svg";
  import trashIcon from "data-text:lucide-static/icons/trash-2.svg";
  import moreIcon from "data-text:lucide-static/icons/more-horizontal.svg";

  export let trade: BookmarksTradeStruct;
  export let onEdit: () => void;
  export let onReplace: () => void;
  export let onCopy: () => void;
  export let onOpenLive: () => void;
  export let onToggle: () => void;
  export let onDelete: () => void;
  export let compactText = "";

  type TradeAction = {
    id: BookmarkTradeActionId;
    icon: string;
    label: string;
    handler: () => void;
    danger?: boolean;
  };

  const OPEN_EVENT_NAME = "poe-trade-plus:trade-actions-open";
  const ACTION_ORDER: BookmarkTradeActionId[] = [
    "edit",
    "replace",
    "copy",
    "openLive",
    "toggle",
    "delete"
  ];

  let triggerRef: HTMLButtonElement | null = null;
  let isOpen = false;
  let menuRoot: HTMLDivElement | null = null;

  $: actions = [
    {
      id: "edit",
      icon: editIcon,
      label: translate($languageStore, "folder.editSearchName"),
      handler: onEdit
    },
    {
      id: "replace",
      icon: replaceIcon,
      label: translate($languageStore, "folder.replaceCurrentSearch"),
      handler: onReplace
    },
    {
      id: "copy",
      icon: copyIcon,
      label: translate($languageStore, "folder.copyUrl"),
      handler: onCopy
    },
    {
      id: "openLive",
      icon: liveIcon,
      label: translate($languageStore, "folder.openLiveSearch"),
      handler: onOpenLive
    },
    {
      id: "toggle",
      icon: checkIcon,
      label: trade.completedAt
        ? translate($languageStore, "folder.markPending")
        : translate($languageStore, "folder.markComplete"),
      handler: onToggle
    },
    {
      id: "delete",
      icon: trashIcon,
      label: translate($languageStore, "folder.deleteTrade"),
      handler: onDelete,
      danger: true
    }
  ] satisfies TradeAction[];

  $: compactVisibleActionIds = ACTION_ORDER.filter((id) =>
    $settings.compactBookmarkTradeActions.includes(id)
  );
  $: inlineActions = $settings.compactActionsMenu
    ? actions.filter((action) => compactVisibleActionIds.includes(action.id))
    : compactVisibleActionIds.length > 0
      ? actions.filter((action) => compactVisibleActionIds.includes(action.id))
      : actions.filter(
          (action) =>
            action.id === "edit" ||
            action.id === "toggle" ||
            action.id === "delete"
        );
  $: dropdownActions = actions.filter((action) => !inlineActions.includes(action));

  const closeMenu = () => {
    isOpen = false;
    menuRoot?.remove();
    menuRoot = null;
  };

  const positionMenu = () => {
    if (!triggerRef || !menuRoot) return;

    const triggerRect = triggerRef.getBoundingClientRect();
    const menuRect = menuRoot.getBoundingClientRect();
    const gap = 4;
    const margin = 8;

    let left = triggerRect.right - menuRect.width;
    left = Math.max(margin, Math.min(left, window.innerWidth - menuRect.width - margin));

    let top = triggerRect.bottom + gap;
    if (top + menuRect.height > window.innerHeight - margin) {
      top = Math.max(margin, triggerRect.top - menuRect.height - gap);
    }

    menuRoot.style.left = `${Math.round(left)}px`;
    menuRoot.style.top = `${Math.round(top)}px`;
    menuRoot.dataset.ready = "true";
  };

  const buildMenu = () => {
    menuRoot?.remove();

    const root = document.createElement("div");
    root.className = "trade-action-menu-portal";
    root.dataset.ready = "false";

    for (const action of dropdownActions) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `trade-action-menu-portal__item${action.danger ? " is-danger" : ""}`;
      button.innerHTML = `
        <span class="trade-action-menu-portal__icon" aria-hidden="true">${normalizeIcon(action.icon)}</span>
        <span class="trade-action-menu-portal__label">${action.label}</span>
      `;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        action.handler();
        closeMenu();
      });
      root.appendChild(button);
    }

    document.body.appendChild(root);
    menuRoot = root;
    window.requestAnimationFrame(() => {
      positionMenu();
      window.requestAnimationFrame(() => {
        positionMenu();
      });
    });
  };

  const toggleMenu = (event: MouseEvent) => {
    event.stopPropagation();

    if (isOpen) {
      closeMenu();
      return;
    }

    document.dispatchEvent(new CustomEvent(OPEN_EVENT_NAME));
    isOpen = true;
    buildMenu();
  };

  const runInlineAction = (handler: () => void) => {
    handler();
    closeMenu();
  };

  const handleDocumentClick = (event: MouseEvent) => {
    const target = event.target as Node | null;
    if (!isOpen) return;
    if (menuRoot?.contains(target) || triggerRef?.contains(target)) return;
    closeMenu();
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closeMenu();
      triggerRef?.focus();
    }
  };

  const handleOtherMenuOpen = () => {
    closeMenu();
  };

  const handleViewportChange = () => {
    if (!isOpen) return;
    closeMenu();
  };

  onMount(() => {
    document.addEventListener("click", handleDocumentClick, true);
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener(OPEN_EVENT_NAME, handleOtherMenuOpen);
    window.addEventListener("resize", handleViewportChange);
    document.addEventListener("scroll", handleViewportChange, true);
    document.addEventListener("wheel", handleViewportChange, {
      capture: true,
      passive: true
    });
    document.addEventListener("touchmove", handleViewportChange, {
      capture: true,
      passive: true
    });
  });

  onDestroy(() => {
    closeMenu();
    document.removeEventListener("click", handleDocumentClick, true);
    document.removeEventListener("keydown", handleKeydown);
    document.removeEventListener(OPEN_EVENT_NAME, handleOtherMenuOpen);
    window.removeEventListener("resize", handleViewportChange);
    document.removeEventListener("scroll", handleViewportChange, true);
    document.removeEventListener("wheel", handleViewportChange, true);
    document.removeEventListener("touchmove", handleViewportChange, true);
  });
</script>

<div class="trade-actions-menu">
  <div class="trade-actions-menu__inline" class:is-compact={$settings.compactActionsMenu}>
    {#if $settings.compactActionsMenu && compactText}
      <span class="trade-actions-menu__text" title={compactText}>{compactText}</span>
    {/if}

    {#each inlineActions as action (action.id)}
      <button
        type="button"
        class="trade-action-btn"
        class:is-danger={action.danger}
        title={action.label}
        aria-label={action.label}
        on:click|stopPropagation={() => runInlineAction(action.handler)}
      >
        <span class="trade-action-btn__icon" aria-hidden="true">
          {@html normalizeIcon(action.icon)}
        </span>
      </button>
    {/each}

    {#if dropdownActions.length > 0}
      <button
        type="button"
        class="trade-action-btn"
        title={translate($languageStore, "folder.actionsMenu")}
        aria-label={translate($languageStore, "folder.actionsMenu")}
        aria-expanded={isOpen}
        on:click={toggleMenu}
        bind:this={triggerRef}
      >
        <span class="trade-action-btn__icon" aria-hidden="true">
          {@html normalizeIcon(moreIcon)}
        </span>
      </button>
    {/if}
  </div>
</div>

<style lang="scss">
  @use "../lib/styles/variables" as *;

  .trade-actions-menu {
    position: relative;
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .trade-actions-menu__inline {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  .trade-actions-menu__inline.is-compact {
    gap: 8px;
  }

  .trade-actions-menu__text {
    min-width: 0;
    font-size: 10px;
    line-height: 1.2;
    color: rgba($gold-alt, 0.52);
    letter-spacing: 0.03em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .trade-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 1px solid rgba($white, 0.12);
    background: rgba($black, 0.45);
    color: rgba($white, 0.82);
    cursor: pointer;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;

    &:hover {
      background-color: rgba($white, 0.08);
      border-color: rgba($gold, 0.38);
      color: $white;
    }

    &.is-danger:hover {
      background-color: rgba($red, 0.18);
      border-color: rgba($red, 0.5);
      color: #ffd7d7;
    }
  }

  .trade-action-btn__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 13px;
    height: 13px;
    flex-shrink: 0;
    font-size: 0;
  }

  :global(.trade-action-menu-portal) {
    position: fixed;
    left: -9999px;
    top: -9999px;
    z-index: 2147483647;
    min-width: 182px;
    padding: 6px;
    border: 1px solid rgba(168, 129, 73, 0.3);
    border-radius: 6px;
    background: #0b0b0b;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    opacity: 0;
    pointer-events: none;
  }

  :global(.trade-action-menu-portal[data-ready="true"]) {
    opacity: 1;
    pointer-events: auto;
  }

  :global(.trade-action-menu-portal__item) {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    border: 0;
    border-radius: 4px;
    background: #0b0b0b;
    color: rgba(255, 255, 255, 0.9);
    cursor: pointer;
    text-align: left;
    font-size: 12px;
    line-height: 1.35;
  }

  :global(.trade-action-menu-portal__item:hover) {
    background: #171717;
  }

  :global(.trade-action-menu-portal__item.is-danger:hover) {
    background-color: rgba(120, 38, 38, 0.32);
    color: #ffd7d7;
  }

  :global(.trade-action-menu-portal__icon) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 13px;
    height: 13px;
    flex-shrink: 0;
    font-size: 0;
  }

  :global(.trade-action-menu-portal__label) {
    white-space: nowrap;
  }
</style>
