<script lang="ts">
  import { onMount, onDestroy } from "svelte";
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
  export let dropdownLabel = "More";
  export let dropdownIcon: string;
  export let translate: ((key: string) => string) | undefined = undefined;

  let triggerRef: HTMLButtonElement;
  let menuRef: HTMLDivElement;
  let isOpen = false;
  let isMounted = false;

  const closeMenu = () => (isOpen = false);
  const toggleMenu = () => (isOpen = !isOpen);

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

  onMount(() => {
    isMounted = true;
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);
  });

  onDestroy(() => {
    isMounted = false;
    document.removeEventListener("click", handleClickOutside);
    document.removeEventListener("keydown", handleKeydown);
  });

  $: primaryActions = actions.filter((a) => primaryActionIds.includes(a.id));
  $: showAsCompact = compactMode && primaryActionIds.length > 0;
  $: dropdownActions = showAsCompact
    ? actions.filter((a) => !primaryActionIds.includes(a.id))
    : actions;

  const getDisplayLabel = (action: typeof actions[0]) => {
    if (action.customLabel) return action.customLabel;
    if (translate && action.labelKey) return translate(action.labelKey);
    return action.labelKey || "";
  };
</script>

<div class="actions-container">
  {#if showAsCompact}
    <div class="actions-inline">
      {#each primaryActions as action}
        <button
          type="button"
          class="btn btn--icon"
          class:btn--danger={action.danger}
          title={getDisplayLabel(action)}
          aria-label={getDisplayLabel(action)}
          on:click|stopPropagation={() => handleAction(action.handler)}
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
      {#each actions as action}
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
    </div>
  {/if}

  {#if isOpen && dropdownActions.length > 0}
    <div class="menu-dropdown" aria-label={translate ? translate(dropdownLabel) : dropdownLabel} bind:this={menuRef}>
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
  }

  .actions-inline {
    display: flex;
    align-items: center;
    gap: 4px;
    padding-left: 8px;
    border-left: 1px solid rgba($white, 0.05);
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
      padding: 8px 10px;
      border: none;
      background: none;
      border-radius: 4px;
      text-align: left;
      font-size: 12px;

      &:hover {
        background-color: rgba($white, 0.08);
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
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-90%);
    z-index: 1000;
    min-width: 160px;
    margin-top: 4px;
    background: rgba($black, 0.96);
    border: 1px solid rgba($gold, 0.3);
    border-radius: 6px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
    padding: 4px;
    display: flex;
    flex-direction: column;
  }
</style>