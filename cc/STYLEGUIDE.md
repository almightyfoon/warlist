# Warlist UI Style Guide

Design system for the Warlist Mk4 army list builder. All rules here apply to both the production app (`cc/`) and any future feature work. The `mockup.html` file in this directory is the canonical visual reference — open it at `http://localhost:5174/mockup.html` while developing.

---

## Theme system

Themes are switched by setting `data-theme="dark"` or `data-theme="light"` on `<html>`. **Never** set individual color properties inline or via JS — all color decisions flow through CSS custom properties. The topbar always stays dark regardless of theme.

```html
<html data-theme="dark">   <!-- dark (default) -->
<html data-theme="light">  <!-- light -->
```

Persist the user's choice in `localStorage` key `cctheme`. On page load, read it and set the attribute before first paint to avoid a flash.

---

## Design tokens

All tokens are defined in `:root` (theme-agnostic) and `[data-theme]` (theme-specific). Never hard-code a hex value in component CSS — always use a token.

### Theme-agnostic tokens (`:root`)

| Token | Value | Use |
|---|---|---|
| `--font-title` | `'Geared Slab', 'Lato', serif` | App title, section headings |
| `--font-head` | `'Lato', sans-serif` | Card titles, labels, bold UI text |
| `--font-body` | `'Fira Sans', 'Inter', sans-serif` | All body text, inputs, buttons |
| `--radius-sm` | `3px` | Buttons, inputs, list entries |
| `--radius-md` | `6px` | Cards, panels |
| `--radius-lg` | `10px` | Dialogs, floating panels |
| `--ease` | `0.18s ease` | Standard transition duration |

### Dark theme tokens

| Token | Value | Role |
|---|---|---|
| `--bg` | `#0e1117` | Page background |
| `--surface` | `#161c2b` | Cards, panels |
| `--surface-2` | `#1e2840` | Panel headers, builder picker bg |
| `--surface-3` | `#26334f` | Hover backgrounds, toasts |
| `--border` | `#2c3a56` | Card and panel borders |
| `--border-soft` | `rgba(255,255,255,0.06)` | Row dividers within a surface |
| `--text` | `#dde3f0` | Primary text |
| `--text-2` | `#8a9bb5` | Secondary/muted text |
| `--text-disabled` | `#4a5672` | Disabled / placeholder text |
| `--accent` | `#4d9de8` | Primary brand blue |
| `--accent-dark` | `#2270c0` | Button border, pressed state |
| `--accent-hover` | `#6fb4f5` | Accent hover |
| `--accent-dim` | `rgba(77,157,232,0.14)` | Accent tinted backgrounds, tags |
| `--gold` | `#c8941a` | Secondary accent (leader badge etc.) |
| `--gold-dim` | `rgba(200,148,26,0.14)` | Gold tinted backgrounds |
| `--topbar` | `#0a1320` | Top bar background (always dark) |
| `--topbar-border` | `#1a2a40` | Top bar bottom border |
| `--danger` | `#e05555` | Errors, over-points |
| `--danger-dim` | `rgba(224,85,85,0.12)` | Danger tinted backgrounds |
| `--success` | `#4cb87a` | Validation pass, companion notes |
| `--warn` | `#c89220` | Warnings |
| `--btn-bg` | `#1e2840` | Ghost/secondary button fill |
| `--btn-border` | `#2c3a56` | Ghost/secondary button border |
| `--btn-text` | `#c0cce0` | Ghost/secondary button label |
| `--btn-hover` | `#26334f` | Ghost/secondary button hover |
| `--input-bg` | `#111827` | Input and select background |
| `--input-border` | `#2c3a56` | Input border |
| `--input-focus` | `#4d9de8` | Input focus ring color |
| `--picker-hover` | `rgba(77,157,232,0.09)` | Card picker row hover |
| `--picker-sel` | `rgba(77,157,232,0.18)` | Card picker row selected |
| `--pointbar-bg` | `#1e2840` | Point bar track |
| `--pointbar-fill` | `#4d9de8` | Point bar fill (under limit) |
| `--pointbar-over` | `#e05555` | Point bar fill (over limit) |
| `--shadow-card` | `0 2px 8px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4)` | Card elevation |
| `--shadow-float` | `0 8px 32px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)` | Dialogs, dropdowns |

