# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

No build step — open `index.html` directly in a browser, or use VS Code Live Server to avoid CORS issues with local file loading.

## Architecture

Pure vanilla frontend (HTML/CSS/JS), no framework, no bundler, no dependencies. Data comes from [PokéAPI v2](https://pokeapi.co/api/v2) — free, no auth required.

### Files

- `index.html` — Single page shell: header, type filter bar, card grid (left), detail panel (right)
- `app.js` — All application logic (~718 lines)
- `style.css` — All styles (~800 lines), uses CSS custom properties for theming

### State & Data Flow (`app.js`)

Global state: `allPokemon[]`, `filteredPokemon[]`, `activeType`, `searchTerm`, `currentId`, `cache{}`.

Key flows:
- **Loading:** `loadGen(start, end)` fetches Pokémon by ID range in parallel batches of 20, calling `applyFilters()` progressively as results arrive. Eight generations are available (IDs 1–905). Gen I loads automatically on startup.
- **Filtering:** `applyFilters()` filters `allPokemon` by `activeType` and `searchTerm`, then calls `renderGrid()`.
- **Detail panel:** `showDetail(id)` fetches `pokemon` + `pokemon-species` endpoints in parallel (with in-memory cache), then calls `renderDetail()` and `loadEvolutions()`.
- **Type effectiveness:** `calcWeaknesses(types)` computes multipliers using a hardcoded type chart constant.

### CSS Patterns

Dark theme via CSS variables (`#080c10` bg, `#4af0c4` accent). Mobile breakpoint at 820px — detail panel becomes a bottom drawer. Type badge colors are applied inline via JS using the `TYPE_COLORS` constant in `app.js`.
