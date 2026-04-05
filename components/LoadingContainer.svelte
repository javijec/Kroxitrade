<script lang="ts">
  export let isLoading: boolean = false;
  export let size: "small" | "large" = "large";
</script>

<div class="loading-container">
  {#if isLoading}
    <div class="loader is-{size}">
      <span class="spinner">↻</span>
    </div>
  {:else}
    <div class="content">
      <slot />
    </div>
  {/if}
</div>

<style lang="scss">
  @use "../lib/styles/variables" as *;
  @use "../lib/styles/mixins" as *;

  .loading-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    min-height: 0;
  }

  .loader {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    flex: 0 0 auto;
    margin: 10px 0;
    font-size: 25px;
    color: $white;
    @include delayed-fade-in;

    &.is-small { margin: 5px 0; font-size: 15px; }
    &.is-large { margin: 20px 0; font-size: 25px; }
  }

  .spinner {
    display: inline-block;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .content {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    @include fade-in;
    width: 100%;
    min-width: 0;
    min-height: 0;
  }
</style>
