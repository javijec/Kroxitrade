<div align="center">
  <img src="assets/logo.png" alt="Poe Trade Plus Logo" width="120" />
  <h1>Poe Trade Plus Companion</h1>
  <p><em>Browser extension for a faster, cleaner Path of Exile Trade workflow</em></p>
</div>

---

**Poe Trade Plus** is a browser extension that injects a native companion sidebar into the official Path of Exile trade site. It combines bookmark management, search history, search-result enhancements, and quality-of-life trading tools in a single Svelte + TypeScript extension built with Plasmo.

The project currently focuses on making recurring trade searches easier to save, revisit, compare, and navigate without leaving the official site.

## Features

### Sidebar workflow

- **Integrated trade sidebar:** Poe Trade Plus mounts directly inside `pathofexile.com/trade`.
- **Resizable layout:** the sidebar width can be adjusted and persisted locally.
- **Minimize and restore mode:** collapse the panel into a floating pill to recover screen space.
- **Left or right docking:** choose which side of the trade site the panel should live on.
- **Trade-site-aware layout shift:** the page adapts to the sidebar width so the official site remains usable.

### Bookmarks and folders

- **Version-aware folders:** bookmarks are separated by Path of Exile trade version.
- **Folder creation and inline organization:** create, rename, expand, collapse, archive, and delete folders in place.
- **Drag and drop reordering:** reorder folders and searches without leaving the panel.
- **Per-folder import:** paste a serialized folder string and restore it instantly.
- **Backup and restore:** export all folders to a `.txt` backup file and restore them later.
- **Archived view:** switch between active and archived folders without losing saved searches.

### Search history and navigation

- **Automatic trade history:** visited searches are tracked and stored locally.
- **Active-tab integration:** reopening a saved history entry updates the current trade tab instead of spawning extra tabs.
- **Version filtering:** history entries are filtered to the currently detected trade version.

### Result enhancements

- **Equivalent pricing:** optionally show chaos and divine equivalents using live `poe.ninja` currency ratios.
- **Search-stat highlighting:** active stat filters are highlighted in the result list.
- **Socket breakpoint warnings:** armor results can display max-socket warnings based on item level.
- **Scroll back to result:** pinned-result navigation can scroll the active result list to a specific item.

### Filter helpers

- **Finer Filters integration:** add or exclude modifiers directly from hovered result stats.
- **Grouped quick actions:** includes pseudo and explicit presets such as resistance/life, attack weapon, and spell weapon filters.
- **Regex-friendly search inputs:** native trade-site search inputs automatically get the `~` prefix when appropriate.

### Settings and local persistence

- **Sidebar position preference**
- **Equivalent pricing visibility toggle**
- **Persistent sidebar width**
- **Local browser storage for settings, folders, and history**
- **Ephemeral caching for `poe.ninja` currency ratios**

## Tech Stack

- **Plasmo** for browser extension structure and MV3 integration
- **Svelte 4** for the injected UI
- **TypeScript** for extension and domain logic
- **Sass** for theming and trade-site layout enhancements
- **Chrome Extension APIs** for storage, tab coordination, and background requests

## Project Structure

```text
assets/              Branding assets
components/          Svelte UI components and panel pages
contents/            Content scripts injected into the trade site
lib/services/        Bookmarks, trade tracking, settings, result enhancements, poe.ninja
lib/styles/          Base and enhancement styles for the site and sidebar
lib/types/           Shared TypeScript models
lib/utilities/       Small helpers for URLs, IDs, clipboard, dates, and parsing
scripts/             Build/version helper scripts
background.ts        Background bridge for poe.ninja requests
popup.svelte         Extension popup entry
```

See `docs/ARCHITECTURE.md` for a deeper architectural overview if you want to explore the internal services and messaging flow.

## Development

### Requirements

- Node.js
- npm

### Install dependencies

```bash
npm install
```

### Run development build

```bash
npm run dev
```

Load the generated development output from `build/chrome-mv3-dev` in your browser's extensions page.

### Production build

```bash
npm run build
```

This build step also runs the local version bump script before generating the final extension bundle.

The unpacked production extension is generated in `build/chrome-mv3-prod`.

### Package the extension

```bash
npm run package
```

This command creates a zip file in `build/` such as `Poe Trade Plus-1.0.58.zip`, using the contents of `build/chrome-mv3-prod`.

## Permissions and Integrations

- `storage`: persists folders, settings, history, and cache data
- `tabs`: detects and updates the active Path of Exile trade tab
- `https://www.pathofexile.com/*`: injects the sidebar and trade helpers
- `https://poe.ninja/*`: fetches currency ratios for equivalent pricing

## Credits

This project is based on or incorporates ideas/material from:

- [better-trading](https://github.com/exile-center/better-trading)
- [poe-trade-plus](https://github.com/KroxiLabs/poe-trade-plus/)

## Privacy policy

We do not save nor require any data from the end user, if this extension ever uses data from a user will be saved LOCALLY and we won't have any way whatsoever to access it.

## License

Licensed under the **MIT License**.

See the [LICENSE](LICENSE) file for the full license text and notices.
