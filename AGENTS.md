<!-- codebase-memory-mcp:start -->
# Codebase Knowledge Graph (codebase-memory-mcp)

This project uses codebase-memory-mcp to maintain a knowledge graph of the codebase.
ALWAYS prefer MCP graph tools over grep/glob/file-search for code discovery.

## Priority Order
1. `search_graph` - find functions, classes, routes, variables by pattern
2. `trace_path` - trace who calls a function or what it calls
3. `get_code_snippet` - read specific function/class source code
4. `query_graph` - run Cypher queries for complex patterns
5. `get_architecture` - high-level project summary

## When to fall back to grep/glob
- Searching for string literals, error messages, config values
- Searching non-code files (Dockerfiles, shell scripts, configs)
- When MCP tools return insufficient results

## Examples
- Find a handler: `search_graph(name_pattern=".*OrderHandler.*")`
- Who calls it: `trace_path(function_name="OrderHandler", direction="inbound")`
- Read source: `get_code_snippet(qualified_name="pkg/orders.OrderHandler")`
<!-- codebase-memory-mcp:end -->

# Extension Rules

## Package Manager
- Always use `pnpm` for package management and script execution. Do not use `npm` or `npm.cmd`.

## Subagent Collaboration
- Use subagents for independent, bounded work that can proceed in parallel, such as investigating separate areas, implementing isolated components, or performing an independent review/test pass.
- Keep small, tightly coupled changes with the primary agent; do not delegate merely to add process overhead.
- Before parallel edits, assign each subagent a clearly separate file or responsibility boundary. The primary agent remains responsible for integrating changes and running final verification.
- Do not delegate work that requires a user decision, external authorization, or access beyond the task's scope.

## Translations
- Every new user-facing text created for this extension must be added for every supported language by default.
- Do not add UI text only to English or Spanish and rely on fallback text.
- Update all locale files under `lib/services/i18n/`: `en.ts`, `es.ts`, `pt.ts`, `ru.ts`, `th.ts`, `de.ts`, `fr.ts`, `ja.ts`, `ko.ts`, `zh-cn.ts`, and `zh-tw.ts`.
- This applies to settings, buttons, tooltips, aria labels, flash messages, popup text, sidebar text, What's New copy, and release-facing text inside the app.

## Release Notes
- Experimental features and dev-only changes must not appear in changelogs or What's New.
- What's New must keep all changes for the active minor version line. For example, all `1.1.x` changes stay grouped together until the version moves to a new minor line such as `1.2.x`.
