<script lang="ts">
  export let label: string = "";
  export let icon: string = "";
  export let href: string = "";
  export let theme: "blue" | "gold" | "red" = "blue";
  export let onFileChange: ((event: Event) => void) | null = null;
  export let onClick: (() => void) | null = null;
  export let fileAccept: string = "*";
  let className: string = "";
  export { className as class };

  const handleClick = () => {
    if (onClick) onClick();
  };
</script>

{#if href}
  <a {href} target="_blank" rel="noopener" class="button is-{theme} {className}">
    {#if icon}<span class="icon">{icon}</span>{/if}
    {#if label}<span class="label">{label}</span>{/if}
  </a>
{:else if onFileChange}
  <label class="button is-{theme} {className}">
    <input type="file" class="file-input" accept={fileAccept} on:change={onFileChange} />
    {#if icon}<span class="icon">{icon}</span>{/if}
    {#if label}<span class="label">{label}</span>{/if}
  </label>
{:else}
  <button type="button" class="button is-{theme} {className}" on:click={handleClick}>
    {#if icon}<span class="icon">{icon}</span>{/if}
    {#if label}<span class="label">{label}</span>{/if}
  </button>
{/if}

<style lang="scss">
  @use "sass:color";
  @use "../lib/styles/variables" as *;

  .button {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    height: 32px;
    padding: 0 12px;
    border: 1px solid;
    outline: none;
    text-decoration: none;
    font-family: $primary-font;
    font-size: 13px;
    font-weight: bold;
    color: $white;
    cursor: pointer;
    transition: all 0.2s ease;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);

    &.is-blue {
      border-color: #2b3d4f;
      background: linear-gradient(to bottom, $blue-alt, $blue);
      &:hover { 
          background: linear-gradient(to bottom, color.adjust($blue-alt, $lightness: 10%), $blue-alt);
          border-color: color.adjust($blue-alt, $lightness: 20%);
      }
    }

    &.is-gold {
      border-color: color.adjust($gold, $lightness: -20%);
      background: linear-gradient(to bottom, $gold, color.adjust($gold, $lightness: -15%));
      color: #fff;
      &:hover { 
          background: linear-gradient(to bottom, $gold-alt, $gold);
          border-color: $gold;
          color: $white;
      }
    }

    &.is-red {
      border-color: color.adjust($red, $lightness: -10%);
      background: linear-gradient(to bottom, $red, color.adjust($red, $lightness: -15%));
      &:hover { 
          background: linear-gradient(to bottom, color.adjust($red, $lightness: 5%), $red);
          border-color: color.adjust($red, $lightness: 10%);
      }
    }
  }

  .file-input { display: none !important; }
  .icon { margin-right: 8px; font-size: 14px; }
  .label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
