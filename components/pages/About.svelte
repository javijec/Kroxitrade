<script lang="ts">
  import { languageStore, translate } from "../../lib/services/i18n";
  import { hasValidExtensionContext } from "../../lib/utilities/extension-context";

  const version = hasValidExtensionContext() ? chrome.runtime.getManifest().version : "dev"
</script>

<section class="about-page">
  <header class="hero">
    <div class="eyebrow">{translate($languageStore, "about.eyebrow")}</div>
    <h1>Poe Trade Plus</h1>
    <p>
      {translate($languageStore, "about.description")}
    </p>
  </header>

  <footer class="about-footer">
    <p class="about-footer__credit">
      {translate($languageStore, "about.github")} <a href="https://github.com/KroxiLabs/Kroxitrade" target="_blank" rel="noreferrer"><strong>Poe Trade Plus</strong></a>
    </p>
    <p class="about-footer__meta">{translate($languageStore, "about.version", { version })}</p>
  </footer>
</section>

<style>
  .about-page {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: 100%;
    color: #d8c7a7;
  }

  .hero,
  .card {
    border: 1px solid rgba(168, 129, 73, 0.24);
    background: linear-gradient(180deg, rgba(17, 16, 14, 0.96), rgba(9, 9, 8, 0.96));
    box-shadow: inset 0 1px 0 rgba(255, 226, 178, 0.04);
  }

  .hero {
    padding: 16px;
  }

  .eyebrow {
    margin-bottom: 6px;
    color: #b88a47;
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    color: #f1dfbe;
    font-weight: 700;
  }

  h1 {
    font-size: 20px;
  }

  p {
    margin: 8px 0 0;
    color: #cbb694;
    font-size: 11px;
    line-height: 1.55;
  }

  .credit {
    color: #dfc592;
  }

  .about-footer {
    margin-top: auto;
    padding: 4px 4px 0;
  }

  .about-footer__credit,
  .about-footer__meta {
    margin-top: 0;
    font-size: 10px;
    line-height: 1.45;
    color: rgba(203, 182, 148, 0.58);
  }

  .about-footer__credit a {
    color: rgba(240, 224, 191, 0.82);
    text-decoration: none;
  }

  .about-footer__credit a:hover,
  .about-footer__credit a:focus-visible {
    color: #f0e0bf;
    text-decoration: underline;
    outline: none;
  }

  .about-footer__meta {
    margin-top: 4px;
    color: rgba(203, 182, 148, 0.44);
  }
</style>
