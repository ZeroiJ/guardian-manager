# UI Revamp: Neo-Brutalist / Retro-Futurism

> **Status (2026-05-13):** Optional aesthetic backlog — **not** primary inventory work. Main product styling aligns with DIM density (`docs/DIM_UI_PATTERNS.md`). Checkboxes below remain largely **open**.

## Goal

Transform the Guardian Nexus UI into a "Futuristic Minimalist, Neo-Brutalist" experience inspired by `tavus.io`.

**Key aesthetics:**

- **Typography**: Mix of elegant Serif (Headings) and Tech Sans-Serif (Body).
- **Neo-Brutalism**: Visible borders, hard shadows, "Window" metaphors (title bars).
- **Glassmorphism**: Frosted glass backgrounds with distinct edges.
- **Animation**: Fluid entry, conversational hero section.

## Design system

### Typography

- **Headings**: `Playfair Display` or `Cinzel`.
- **Body/UI**: `Space Grotesk` or `Inter`.

### Color palette (dark)

- **Background**: `#050505` / `#0a0a0a`.
- **Surface**: `#111111` + `backdrop-blur`.
- **Borders**: `#333333` → `#ffffff` for emphasis.
- **Accents**: Void `#a359ff`, Solar `#ff6b00`, Arc `#00d4ff`, Primary `#ffffff`.

### Components

- **Hero**: Conversational layout, typing animation, floating cards.
- **Containers**: `border` + hard shadow + optional title bars.
- **Buttons**: Rectangular, uppercase, invert on hover.

## Implementation steps

### Phase 1: Foundation

1. Fonts — Google Fonts (`Playfair Display`, `Space Grotesk`).
2. Tailwind — extend fonts/colors.
3. Global CSS — noise texture and base styles.

### Phase 2: Landing page (hero)

1. Refactor landing hero to conversational layout (if/when a separate landing exists).
2. Animation — `framer-motion` or CSS.

### Phase 3: “Arsenal” / secondary surfaces

Legacy filenames (`Arsenal.jsx`, `WeaponGrid.jsx`) — apply window metaphor if those surfaces are revived.

## Phase 4: Visual polish (reference matching)

- [ ] Global styles — Tavus pink / acid green accents, stronger noise.
- [ ] Home-style hero (if applicable).
- [ ] Cross-page window aesthetic consistency.

## Phase 5: Cloudflare deployment notes

Historical checklist — project uses **Pages** + Functions; verify env vars (`BUNGIE_*`, `SESSION_SECRET`) in dashboard match deployment.

## Verification

- Visual pass vs reference moodboard.
- Responsive layouts preserved.