### Light theme overrides

The light theme redefines every token above. Key differences:

- `--bg`: `#edf0f5` — cool grey page background, not white
- `--surface`: `#ffffff`
- `--accent`: `#1a6abf` — deeper blue so contrast holds on white
- `--topbar`: `#0f2040` — always stays dark (brand consistency)
- Shadows are much lighter (page doesn't have a floating-window feel)

The topbar is `--topbar` / `--topbar-border` in both themes. Never change topbar colors based on theme.

---

## Typography

### Font stack

Three fonts are in use:

- **Geared Slab** — custom font loaded via `@font-face` in `cc.css`. Use only for the app title and major brand headings. Falls back to Lato.
- **Lato** — headings, labels, bold UI chrome. Weights 300/400/700/900.
- **Fira Sans** — body text, inputs, buttons, all prose. Weights 300/400/500/600.

Load both from Google Fonts (already in `index.html`). Geared Slab is loaded from the local `@font-face` declaration in `cc.css`.

### Text utility classes

| Class | Style | Use |
|---|---|---|
| `.t-heading` | Lato 700, `var(--text)` | Section headings within cards |
| `.t-label` | 11px Fira Sans 600, uppercase, 0.08em spacing, `var(--text-2)` | Form field labels |
| `.t-muted` | `var(--text-2)` | Secondary info |
| `.t-danger` | `var(--danger)` | Error text inline |
| `.t-success` | `var(--success)` | Confirmation text inline |
| `.t-accent` | `var(--accent)` | Highlight, links without underline |

### Section title pattern (card headers)

```css
.setup-title {
  font-size: 13px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--accent);
  margin-bottom: 14px; padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}
```

Use this pattern for the "New Mk4 List", "My Lists", "News & Updates" card headers. The accent-colored uppercase label with a border-bottom rule is the standard section divider inside a card.

---

## Layout

### Top bar

48px fixed bar, always `var(--topbar)` background. Contains (left to right):

1. Logo mark (28×28 `img/warlist-mark.svg`) + "Warlist" title in Geared Slab 22px
2. `flex: 1` spacer
3. User avatar + email (shown when signed in)
4. Theme toggle pill

The topbar is `z-index: 200`. All content gets `padding-top: 48px`.

### Home / Setup page

Max-width 520px, centered. Stacked cards: **New List** → **My Lists** → **News & Updates**. No sidebar. This page is where the user selects faction, army, and point limit before entering the builder.

### List builder page

Two-panel full-bleed layout (`height: calc(100vh - 48px)`, no overflow):

- **Left panel** — 320px fixed, `var(--surface)`, scrollable entry list. Header (army badge + point bar) and footer (save/export row) are `flex-shrink: 0`.
- **Right panel** — `flex: 1`, `var(--surface-2)`, scrollable card picker. Header has the search input.

---

## Components

### Cards / Surfaces

```html
<div class="card">…</div>
```

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}
```

Use `.card` for all floating content boxes on the home page. The builder panels use raw surface colors without the `.card` wrapper (they span full height).

### Buttons

Four variants, three size modifiers:

```html
<button class="btn btn-primary">Start Building</button>
<button class="btn btn-ghost">Cancel</button>
<button class="btn btn-danger">Delete</button>
<button class="btn btn-icon"><i class="material-icons">content_copy</i></button>
```

Size modifiers: `.btn-sm` (12px, 4px v-pad), `.btn-lg` (15px, 10px v-pad), `.btn-full` (full width, centered).

**Rules:**
- Default `.btn` padding is `7px 14px`, font-size 13px, font-weight 600.
- Primary buttons use solid `--accent` fill. One primary action per card section.
- Ghost buttons for secondary actions and toolbar items.
- Danger is outline-only (transparent fill), turns `--danger-dim` on hover.
- Icon-only buttons use `.btn-icon` — never add text.
- All buttons use `--radius-sm` (3px), Fira Sans, `--ease` transition.

### Segment control (point limit selector)

```html
<div class="seg-group">
  <button class="seg-btn">50</button>
  <button class="seg-btn active">75</button>
  <button class="seg-btn">100</button>
