<script lang="ts">
  const tradeLinks = [
    {
      label: "PoE 1 Trade",
      href: "https://www.pathofexile.com/trade/search",
      logo: poe1Logo,
      logoAlt: "Path of Exile Trade"
    },
    {
      label: "PoE 2 Trade",
      href: "https://www.pathofexile.com/trade2/search/poe2",
      logo: poe2Logo,
      logoAlt: "Path of Exile 2 Trade"
    }
  ]
  import poe1Logo from "data-base64:./assets/logo-trade.png"
  import poe2Logo from "data-base64:./assets/logo-trade2.png"
</script>

<svelte:head>
  <title>Kroxitrade</title>
</svelte:head>

<div class="popup-shell">
  <div class="hero">
    <p>Kroxitrade adds faster navigation and trading helpers to the official Path of Exile trade site.</p>
  </div>

  <div class="trade-grid">
    {#each tradeLinks as link}
      <a class="trade-link" href={link.href} target="_blank" rel="noreferrer">
        <span class="trade-link__logo-wrap">
          <img class="trade-link__logo" src={link.logo} alt={link.logoAlt} />
        </span>
        <span class="trade-link__label">{link.label}</span>
      </a>
    {/each}
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    min-width: 300px;
    background:
      radial-gradient(circle at top left, rgba(184, 124, 52, 0.18), transparent 38%),
      linear-gradient(180deg, #0f0d0b 0%, #070707 100%);
    color: #f0dfbd;
    font-family: Georgia, "Times New Roman", serif;
  }

  .popup-shell {
    padding: 14px;
  }

  .hero {
    margin-bottom: 10px;
    padding: 10px 12px;
    border: 1px solid rgba(173, 132, 72, 0.18);
    background: linear-gradient(180deg, rgba(23, 20, 17, 0.9), rgba(12, 11, 10, 0.95));
  }

  p {
    margin: 0;
    color: #bca887;
    font-size: 11px;
    line-height: 1.45;
  }

  .trade-grid {
    display: flex;
    gap: 8px;
  }

  .trade-link {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px 10px;
    border: 1px solid rgba(188, 145, 77, 0.16);
    background: linear-gradient(180deg, rgba(24, 21, 18, 0.94), rgba(14, 13, 12, 0.98));
    color: inherit;
    text-decoration: none;
    transition:
      border-color 120ms ease,
      background 120ms ease,
      transform 120ms ease;
  }

  .trade-link:hover,
  .trade-link:focus-visible {
    transform: translateY(-1px);
    border-color: rgba(238, 199, 130, 0.32);
    background: linear-gradient(180deg, rgba(31, 27, 22, 0.96), rgba(16, 15, 13, 0.99));
    outline: none;
  }

  .trade-link__logo-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    width: 100%;
  }

  .trade-link__logo {
    display: block;
    height: 30px;
    width: auto;
    object-fit: contain;
    max-width: 100%;
  }

  .trade-link__label {
    display: block;
    color: #f1e1bf;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    text-align: center;
  }
</style>
