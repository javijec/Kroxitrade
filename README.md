<div align="center">
  <img src="assets/logo.png" alt="Kroxitrade Logo" width="120" />
  <h1>Kroxitrade Companion</h1>
  <p><em>The Ultimate Premium Extension for Path of Exile Trade</em></p>
</div>

---

**Kroxitrade** is a lightning-fast, highly-optimized browser extension designed to sit natively inside the official Path of Exile trade site. Built with modern web technologies (**Plasmo**, **Svelte**, and **TypeScript**), it completely revamps the trading workflow with a cohesive, dark-gold aesthetic that matches the in-game experience.

## ✨ Key Features

- 📁 **Advanced Bookmarking & Folders:** Save and organize complex item searches with ease.
- 🖱️ **Fluid Drag & Drop:** Native HTML5 drag-and-drop system to instantly reorder your nested folders and bookmarks without friction.
- ✏️ **Seamless Inline Editing:** Rename your folders and searches natively within the UI (no more intrusive browser prompts!).
- 🔍 **Finer Filters Integration:** Specialized native filters deeply integrated with the Path of Exile API for advanced item scouting.
- 🌙 **Premium "Wraeclast" Aesthetic:** A carefully crafted dark-mode UI with glassmorphism effects, neon-gold hover states, and smooth Svelte micro-animations.
- 📐 **Smart Responsive Layout:** The extension panel can be minimized into a sleek floating pill. Using real-time CSS variable injection, the Path of Exile website automatically re-centers and expands to give you 100% of your screen real estate back.
- 🔔 **Non-Obstructive Notifications:** Elegant floating toast notifications that inform you of actions (savings, deletions, copies) without shifting the page layout.

---

## 🛠️ Architecture & Tech Stack

The extension leverages a robust modern stack to ensure peak performance:
- **Plasmo Framework** for streamlined cross-browser MV3 extension architecture.
- **Svelte 4** for reactive, lightweight, and component-driven UI inside isolated shadow DOMs.
- **TypeScript** for type-safe domain logic and robust interactions with the PoE API.
- **Sass (Dart Sass)** for complex theming and dynamic CSS transformations.

### Directory Structure

```text
📁 assets/          # Extension branding and imagery
📁 components/      # Svelte UI (Layout, Header, Bookmarks, and floating primitives)
📁 contents/        # Main content scripts securely injected into the trade site's DOM
📁 lib/
  ├── services/    # Business logic (Bookmarks, History, Trade Location, Storage)
  ├── styles/      # Global SCSS variables, themes, and dynamic site adjustments
  └── utilities/   # Helpers (Clipboard APIs, URL parsing, ID generation)
```

See `docs/ARCHITECTURE.md` for a deeper dive into the messaging bus and storage mechanics.

---

## 🚀 Development Setup

Want to contribute or customize Kroxitrade for your own needs?

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run in Development Mode (Hot Reloading):**
   ```bash
   npm run dev
   ```
   > *Load the generated development build from `build/chrome-mv3-dev` into your browser's extension page.*

3. **Build across browsers:**
   ```bash
   npm run build
   ```

## ⚖️ License
Personal project. Built by exiles, for exiles.