</div>
```

Used for point limit selection only. Active state: solid `--accent`. Never use for mode switching in the builder.

### Form inputs and selects

```html
<input class="input" type="text" placeholder="Search cards…">
<select class="input">…</select>
```

All inputs: `var(--input-bg)`, `var(--input-border)`, `--radius-sm`. Focus ring: 3px `var(--accent-dim)` box-shadow + `var(--input-focus)` border. Selects get a custom SVG chevron via `background-image`.

### Search input (builder picker)

```html
<div class="search-input-wrap">
  <i class="material-icons">search</i>
  <input class="search-input" type="search" placeholder="Search cards…">
</div>
```

Left-padded (32px) to accommodate the icon. Same focus ring as `.input`.

### Point bar

```html
<div class="pointbar-track">
  <div class="pointbar-fill" style="width: 68%"></div>
</div>
<div class="pointbar-label">
  <span class="pts-used">51 pts</span>
  <span>/ 75</span>
</div>
```

Height 6px, `--radius-md` track. Fill turns `--pointbar-over` when over budget. The bar transitions `width: 0.25s ease`.

### Card picker rows

Three states:

```html
<!-- Available -->
<div class="picker-row picker-available">
  <span class="picker-name">Juggernaut</span>
  <span class="picker-pts">10 pts</span>
  <span class="picker-fa">FA: 4</span>
</div>

<!-- At FA limit -->
<div class="picker-row picker-unavailable">
  <span class="picker-name">Juggernaut</span>
  <span class="picker-pts">10 pts</span>
  <span class="picker-reason">FA limit reached</span>
</div>

<!-- Auto-companions -->
<div class="picker-row picker-available">
  <span class="picker-name">Stormclad</span>
  <span class="picker-pts">14 pts</span>
  <span class="picker-companion-note">+ Squire joins automatically</span>
</div>
```

Unavailable rows are `opacity: 0.4` — keep them visible in the list so users know the card exists and why it can't be added. Never hide unavailable cards.

### List entry rows

```html
<div class="list-entry">
  <span class="entry-name">Juggernaut</span>
  <span class="entry-cost">10</span>
  <button class="entry-remove">×</button>
</div>
```

Companion entries add `.entry-companion` for indent + italic style. The remove button is `--text-disabled` at rest, turns `--danger` on hover.

### Validation banners

```html
<div class="list-validation">
  <i class="material-icons">warning</i>
  No warcaster selected
</div>
```

Left-bordered `--danger` with `--danger-dim` background. Inline in the list panel, not a toast.

### Dialogs

```html
<div class="dialog-scrim" id="my-dialog">
  <div class="dialog-box">
    <h2 class="dialog-title">Confirm delete</h2>
    <p class="dialog-body">This cannot be undone.</p>
    <div class="dialog-actions">
      <button class="btn btn-ghost">Cancel</button>
      <button class="btn btn-danger">Delete</button>
    </div>
  </div>
</div>
```

Toggle `.open` on the scrim to show. Scrim: `rgba(0,0,0,0.7)` + `backdrop-filter: blur(2px)`. Dialog box animates in via `translateY(-8px) scale(0.98)` → `none`. Max width 380px / 92vw. Use `--radius-lg` on the box.

### Toast notifications

```html
<div class="toast show" id="toast">
  <i class="material-icons">check_circle</i>
  List saved
</div>
```

Pill shape, centered at bottom (`position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%)`). Show by adding `.show`, remove after ~2 seconds. Use for transient feedback only — don't use for errors (use inline validation banners instead).

### Status indicators

```html
<span class="status-pass"><i class="material-icons">check_circle</i> Valid</span>
<span class="status-fail"><i class="material-icons">error</i> Over points</span>
<span class="status-warn"><i class="material-icons">warning</i> Missing leader</span>
```

### News items

```html
<div class="news-item">
  <div class="news-date">
    <span class="news-date-day">12</span>
    <span class="news-date-mon">Jun</span>
  </div>
  <div class="news-body">
    <div class="news-title">New Khador cadre cards</div>
    <div class="news-snippet">Three new warjacks added to the 5th Division…</div>
    <span class="news-tag">Data Update</span>
  </div>
