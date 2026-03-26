<script lang="ts">
  import Button from "../Button.svelte";
  const appVersion = "2.0.0 (Simplified)";
  const githubUrl = "https://github.com/javijec/better-trading";
</script>

<div class="about-page">
  <section class="section">
    <h2 class="section-heading">Enhancements</h2>
    <p class="description">
        All enhancements (PoE Ninja Pricing, Stat Highlighting, Item Pinning) are active by default in this simplified version.
    </p>
  </section>

  <section class="section">
    <h2 class="section-heading">GitHub</h2>
    <p class="description">
      Kroxitrade is an open-source project. You can find the source code and contribute on GitHub.
    </p>
    <Button 
        href={githubUrl}
        theme="blue"
        label="View on GitHub"
    />
  </section>

  <section class="section">
    <h2 class="section-heading">Credits</h2>
    <p class="description">
      Originally created by <b>@javijec</b> and improved by the community. 
      Ported to Plasmo + Svelte for a faster, lighter experience.
    </p>
  </section>

  <div class="footer">
    <p class="disclaimer">Not affiliated with Grinding Gear Games.</p>
    <p class="version">v{appVersion}</p>
  </div>
</div>

<style lang="scss">
  @use "../../lib/styles/variables" as *;

  .about-page {
    padding: 10px 5px;
    color: $white;
    font-family: $default-font;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    overflow-x: hidden;
    box-sizing: border-box;
  }

  .section {
    margin-bottom: 25px;
  }

  .section-heading {
    font-family: $primary-font;
    font-size: 18px;
    margin-bottom: 8px;
    color: $gold;
  }

  .description {
    font-size: 13px;
    line-height: 1.4;
    margin-bottom: 12px;
    color: rgba($white, 0.8);
    overflow-wrap: anywhere;
  }

  .footer {
    margin-top: 40px;
    text-align: center;
    border-top: 1px solid rgba($white, 0.1);
    padding-top: 20px;
  }

  .disclaimer {
    font-size: 11px;
    color: rgba($white, 0.5);
    margin-bottom: 5px;
  }

  .version {
    font-size: 12px;
    color: rgba($white, 0.3);
  }
</style>
