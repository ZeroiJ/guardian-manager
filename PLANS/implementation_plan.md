# UI Revamp: Neo-Brutalist / Retro-Futurism

## Goal
Transform the Guardian Nexus UI into a "Futuristic Minimalist, Neo-Brutalist" experience inspired by `tavus.io`.
**Key Aesthetics**:
- **Typography**: Mix of elegant Serif (Headings) and Tech Sans-Serif (Body).
- **Neo-Brutalism**: Visible borders, hard shadows, "Window" metaphors (title bars).
- **Glassmorphism**: Frosted glass backgrounds with distinct edges.
- **Animation**: Fluid entry, conversational hero section.

## Design System

### 1. Typography
- **Headings**: `Playfair Display` or `Cinzel` (Elegant, distinct).
- **Body/UI**: `Space Grotesk` or `Inter` (Readable, tech-forward).

### 2. Color Palette (Dark Mode Adaptation)
- **Background**: `#050505` (Deep Black) or `#0a0a0a` (Noise texture).
- **Surface**: `#111111` (Dark Grey) with `backdrop-blur`.
- **Borders**: `#333333` (Subtle) to `#ffffff` (High Contrast for active elements).
- **Accents**:
    - **Void**: `#a359ff` (Neon Purple)
    - **Solar**: `#ff6b00` (Neon Orange)
    - **Arc**: `#00d4ff` (Cyan)
    - **Primary**: `#ffffff` (Stark White)

### 3. Components

#### Hero Section (Conversational)
- **Concept**: "Talk to your Guardian".
- **Visuals**: Large Serif text, typing animation, floating "cards" or "windows" showcasing items.
- **Interaction**: A "Get Started" button that feels like a physical switch or a command prompt.

#### Containers (Windows)
- Style:
  ```css
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.5); /* Hard Shadow */
  backdrop-filter: blur(16px);
  ```
- **Title Bars**: Distinct top section for "Inventory", "Vault", etc.

#### Buttons
- **Style**: Rectangular, uppercase, hard borders.
- **Hover**: Invert colors or shift shadow position.

## Implementation Steps

### Phase 1: Foundation
1.  **Fonts**: Add Google Fonts (`Playfair Display`, `Space Grotesk`).
2.  **Tailwind**: Extend config with new fonts and colors.
3.  **Global CSS**: Add noise texture and base styles.

### Phase 2: Landing Page (Hero)
# UI Revamp: Neo-Brutalist / Retro-Futurism

## Goal
Transform the Guardian Nexus UI into a "Futuristic Minimalist, Neo-Brutalist" experience inspired by `tavus.io`.
**Key Aesthetics**:
- **Typography**: Mix of elegant Serif (Headings) and Tech Sans-Serif (Body).
- **Neo-Brutalism**: Visible borders, hard shadows, "Window" metaphors (title bars).
- **Glassmorphism**: Frosted glass backgrounds with distinct edges.
- **Animation**: Fluid entry, conversational hero section.

## Design System

### 1. Typography
- **Headings**: `Playfair Display` or `Cinzel` (Elegant, distinct).
- **Body/UI**: `Space Grotesk` or `Inter` (Readable, tech-forward).

### 2. Color Palette (Dark Mode Adaptation)
- **Background**: `#050505` (Deep Black) or `#0a0a0a` (Noise texture).
- **Surface**: `#111111` (Dark Grey) with `backdrop-blur`.
- **Borders**: `#333333` (Subtle) to `#ffffff` (High Contrast for active elements).
- **Accents**:
    - **Void**: `#a359ff` (Neon Purple)
    - **Solar**: `#ff6b00` (Neon Orange)
    - **Arc**: `#00d4ff` (Cyan)
    - **Primary**: `#ffffff` (Stark White)

### 3. Components

#### Hero Section (Conversational)
- **Concept**: "Talk to your Guardian".
- **Visuals**: Large Serif text, typing animation, floating "cards" or "windows" showcasing items.
- **Interaction**: A "Get Started" button that feels like a physical switch or a command prompt.

#### Containers (Windows)
- Style:
  ```css
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.5); /* Hard Shadow */
  backdrop-filter: blur(16px);
  ```
- **Title Bars**: Distinct top section for "Inventory", "Vault", etc.

#### Buttons
- **Style**: Rectangular, uppercase, hard borders.
- **Hover**: Invert colors or shift shadow position.

## Implementation Steps

### Phase 1: Foundation
1.  **Fonts**: Add Google Fonts (`Playfair Display`, `Space Grotesk`).
2.  **Tailwind**: Extend config with new fonts and colors.
3.  **Global CSS**: Add noise texture and base styles.

### Phase 2: Landing Page (Hero)
1.  **Refactor `Home`**: Replace current hero with a "Conversational" layout.
2.  **Animation**: Add `framer-motion` (if available) or CSS animations for floating elements.

### Phase 3: Arsenal UI
1.  **Refactor `Arsenal.jsx`**: Apply "Window" container styles to the sidebar and main content.
2.  **Refactor `WeaponGrid.jsx`**: Update grid containers to look like "Inventory Slots" (retro-tech style).
3.  **Refactor `ItemCard.jsx`**: Clean up the card to fit the brutalist theme (less rounded, more bordered).

## Phase 4: Visual Polish (Reference Matching)
- [ ] **Global Styles**:
    - [ ] Update color palette to include "Tavus Pink" (#ff90e8) and "Acid Green" (#00ff00) for accents.
    - [ ] Refine "Noise" texture to be more visible/dithered.
- [ ] **Home Component**:
    - [ ] Match the "You've never met AI like this" layout exactly.
    - [ ] Style buttons with the signature "Pink + Hard Shadow" look.
    - [ ] Refine floating windows to look like OS windows (white/grey backgrounds, distinct title bars).
- [ ] **Arsenal Component**:
    - [ ] Ensure consistency with the Home page "Window" aesthetic.

## Phase 5: Cloudflare Deployment Fix
- [ ] **Project Configuration (CRITICAL)**
    - [ ] **Delete** any existing "Worker" project for `guardian-manager`.
    - [ ] Create a **New Application** > **Pages** (Not Worker).
    - [ ] **Settings**:
        - **Framework Preset**: `Vite`
        - **Build Command**: `npm run build`
        - **item Output Directory**: `dist`
    - [ ] **Environment Variables**:
        - `BUNGIE_CLIENT_ID`
        - `BUNGIE_CLIENT_SECRET`
        - `BUNGIE_API_KEY`
        - `SESSION_SECRET`

## Verification
- Visual check against the "Tavus" vibe (Clean, structured, elegant but raw).
- Ensure responsiveness is maintained.