</div>
```

Date column: 44px wide, day number 20px bold `--accent`, month 10px uppercase `--text-2`. Tags: three categories — `Data Update`, `Errata`, `New Faction` — all use `.news-tag` (accent pill).

---

## Icons

Use **Material Icons** (already loaded). Icon sizes in context:

| Context | Size |
|---|---|
| Inline with body text | 15–16px |
| Button icon | 18px |
| Picker/topbar | 17–18px |
| Status indicators | 15px |
| Toasts | 16px |
| Section actions | 18–20px |

Always set `font-size` explicitly on `.material-icons` — the default 24px is too large for most UI contexts.

The icomoon custom icon font (`cc.css` `@font-face "icomoon"`) is legacy. Do not add new icons to icomoon; use Material Icons for everything new.

---

## Logo and branding

### Mark

`img/warlist-mark.svg` — 100×100 viewBox SVG. Features:

- Dark base plate (`#0a1520` circle, r=50)
- 8 gear teeth (`#4d9de8` rects, 12×12 each, rotated 45° intervals, r=1.5 to r=13.5 from edge)
- Inner badge face (`#0a1520`, r=35) with double accent rings (r=35 stroke-width 2, r=30 stroke-width 0.75)
- WL lettermark (bold polygon W + rect L, `#4d9de8`), centered at x=50
- Decorative underline rule (y=68, x=24–76, opacity 0.45)

The mark is used in the topbar at 28×28 (`opacity: 0.85`, `filter: brightness(1.1)`). Maintain the dark `#0a1520` background — do not invert or recolor the SVG.

### Title wordmark

`font-family: var(--font-title)` (Geared Slab → Lato), 22px in topbar, white. Use Geared Slab for the title text only, not for labels or body content.

### Brand colors

| Swatch | Hex | Use |
|---|---|---|
| Accent blue (dark) | `#4d9de8` | Primary interactive color, logo accents |
| Accent blue (light) | `#1a6abf` | Same role in light theme |
| Base dark | `#0a1320` | Topbar, logo plate |
| Gold | `#c8941a` | Leader badges, secondary highlights |

---

## Scrollbars

Thin custom scrollbars in webkit browsers:

```css
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-2); }
```

Apply globally. Don't style scrollbars on individual components — the global rule covers everything.

---

## Motion and transitions

All interactive transitions use `var(--ease)` (`0.18s ease`). Exceptions:

- Point bar width: `0.25s ease` (slightly slower, feels physical)
- Dialog enter: `0.2s` (scrim opacity + box transform together)

Don't animate layout properties (width, height changes that affect siblings) — only colors, opacity, transform, and box-shadow. The builder should feel snappy; don't slow interactions down with long animations.

---

## Do and don't

**Do:**
- Use CSS custom properties for every color, surface, and shadow
- Use `[data-theme]` on `<html>` for theme switching — one attribute change, everything updates
- Keep the topbar always dark (`--topbar: #0a1320 / #0f2040`) in both themes
- Use `.t-label` for all form field labels (uppercase, spaced, muted)
- Use `--radius-sm` for interactive elements (buttons, inputs), `--radius-md` for cards, `--radius-lg` for dialogs
- Show unavailable picker cards at reduced opacity with a reason string
- Use inline validation banners for persistent errors; toasts for transient success

**Don't:**
- Hard-code any hex color in component CSS
- Use `setProperty` inline JS to change colors (that was the old pattern — migrated away from it)
- Use Geared Slab for anything other than the app title and major brand headings
- Add new icons to the icomoon font (use Material Icons)
- Hide unavailable cards from the picker — show them dimmed so users understand field allowance
- Use `font-size: 24px` on Material Icons — always set a specific size
- Add animations to layout properties
