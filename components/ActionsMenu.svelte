<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import { normalizeIcon } from "~lib/utilities/icons";

  type ActionId = string;

  export let actions: Array<{
    id: ActionId;
    icon: string;
    labelKey?: string;
    customLabel?: string;
    handler: () => void;
    danger?: boolean;
    isToggle?: boolean;
  }>;
  export let primaryActionIds: ActionId[];
  export let compactMode = false;
  export let compactText = "";
  export let compactVisibleActionIds: ActionId[] | undefined = undefined;
  export let dropdownLabel = "More";
  export let dropdownIcon: string;
  export let translate: ((key: string) => string) | undefined = undefined;

  let triggerRef: HTMLButtonElement;
  let menuRef: HTMLDivElement;
  let isOpen = false;
  let isMounted = false;
  let menuStyle = "";
  const OPEN_EVENT_NAME = "poe-trade-plus:actions-menu-open";

  const closeMenu = () => {
    isOpen = false;
    menuStyle = "";
  };

  const updateMenuPosition = () => {
    if (!triggerRef) return;

    const rect = triggerRef.getBoundingClientRect();
    const menuWidth = Math.max(menuRef?.offsetWidth || 0, 172);
    const menuHeight = menuRef?.offsetHeight || 0;
    const gap = 4;
    const margin = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = rect.right - menuWidth;
    left = Math.max(margin, Math.min(left, viewportWidth - menuWidth - margin));

    let top = rect.bottom + gap;
    if (menuHeight && top + menuHeight > viewportHeight - margin) {
      top = Math.max(margin, rect.top - menuHeight - gap);
    }

    menuStyle = `top: ${Math.round(top)}px; left: ${Math.round(left)}px;`;
  };

  const toggleMenu = async () => {
    if (isOpen) {
      closeMenu();
      return;
    }

    document.dispatchEvent(new CustomEvent(OPEN_EVENT_NAME));
    isOpen = true;
    await tick();
    window.requestAnimationFrame(() => {
      if (isOpen) updateMenuPosition();
    });
  };

  const handleAction = (handler: () => void) => {
    handler();
    closeMenu();
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (!isMounted) return;
    if (
      e.target instanceof Node &&
      menuRef &&
      !menuRef.contains(e.target) &&
      triggerRef &&
      !triggerRef.contains(e.target)
    ) {
      closeMenu();
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (!isMounted) return;
    if (e.key === "Escape" && isOpen) {
      closeMenu();
      triggerRef?.focus();
    }
  };

  const handleMenuOpen = () => {
    if (!isMounted) return;
    closeMenu();
  };

  const handleViewportChange = () => {
    if (!isMounted || !isOpen) return;
    updateMenuPosition();
  };

  onMount(() => {
    isMounted = true;
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener(OPEN_EVENT_NAME, handleMenuOpen);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
  });

  onDestroy(() => {
    isMounted = false;
    document.removeEventListener("click", handleClickOutside);
    document.removeEventListener("keydown", handleKeydown);
    document.removeEventListener(OPEN_EVENT_NAME, handleMenuOpen);
    window.removeEventListener("resize", handleViewportChange);
    window.removeEventListener("scroll", handleViewportChange, true);
  });

  $: hasConfiguredVisibility = compactVisibleActionIds !== undefined;
  $: compactVisibleActions = actions.filter((action) =>
    compactVisibleActionIds?.includes(action.id)
  );
  $: configuredInlineActions = actions.filter((action) =>
    compactVisibleActionIds?.includes(action.id)
  );
  $: primaryInlineActions = actions.filter((action) =>
    primaryActionIds.includes(action.id)
  );
  $: shouldShowAllCompactActions =
    compactMode &&
    !!compactVisibleActionIds &&
    compactVisibleActionIds.length > 0 &&
    compactVisibleActions.length >= actions.length - 1;
  $: showAsCompact = compactMode && actions.length > 0;
  $: inlineActions = showAsCompact
    ? shouldShowAllCompactActions
      ? actions
      : compactVisibleActions
    : hasConfiguredVisibility
      ? configuredInlineActions
      : primaryInlineActions.length > 0
      ? primaryInlineActions
      : actions;
  $: dropdownActions = showAsCompact
    ? shouldShowAllCompactActions
      ? []
      : actions.filter((action) => !compactVisibleActionIds?.includes(action.id))
    : hasConfiguredVisibility
      ? actions.filter((action) => !compactVisibleActionIds?.includes(action.id))
      : primaryInlineActions.length > 0
      ? actions.filter((action) => !primaryActionIds.includes(action.id))
      : [];
  const getDisplayLabel = (action: typeof actions[0]) => {
    if (action.customLabel) return action.customLabel;
    if (translate && action.labelKey) return translate(action.labelKey);
    return action.labelKey || "";
  };
</script>

<div class="actions-container" class:is-open={isOpen}>
  {#if showAsCompact}
    <div class="actions-inline actions-inline--compact">
      {#if compactText}
        <span class="actions-inline__text" title={compactText}>{compactText}</span>
      {/if}

      {#each inlineActions as action}
        <button
          type="button"
          class="btn btn--icon"
          class:btn--danger={action.danger}
          title={getDisplayLabel(action)}
          aria-label={getDisplayLabel(action)}
          on:click|stopPropagation={action.handler}
        >
          <span class="btn__icon" aria-hidden="true">{@html normalizeIcon(action.icon)}</span>
        </button>
      {/each}

      {#if dropdownActions.length > 0}
        <button
          type="button"
          class="btn btn--icon menu-trigger"
          title={translate ? translate(dropdownLabel) : dropdownLabel}
          aria-label={translate ? translate(dropdownLabel) : dropdownLabel}
          aria-expanded={isOpen}
          on:click|stopPropagation={toggleMenu}
          bind:this={triggerRef}
        >
          <span class="btn__icon" aria-hidden="true">{@html normalizeIcon(dropdownIcon || "")}</span>
        </button>
      {/if}
    </div>

  {:else}
    <div class="actions-inline">
      {#each inlineActions as action}
        <button
          type="button"
          class="btn btn--icon"
          class:btn--danger={action.danger}
          title={getDisplayLabel(action)}
          aria-label={getDisplayLabel(action)}
          on:click|stopPropagation={action.handler}
        >
          <span class="btn__icon" aria-hidden="true">{@html normalizeIcon(action.icon)}</span>
        </button>
      {/each}

      {#if dropdownActions.length > 0}
        <button
          type="button"
          class="btn btn--icon menu-trigger"
          title={translate ? translate(dropdownLabel) : dropdownLabel}
          aria-label={translate ? translate(dropdownLabel) : dropdownLabel}
          aria-expanded={isOpen}
          on:click|stopPropagation={toggleMenu}
          bind:this={triggerRef}
        >
          <span class="btn__icon" aria-hidden="true">{@html normalizeIcon(dropdownIcon || "")}</span>
        </button>
      {/if}
    </div>
  {/if}

  {#if isOpen && dropdownActions.length > 0}
    <div
      class="menu-dropdown"
      style={menuStyle}
      aria-label={translate ? translate(dropdownLabel) : dropdownLabel}
      bind:this={menuRef}
    >
      {#each dropdownActions as action}
        <button
          type="button"
          class="btn btn--menu"
          class:btn--danger={action.danger}
          on:click|stopPropagation={() => handleAction(action.handler)}
        >
          <span class="btn__icon" aria-hidden="true">{@html normalizeIcon(action.icon)}</span>
          <span class="btn__label">{getDisplayLabel(action)}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  @use "../lib/styles/variables" as *;

  .actions-container {
    position: relative;
    display: flex;
    align-items: center;
    min-width: 0;
    z-index: 20;
  }

  .actions-container.is-open {
    z-index: 40;
  }

  .actions-inline {
    display: flex;
    align-items: center;
    gap: 4px;
    padding-left: 8px;
    border-left: 1px solid rgba($white, 0.05);
    min-width: 0;
  }

  .actions-inline--compact {
    gap: 8px;
    padding-left: 0;
    border-left: none;
  }

  .actions-inline__text {
    min-width: 0;
    font-size: 10px;
    line-height: 1.2;
    color: rgba($gold-alt, 0.52);
    letter-spacing: 0.03em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid rgba($white, 0.12);
    background-color: rgba($black, 0.45);
    color: rgba($white, 0.82);
    cursor: pointer;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;

    &:hover {
      background-color: rgba($white, 0.08);
      border-color: rgba($gold, 0.38);
      color: $white;
    }

    &--danger:hover {
      background-color: rgba($red, 0.18);
      border-color: rgba($red, 0.5);
      color: #ffd7d7;
    }

    &--icon {
      width: 24px;
      height: 24px;
      font-size: 12px;
      line-height: 1;
    }

    &--menu {
      justify-content: flex-start;
      width: 100%;
      gap: 10px;
      padding: 10px 12px;
      border: none;
      background: #0b0b0b;
      border-radius: 4px;
      text-align: left;
      font-size: 12px;
      line-height: 1.35;

      &:hover {
        background-color: #171717;
        border-color: transparent;
      }
    }
  }

  .btn__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 13px;
    height: 13px;
    flex-shrink: 0;
    font-size: 0;
  }

  .btn__label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .menu-dropdown {
    position: fixed;
    z-index: 10000;
    min-width: 172px;
    background-color: #0b0b0b;
    opacity: 1;
    border: 1px solid rgba($gold, 0.3);
    border-radius: 6px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
    backdrop-filter: none;
    padding: 6px;
    display: flex;
    flex-direction: column;
    pointer-events: auto;
  }
</style>
