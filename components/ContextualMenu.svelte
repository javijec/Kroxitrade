<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import { fade } from "svelte/transition";

  export let items: Array<{ label: string; onClick?: () => void; href?: string }> = [];
  
  const dispatch = createEventDispatcher();
  let visible = false;
  let x = 0;
  let y = 0;
  let menuEl: HTMLElement;

  const toggle = (e: MouseEvent) => {
    e.stopPropagation();
    visible = !visible;
    if (visible) {
      x = e.clientX;
      y = e.clientY;
    }
  };

  const close = () => {
    visible = false;
  };

  const onItemClick = (item: any) => {
    if (item.onClick) item.onClick();
    close();
  };

  onMount(() => {
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  });
</script>

<div class="contextual-menu-trigger" on:click={toggle}>
  <span>⋮</span>
</div>

{#if visible}
  <div 
    class="contextual-menu-items" 
    style:top="{y}px" 
    style:left="{x}px"
    transition:fade={{ duration: 200 }}
    on:click|stopPropagation
  >
    {#each items as item}
      {#if item.href}
        <a href={item.href} class="menu-item" target="_blank" on:click={() => onItemClick(item)}>
          {item.label}
        </a>
      {:else}
        <button class="menu-item" on:click={() => onItemClick(item)}>
          {item.label}
        </button>
      {/if}
    {/each}
  </div>
{/if}

<style lang="scss">
  @use "sass:color";
  @use "../lib/styles/variables" as *;

  .contextual-menu-trigger {
    cursor: pointer;
    padding: 5px;
    font-size: 20px;
    color: $white;
    &:hover { color: rgba($white, 0.8); }
  }

  .contextual-menu-items {
    position: fixed;
    z-index: 10000;
    min-width: 180px;
    background-color: $gray;
    border: 1px solid color.adjust($gray, $lightness: 10%);
    box-shadow: 0 2px 10px rgba(0,0,0,0.5);
    transform: translate(-100%, 0);
  }

  .menu-item {
    display: block;
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    border: 0;
    text-align: left;
    color: $white;
    font-family: $default-font;
    font-size: 13px;
    text-decoration: none;
    cursor: pointer;

    &:hover {
      background-color: color.adjust($gray, $lightness: 10%);
    }
  }
</style>
