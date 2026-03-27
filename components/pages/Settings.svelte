<script lang="ts">
  import { settings, type SidebarSide } from "../../lib/services/settings";
  import Button from "../Button.svelte";
  import { onMount } from "svelte";

  async function handleSideChange(side: SidebarSide) {
    await settings.updateSide(side);
  }

  onMount(async () => {
    await settings.load();
  });
</script>

<div class="settings-page">
  <section class="settings-section">
    <h3 class="section-title">Sidebar Position</h3>
    <p class="section-description">Choose which side of the screen you want the Kroxitrade panel to appear.</p>
    
    <div class="side-selector">
      <Button 
        label="Left Side" 
        theme={$settings.sidebarSide === 'left' ? 'gold' : 'blue'}
        class="side-btn"
        onClick={() => handleSideChange('left')}
      />
      <Button 
        label="Right Side" 
        theme={$settings.sidebarSide === 'right' ? 'gold' : 'blue'}
        class="side-btn"
        onClick={() => handleSideChange('right')}
      />
    </div>
  </section>

  <section class="settings-section info">
    <h3 class="section-title">About Settings</h3>
    <p class="section-description">These settings are saved locally in your browser and will persist across sessions.</p>
  </section>
</div>

<style lang="scss">
  @use "sass:color";
  @use "../../lib/styles/variables" as *;

  .settings-page {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 5px;
    color: $white;
    animation: fade-in 0.3s ease;
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .settings-section {
    background: rgba($white, 0.02);
    border: 1px solid rgba($white, 0.06);
    padding: 16px;
    border-radius: 4px;

    &.info {
      background: rgba($blue, 0.05);
      border-color: rgba($blue, 0.2);
    }
  }

  .section-title {
    margin: 0 0 8px;
    font-family: $primary-font;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: $gold;
  }

  .section-description {
    margin: 0 0 16px;
    font-size: 12px;
    color: rgba($white, 0.6);
    line-height: 1.5;
  }

  .side-selector {
    display: flex;
    gap: 10px;
  }

  :global(.side-btn) {
    flex: 1;
  }
</style>
