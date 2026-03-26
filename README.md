# Kroxitrade

Kroxitrade is a browser extension built with Plasmo, Svelte and TypeScript that augments the official Path of Exile trade site with:

- bookmark folders and search history
- pinned item cards for the current session
- search-result enhancements such as stat highlighting
- poe.ninja currency equivalents through the background script
- dynamic page-title updates based on the current search

## Development

Install dependencies and run the extension in development mode:

```bash
npm install
npm run dev
```

Load the generated development build from `build/chrome-mv3-dev` in your browser.

## Build

```bash
npm run build
```

## Project structure

- `contents/index.svelte`: main content script injected into the trade site
- `components/`: sidebar UI and page-level Svelte components
- `lib/services/`: domain logic for bookmarks, trade location, poe.ninja, storage and page enhancements
- `background.ts`: background worker used for extension messaging and external fetches
- `assets/`: extension branding and bookmark-folder imagery

See `docs/ARCHITECTURE.md` for a short technical map of the current codebase.
