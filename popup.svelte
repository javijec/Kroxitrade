<script lang="ts">
  const tradeUrl = "https://www.pathofexile.com/trade/search/Standard";
  const githubUrl = "https://github.com/javijec/better-trading";
</script>

<main class="popup-shell">
  <p class="eyebrow">Kroxitrade</p>
  <h1>Trade tools directly inside Path of Exile Trade</h1>
  <p class="description">
    Open the official trade site to use bookmarks, pinned items, title enhancements and price helpers.
  </p>

  <div class="actions">
    <a class="button is-gold" href={tradeUrl} target="_blank" rel="noopener">Open Trade</a>
    <a class="button is-blue" href={githubUrl} target="_blank" rel="noopener">GitHub</a>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    background:
      radial-gradient(circle at top, rgba(180, 142, 76, 0.22), transparent 45%),
      linear-gradient(180deg, #1a1610 0%, #090909 100%);
    color: #f4efe6;
    font-family: Georgia, "Times New Roman", serif;
  }

  .popup-shell {
    width: 320px;
    padding: 18px;
  }

  .eyebrow {
    margin: 0 0 8px;
    font-size: 11px;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: #d0ad66;
  }

  h1 {
    margin: 0 0 10px;
    font-size: 24px;
    line-height: 1.05;
  }

  .description {
    margin: 0;
    font-size: 14px;
    line-height: 1.45;
    color: rgba(244, 239, 230, 0.8);
  }

  .actions {
    display: flex;
    gap: 10px;
    margin-top: 18px;
  }

  .button {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid transparent;
    text-align: center;
    text-decoration: none;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.03em;
  }

  .is-gold {
    background: linear-gradient(180deg, #d4b06a 0%, #8c6831 100%);
    color: #111;
    border-color: #cfb173;
  }

  .is-blue {
    background: linear-gradient(180deg, #2b4457 0%, #162634 100%);
    color: #f4efe6;
    border-color: #446177;
  }
</style>
