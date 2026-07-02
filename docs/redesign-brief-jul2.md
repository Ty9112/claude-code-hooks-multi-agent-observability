# Mission Control Front-End Redesign — Brief

**Date:** 2026-07-02
**Scope:** Gate Stages 0-2 (classification, reuse inventory, library weigh-in) + visual baseline capture for Stage 4 regression diffing. No component code was edited to produce this brief.
**Repo:** `claude-code-hooks-multi-agent-observability` (Tyler's fork of the multi-agent observability dashboard, internally branded "Mission Control")
**Client app:** `apps/client` — Vue 3.5 + Tailwind 3.4 + Vite 7, 26 components, live at `http://localhost:5173/` against the WebSocket API on `:4000`.

---

## Stage 0 — Classification + Token Map

### Classification: Internal Tool Fork

Mission Control is a **Vue/Tailwind internal tool**, not a static HTML report or a from-scratch web property. That means:

- **Harris SOP color palette, typography, and square-corner rule apply as the SKIN** — every hex value and corner radius should trace to a Harris token.
- **Framework and build-chain rules do NOT apply.** Vue 3 + Vite stays. This is not a "no build step, vanilla JS" surface like the Hub or the Fabrication consoles — the harris-ui.css vanilla-CSS SOP is a *source of token values*, not a literal file to `<link>` in. Values get re-expressed as a Tailwind theme extension and CSS custom properties, matching how the app already works.
- **The app's existing theme-switching architecture is legitimate and should be preserved**, not replaced with the Document SOP's "one light file + one dark file" pattern. Mission Control already ships a `useThemes.ts` composable (848 lines) with 12 selectable named themes (Harris Mission Control, Light, Dark, Modern, Earth, Glass, High Contrast, Dark Blue, Colorblind Friendly, Ocean, Midnight Purple, Sunset Orange, Mint Fresh) plus custom-theme creation via `ThemeManager.vue`. Forcing that down to a binary light/dark toggle would be a regression, not a redesign. The Harris-compliant move is: tighten the existing `harris-mission-control` theme to exact Harris token values (below), keep it as the shipped default, and leave the other 11 presets as user-selectable extras — they're an app feature, not brand-controlled collateral.

### Token map: harris-ui.css / colors_and_type.css → Tailwind theme extension

Mission Control already has a **`harris-mission-control` theme** defined in `useThemes.ts:18-51` — someone started this work. It gets the accent color exactly right but drifts everywhere else from the canonical dark-mode values in `colors_and_type.css:181-197` and the CLAUDE.md dark-mode spec. This is the concrete diff to close:

| Token | Current `harris-mission-control` (`useThemes.ts`) | Harris canonical dark value | Verdict |
|---|---|---|---|
| `primary` (accent) | `#29ADE4` | `#29ADE4` | Already correct |
| `bgPrimary` | `#0a0c0e` | `#0f1117` | Retune |
| `bgSecondary` | `#0f1317` | `#161822` | Retune |
| `bgTertiary` | `#141a20` | `#1e2030` | Retune |
| `textPrimary` | `#e8f4ff` | `#e4e4e7` | Retune |
| `textTertiary`/`textQuaternary` | `#5a7a8e` / `#3d5568` | `#9ca3af` (single muted tier) | Collapse to one muted token |
| `borderPrimary`/`borderSecondary` | `#1e2c38` / `#2a4055` | `#2a2d3a` | Retune |
| `accentSuccess`/`Warning`/`Error`/`Info` | `#00e57a` / `#ffaa00` / `#ff3f5a` / `#00c8ff` | sanctioned data-viz trio: `#16a34a` / `#d97706` / `#dc2626` (+ blue for info) | Retune — these are currently invented hex, not the sanctioned "Apps only" data-viz extensions in `colors_and_type.css:118-121` |

Proposed `tailwind.config.js` addition (additive — the existing `theme.extend.colors.theme.*` var-driven system stays as the indirection layer, only the CSS custom-property *values* the `harris-mission-control` theme writes need to change):

```js
// tailwind.config.js theme.extend — new static Harris tokens for one-off non-themed chrome
colors: {
  harris: {
    blue: '#29ADE4',
    navy: '#0F1934',
    gray: '#4D4C55',
    'gray-light': '#BBBDC0',
    orange: '#F2612E',   // accent only, sparingly, marketing-approval gated
  },
},
borderRadius: {
  none: '0px',
  'nav-pill': '4px',    // the only permitted radius besides the toggle
  toggle: '12px',
},
```

The categorical chart palette (`#29ADE4 #00c8ff #00e57a #ffaa00 #ff3f5a #a855f7 #14b8a6 #f97316 #ec4899 #6366f1`, used in `ToolAnalytics.vue:154-157` and `ToolTimeline.vue:37-40`) is a **separate decision** from the UI accent colors above. Harris SOP explicitly sanctions multi-hue palettes for categorical data-viz series (tool names, agent types) — that's not the same rule as "5 brand colors for UI chrome." Recommend leaving the categorical chart palette as-is; it's already labeled `// Harris-inspired palette` in the code and doesn't need to collapse to blue/gray.

### The one systemic, sitewide change: corners

Harris SOP is a square-corner system (zero `border-radius` on content elements; only nav pills at 4px and the theme toggle at 12px are exempt). Mission Control currently uses `rounded` / `rounded-lg` / `rounded-full` on nearly every surface — panel cards, KPI cards, badges, buttons, dropdowns, the toast, the theme-picker modal, the pixel-art agent-office name pills. This is the single highest-leverage, lowest-risk change in the whole redesign: a global Tailwind class sweep (`rounded` → none, `rounded-full` on status dots stays since dots are indicators not content chrome) touches nearly every component but changes zero logic.

---

## Dirty Working-Tree Triage

`git status` at session start showed 6 modified, uncommitted files (~26 insertions, no deletions) — **left untouched per instructions.** `git diff` shows this is one coherent, low-risk, purely additive feature:

**Feature: resolve subagent identity from `SubagentStart` events instead of falling back to the raw source-app name.**

- `types.ts` — adds `agentType: string | null` to `SessionInfo`.
- `useSessionTracker.ts` — on a `SubagentStart` event with `payload.agent_type` (e.g. `"codebro"`, `"fabbro"`), stamps it onto the session.
- `useAgentAliases.ts` — `getDisplayName()` now takes an optional `agentType` and prefers it over the raw agent ID when no user alias is set (alias > agentType > agentId).
- `AgentSwimLane.vue` — resolves `agentType` by scanning `props.events` for a matching `SubagentStart` and uses it in place of the raw source-app for the lane's color/label.
- `AgentOffice.vue`, `SessionOverviewCard.vue` — thread the new `agentType` through to `getHexColorForApp()` and `getDisplayName()` calls.

**Verdict: safe to commit as-is, no relation to the redesign.** It's exactly the kind of thing this session's own baseline capture incidentally demonstrated working — the live dashboard screenshots above already show agent-type-derived labels (`workflow-subagent`, `designbro-mc-redesign`, `designbro-stage-plan`) rather than raw session IDs, both in the Agent Office pixel-art scene and the Agent Teams roster. Recommend Tyler commit this on its own branch before redesign work starts, so the redesign diff doesn't get tangled with an unrelated feature.

---

## Stage 1 — Reuse Inventory (within Mission Control)

Overall finding: **Mission Control is already well-consolidated, not sprawling.** The one genuinely mature, reused pattern (`DockablePanel`) is used correctly everywhere; the problems are token-consistency problems, not structural-duplication problems.

| Pattern | Canonical implementation | Consumers | Verdict |
|---|---|---|---|
| Dockable/floating panel chrome (dock, float, collapse, resize on 4 edges + 4 corners) | `DockablePanel.vue` (338 lines) + `usePanelManager.ts` (262 lines, persists layout) | Sessions, Agent Teams, Swim Lanes, Claude HUD, Analytics, Toolkit, Event Stream, Agent Office — all 8 major panels in `App.vue` | **CANONICAL, no duplicate panel systems found.** Do not replace. |
| Canvas chart rendering | `utils/analyticsRenderer.ts` (shared: horizontal bars, stacked bars, donut, sparkline, multi-line, usage bars) | `ToolAnalytics.vue` (5 canvases), `ToolTimeline.vue`, `ClaudeHudCard.vue` | Already shared across 3 components — good. |
| Canvas hover/click tooltip | `useCanvasTooltip.ts` + `utils/canvasInteraction.ts` | `ToolAnalytics.vue`, `ToolTimeline.vue` | Shared composable — good. |
| Canvas hover/click tooltip (again, but separate) | Inline `ref` + manual `mousemove`/`mouseleave` handlers, hand-rolled | `LivePulseChart.vue:204-215, 379-419` | **Duplicate of the pattern above.** `LivePulseChart` predates `useCanvasTooltip` and never got migrated. Low-risk consolidation: port it onto `useCanvasTooltip`. |
| "Stat/metric card" shell (`rounded bg-[var(--theme-bg-tertiary)] border ... border-top: 2px solid <accent>`) | Repeated inline Tailwind string, not a component | `KpiRow.vue`, `ClaudeHudCard.vue`, `AgentTeamsPanel.vue`, `ToolTimeline.vue`, each of the 5 panels in `ToolAnalytics.vue` — 11+ near-identical instances | Visually consistent already (that's *why* the dashboard looks coherent today), but it's copy-pasted markup, not a shared `<StatCard>` component. Code-quality opportunity, not a visual bug — bundle into the redesign pass since every one of these divs also needs the corner-radius fix, so touching them once for both is efficient. |
| Theme-token usage (`var(--theme-*)`) | Used consistently by ~20 of 26 components | — | The default; the two exceptions below are the actual Stage 0 targets. |
| **Theme-token usage — OUTLIER** | `ThemeManager.vue` and `FilterPanel.vue` use raw Tailwind literals (`bg-blue-500`, `dark:bg-gray-800`, `text-gray-700`) instead of the app's own `var(--theme-*)` system | — | **These two components don't even match Mission Control's own existing design system**, independent of Harris rules. `ThemeManager.vue` is the theme *picker* — ironic that it's the one component that doesn't theme itself. Highest-priority visual-consistency fix, separate from the Harris token retune. |
| Kanban-style task board (read-only, no drag) | Inline 3-column grid | `AgentTeamsPanel.vue:11-77` | Read-only display, not drag-and-drop — a DnD library (SortableJS, Pragmatic-dnd) would add capability nobody asked for. Keep bespoke. |

**Vite scaffold leftover:** `src/style.css` is still the default `create-vite` boilerplate (`#242424` background, system-ui font stack, generic `button`/`.card` rules) and is dead weight — none of it matches the app's actual `var(--theme-*)` system, and Tailwind + inline styles do all real styling. Safe to gut to just the Tailwind directives + the one legitimate mobile-touch-target media query at the bottom (lines 82-104), which IS still relevant.

---

## Stage 2 — Chart/Timeline Library Weigh-In

Applying the stated rule — reuse-distance > maintenance-debt > license > perf, and *a working bespoke component with no bugs may stay* — against the research doc's verdicts (`Innovation/Research/research-widgets.md`, compiled 2026-07-01):

| Component | Current implementation | Library candidate(s) | Recommendation |
|---|---|---|---|
| `LivePulseChart.vue` (521 lines) | Bespoke canvas bar chart in `utils/chartRenderer.ts`, custom 30fps render loop, signature "pulse" animation on new events, theme-color-aware via `getComputedStyle` reads | ECharts (ADOPT-CANDIDATE, Apache-2.0), uPlot (ADOPT-CANDIDATE, MIT, verified 165k-point perf) | **KEEP bespoke.** The pulse-on-new-event animation is a real, working, signature interaction with no reported bugs — replacing it would mean re-implementing that exact animation on top of a general-purpose library for no functional gain. Event volume here (60 buckets, 1-10 min windows) is nowhere near the 165k-point scale uPlot/ECharts exist to solve. Not a fit for either candidate's actual strength. |
| `ToolTimeline.vue` (132 lines) | Bespoke multi-line canvas chart via `analyticsRenderer.ts:renderMultiLineChart`, top-5-tools-per-minute-bucket | uPlot (ADOPT-CANDIDATE — *this is exactly uPlot's specialty*: time-series, multi-line, purpose-built) | **WATCH, not urgent.** This is the best-fit swap candidate in the app if `analyticsRenderer.ts` ever needs real interactivity (zoom, pan, legend toggling) that would be expensive to hand-roll — uPlot ships all of that. But the current version works, is small (132 lines), and shares its render utility with 2 other components. Don't swap preemptively; revisit if a feature request needs zoom/pan. |
| `ToolAnalytics.vue` 5-panel grid (bars, stacked bars, donut, sparkline) | Bespoke, `analyticsRenderer.ts` | Chart.js (ADOPT-CANDIDATE for standard dashboards), ECharts | **KEEP bespoke.** Five different chart types sharing one hand-rolled renderer, with a working shared tooltip/click-to-filter interaction (`useCanvasTooltip`) wired into all of them — that cross-chart interaction wiring is exactly the kind of thing that gets harder, not easier, when spread across a general-purpose library's per-chart-type APIs. No bug reports, no missing capability. |
| Grid/table surfaces | **None exist.** Mission Control has no tabular/grid view — `EventRow.vue` is a virtual-scrolled card list (`useVirtualScroll.ts`), not a data grid. | Tabulator (CANONICAL elsewhere at Harris) | **N/A.** Nothing to swap; note for future — if a tabular "raw event log" view is ever added, Tabulator is the house standard per the UI element registry, not a bespoke table. |
| `DockablePanel.vue` + `usePanelManager.ts` (600 lines combined) | Bespoke dock/float/collapse/resize-all-edges panel manager with persisted layout | Dockview (ADOPT-CANDIDATE, MIT, vanilla-first, explicitly the strongest fit in the docking-manager category per the research doc) | **KEEP bespoke.** This is the strongest "don't swap a working thing" case in the app: it's deeply wired into Vue reactivity, drives all 8 major panels, persists layout via `usePanelManager`, and has no reported bugs. Dockview is a genuinely good library, but the migration cost (rewriting the Vue-reactive panel registry, re-wiring 8 call sites in `App.vue`, re-implementing layout persistence against Dockview's own state model) buys nothing a user would notice. Keep Dockview on file as the reference if this component ever needs work it can't currently do (e.g., pop-out to a real separate window, which Dockview supports and the current implementation doesn't). |

**Net Stage 2 call: no library swaps recommended right now.** Every bespoke chart/panel component is working, has no reported bugs, and its replacement candidate's actual strength (165k-point perf, multi-window popout, zoom/pan) isn't a capability anyone has asked for. This is the correct outcome of the weighing rule, not a missed opportunity — the research doc did its job by giving future sessions a clear reference (uPlot for `ToolTimeline`, Dockview for `DockablePanel`) to reach for if and when a real capability gap shows up.

---

## Visual Baseline (Stage 4 prep)

Captured via Playwright against the live dashboard at `http://localhost:5173/` (WebSocket backend on `:4000`, confirmed "Online" with real hook events flowing — including this very session's own agent activity, since Mission Control observes its own Claude Code hooks). Saved to `apps/client/docs/baselines/2026-07-02/` (untracked, per instructions).

| File | Content |
|---|---|
| `01-main-dashboard.png` | Full-page, cold-load empty state (0 events, "Waiting for events...") — useful as the "empty state" baseline |
| `02-toolkit-panel.png` | Toolkit Explorer panel close-up (sidebar nav tree + welcome content) |
| `03-agent-office-empty.png` | Agent Office panel before agent data arrived |
| `04-main-dashboard-live.png` | Full-page, first live events arriving (1 agent, transitional state) |
| `05-main-dashboard-populated.png` | Full-page, fully populated (6 sessions, 295 events, all 8 panels rendering real data) — **primary "current state" reference for the redesign diff** |
| `06-agent-office-populated.png` | Agent Office pixel-art scene close-up with 6 agent desks, sleep/active states, tool-use speech bubbles |
| `07-agent-teams-panel.png` | Agent Teams panel close-up — task board (Pending/In Progress/Completed), agent roster badges, message flow log |
| `08-analytics-panel.png` | Analytics panel close-up — 5-chart grid + Tool Timeline + Error Analysis |

**Scope gap — flag for the implementation session:** this pass only had `browser_navigate`/`browser_take_screenshot`/`browser_snapshot` available, with no click/interact tool. That means the **light-theme and manual dark/light-toggle baselines could not be captured** — only the default `harris-mission-control` (dark) theme is represented above. The implementation session, which will have interactive Playwright tools, should capture a `Light` preset baseline and a post-redesign `harris-mission-control`-retuned baseline before/after diffing.

**Notable visual finding from the baseline itself:** the Agent Office panel (`06-agent-office-populated.png`) renders a genuinely charming retro pixel-art office scene — desks, sprite characters, "Z Z Z" sleep animation, tool-use speech bubbles — that is stylistically distinct from the clean data-console aesthetic everywhere else in the app. Recommend treating this as a deliberate, scoped exception (the canvas *content* stays playful pixel art) while still bringing its panel *chrome* (header bar, buttons, name-tag pills) onto the same Harris tokens and square corners as every other panel — consistent chrome, distinct canvas content.

---

## Proposed Implementation Order

1. **Commit the dirty tree first, on its own branch**, separate from redesign work (agent-type resolution feature — safe, unrelated, already tested by this session's own baseline captures).
2. **Global corner-radius sweep** — highest leverage, lowest risk, touches the most surface area for the least logic change. Do this before anything else so every subsequent screenshot in the redesign is against a square-corner baseline.
3. **Retune the `harris-mission-control` theme object** in `useThemes.ts` to the exact token table above (background/text/border/status hex). One object, contained blast radius, immediately fixes the single biggest color-accuracy gap.
4. **Bring `ThemeManager.vue` and `FilterPanel.vue` onto `var(--theme-*)`** — these two are visually inconsistent with the rest of the app today, independent of Harris rules, and are small/contained components to fix.
5. **Consolidate `LivePulseChart.vue`'s inline tooltip onto `useCanvasTooltip`** — removes the one real code-duplication finding from Stage 1.
6. **Optional cleanup:** extract the 11+ repeated stat-card shells into a shared component while already touching them for the radius fix in step 2; gut the dead Vite-scaffold CSS in `style.css`.
7. **No library swaps** (Stage 2 verdict) — leave `LivePulseChart`, `ToolTimeline`, `ToolAnalytics`, and `DockablePanel` as-is; uPlot and Dockview stay on file as reference for future capability gaps, not current work.
8. **Post-redesign baseline capture** (with interactive Playwright tools) — re-shoot all 8 reference views plus the previously-uncapturable light-theme state, diff against this brief's baselines.

---

*Prepared by Designbro. No component code was modified to produce this brief — see baseline PNGs and this document only.*
