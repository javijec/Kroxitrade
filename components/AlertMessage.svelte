<script lang="ts">
  export let type: "warning" | "alert" | "success" | "info" = "warning";
  export let message: string;

  $: icon = type === "success" ? "✓" : "⚠";
</script>

<div class="alert-message is-{type}">
  <span class="icon">{icon}</span>
  <span class="text">{@html message}</span>
</div>

<style lang="scss">
  @use "sass:color";
  @use "../lib/styles/variables" as *;

  .alert-message {
    display: flex;
    align-items: center;
    padding: 8px;
    color: $white;
    font-size: 13px;
    margin-bottom: 10px;

    &.is-alert {
      border: 1px solid color.adjust($red, $lightness: 10%);
      background-color: $red;
    }

    &.is-warning {
      border: 1px solid color.adjust($gold, $lightness: 10%);
      background-color: $gold;
    }

    &.is-success {
      border: 1px solid color.adjust($green, $lightness: 10%);
      background-color: $green;
    }

    &.is-info {
      border: 1px solid color.adjust($blue-alt, $lightness: 10%);
      background-color: $blue-alt;
    }
  }

  .icon {
    margin-right: 8px;
    font-weight: bold;
  }
</style>
