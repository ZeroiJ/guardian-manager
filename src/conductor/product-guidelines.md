# Product Guidelines - Guardian Manager

## Prose Style & Tone
- **Voice:** Professional, Technical, and Direct.
- **Terminology:** Use precise Destiny 2 and developer terminology (e.g., "Item Hash," "Plug Set," "Stat Tier," "Loadout Permutation").
- **Clarity:** Avoid "lore fluff." Focus on delivering actionable information quickly. Error messages should be specific and technical (e.g., "Bungie API 503 Service Unavailable" instead of "The Architects are angry").

## Visual Identity & UX
- **Core Philosophy:** "The DIM Standard, refined." Replicate the familiar, high-density layout and interaction patterns of Destiny Item Manager but rebuild them for superior performance.
- **Layout:**
    - **Dense Grids:** Prioritize showing as many items as possible on screen.
    - **Information Hierarchy:** Key stats (Power, Element, Masterwork) must be visible on the item tile itself without hovering.
- **Interactions:**
    - **Drag-and-Drop:** This is the primary method for moving items. It must be fluid and responsive.
    - **Optimistic UI:** Actions (like moving an item) should reflect instantly in the UI. If the API call fails later, the UI should gracefully roll back with a notification.
- **Aesthetic:**
    - **Theme:** "Destiny Dark" (`bg-slate-950`). Use the official rarity colors (Exotic Gold, Legendary Purple, Rare Blue) for borders and accents.
    - **Icons:** Use official Bungie assets for weapons, armor, and mods.

## Development Standards (from Architect Rules)
- **Code Quality:** Strict TypeScript with zero `any`.
- **Performance:** Main thread must never drop below 60fps. Use Web Workers for heavy lifting (loadout calculation, sorting).
- **Data Integrity:** The "Zipper" model is paramount—always ensure the UI clearly distinguishes between "Live" Bungie data and "Local" user metadata.
