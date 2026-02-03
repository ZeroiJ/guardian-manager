# GEMINI.md - Guardian Manager Protocol

> This file defines how the AI behaves in this workspace.

---

## 🚨 CRITICAL: AGENT & SKILL PROTOCOL

**MANDATORY:** Before writing code, you MUST check if a specific Agent (like `@destiny-cloudflare-architect`) or Skill (like `frontend-design`) applies.

### 1. Enforcement Protocol

1. **Activate:** Read Rules → Check Request Domain → Load Relevant Skill.
2. **Forbidden:** Never skip the "Socratic Gate" for complex tasks.

---

## 📥 REQUEST CLASSIFIER

**Classify the user request immediately:**

| Request Type     | Trigger Keywords                           | Action                      |
| ---------------- | ------------------------------------------ | --------------------------- |
| **QUESTION** | "what is", "how does", "explain"           | Text Response               |
| **SIMPLE CODE** | "fix", "add", "change" (single file)       | **Direct Edit** |
| **COMPLEX CODE** | "build", "create", "implement", "refactor" | **Socratic Gate Required** |
| **DESIGN/UI** | "design", "UI", "popup", "dashboard"       | **Use `frontend-design`** |
| **DESTINY DATA** | "stats", "perks", "manifest", "bungie"     | **Use `destiny-constants`** |

---

## 🤖 INTELLIGENT AGENT ROUTING

**Identify the domain before responding:**

1. **Frontend/UI:** Use `frontend-specialist` + `frontend-design`.
   * *Stack:* Vite, React, Tailwind, Framer Motion.
2. **Backend/Data:** Use `destiny-cloudflare-architect`.
   * *Stack:* Cloudflare Workers, D1, KV, Bungie API.
3. **Destiny Logic:** Use `destiny-constants` (Hashes, Manifests).

> **Rule:** If the user asks about "Stats" or "Perks", you MUST refer to `src/lib/destiny-constants.ts` or the `STAT_HASH_MAP`. Do NOT guess magic numbers.

---

## 🛑 SOCRATIC GATE (MANDATORY for "Complex Code")

**If the user asks to "Build X" or "Implement Y":**

1. **STOP.** Do not write code yet.
2. **ASK** 3 strategic questions to clarify the scope.
   * *Example:* "Should this popup handle mobile layouts?", "Do we need to cache this data?", "What happens if the API fails?"
3. **WAIT** for the user to confirm.

---

## 🧹 CLEAN CODE RULES (Tier 1)

1. **No Next.js:** This is a **Vite** project. Do not use `next/image`, `next/link`, or Server Actions.
2. **Icons:** Use `lucide-react`.
3. **Styling:** Tailwind CSS. Use `className`, not `style={{...}}`.
4. **Destiny Images:** Always handle 404s. Bungie images need the base URL `https://www.bungie.net`.

---

## 🧠 VISUAL DESIGN RULES (Tier 2)

> **Reference `@[skills/frontend-design]`**

1. **Dark Mode Only:** Default background `#15171e` (DIM Dark).
2. **Density:** Use `text-xs` or `text-sm`. Reduce padding (`p-1`, `p-2`).
3. **Feedback:** Buttons must have `hover:bg-white/10`.
4. **Data:** If a stat is missing, hide the bar. Do not show empty space.

---
