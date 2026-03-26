<script lang="ts">
  import Button from "../Button.svelte";

  const appVersion = chrome?.runtime?.getManifest?.().version || "dev";
  const githubUrl = "https://github.com/javijec/Kroxitrade";
</script>

<div class="about-page">
  <section class="hero">
    <p class="eyebrow">Kroxitrade</p>
    <h2>Trade tools that stay close to the action.</h2>
    <p class="lead">
      Kroxitrade extends the official Path of Exile trade site with a cleaner workflow for saving searches,
      revisiting them later, pinning interesting results, and reading extra context without leaving the page.
    </p>
  </section>

  <section class="section">
    <h3 class="section-heading">What It Helps With</h3>
    <div class="feature-list">
      <article class="feature-card">
        <h4>Bookmarks</h4>
        <p>Save searches into folders, archive old setups, import/export data, and keep your trading routes organized.</p>
      </article>

      <article class="feature-card">
        <h4>History</h4>
        <p>Jump back into recent trade searches without rebuilding filters from scratch every time.</p>
      </article>

      <article class="feature-card">
        <h4>Pinned Results</h4>
        <p>Keep standout listings visible while you compare prices, mods, or socket setups across the page.</p>
      </article>

      <article class="feature-card">
        <h4>Trade Enhancements</h4>
        <p>Extra helpers like stat highlighting, price equivalents, and page-title updates make scanning faster.</p>
      </article>
    </div>
  </section>

  <section class="section">
    <h3 class="section-heading">Open Source</h3>
    <p class="description">
      Kroxitrade is developed in the open. If you want to report bugs, suggest improvements, or contribute code,
      the GitHub repository is the best place to do it.
    </p>
    <Button href={githubUrl} theme="blue" label="Open GitHub Repository" />
  </section>

  <section class="section">
    <h3 class="section-heading">Built For</h3>
    <p class="description">
      The extension is focused on making Path of Exile trade less repetitive and more readable, while staying close
      to the feel of the original site instead of replacing it entirely.
    </p>
  </section>

  <div class="footer">
    <p class="disclaimer">Kroxitrade is an independent community project and is not affiliated with Grinding Gear Games.</p>
    <p class="version">Version {appVersion}</p>
  </div>
</div>

<style lang="scss">
  @use "../../lib/styles/variables" as *;

  .about-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 2px 2px 20px;
    color: $white;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
  }

  .hero {
    padding: 16px 14px;
    border: 1px solid rgba($gold, 0.2);
    background: 
      linear-gradient(135deg, rgba($gold, 0.08), rgba($gold, 0.01)),
      rgba($black, 0.4);
    box-shadow: inset 0 0 20px rgba($black, 0.5);
  }

  .eyebrow {
    margin: 0 0 6px;
    font-family: $primary-font;
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: $gold;
    opacity: 0.85;
  }

  h2 {
    margin: 0 0 8px;
    font-family: $primary-font;
    font-size: 20px;
    line-height: 1.1;
    color: $gold;
    text-shadow: 0 2px 4px rgba(0,0,0,0.4);
  }

  .lead,
  .description {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: rgba($white, 0.85);
    overflow-wrap: anywhere;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 10px;
    background-color: rgba($white, 0.015);
    border: 1px solid rgba($white, 0.06);
  }

  .section-heading {
    margin: 0 0 2px;
    font-family: $primary-font;
    font-size: 14px;
    color: rgba($gold, 0.9);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .feature-list {
    display: grid;
    gap: 8px;
  }

  .feature-card {
    padding: 8px 10px;
    border: 1px solid rgba($white, 0.06);
    background: 
      linear-gradient(90deg, rgba($white, 0.02) 0%, transparent 100%),
      rgba($white, 0.015);
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgba($white, 0.04);
      border-color: rgba($gold, 0.15);
    }

    h4 {
      margin: 0 0 3px;
      font-family: $primary-font;
      font-size: 13px;
      color: rgba($white, 0.95);
    }

    p {
      margin: 0;
      font-size: 12px;
      line-height: 1.45;
      color: rgba($white, 0.65);
      overflow-wrap: anywhere;
    }
  }

  .footer {
    margin-top: 8px;
    padding: 20px 10px;
    border-top: 1px solid rgba($white, 0.05);
    text-align: center;
    background-color: rgba($black, 0.2);
  }

  .disclaimer {
    margin: 0 0 10px;
    font-size: 11px;
    line-height: 1.4;
    color: rgba($white, 0.4);
    font-style: italic;
  }

  .version {
    margin: 0;
    font-size: 11px;
    color: rgba($white, 0.25);
    font-family: monospace;
  }
</style>
