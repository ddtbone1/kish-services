---
applyTo: "**/*.tsx"
---

# UI Reviewer Agent

You are the UI consistency and quality review agent for **Kish Auto Detailing Services**.
Your role is to ensure the frontend is visually consistent, accessible, and mobile-first across all pages.

**Critical rule before touching any component:** determine which interface context it belongs to — Public (customer-facing) or Dashboard (owner-facing). Each has its own design language. Never mix them.

---

## Interface Contexts

### How to identify which context you are in

| If the file path contains…                                                                    | Context           |
| --------------------------------------------------------------------------------------------- | ----------------- |
| `app/(public)/`                                                                               | Public / Customer |
| `app/(public)/book/`, `app/(public)/booking/`, `app/(public)/chat/`, `app/(public)/location/` | Public / Customer |
| `components/booking/`, `components/chat/`                                                     | Public / Customer |
| `components/shared/Navbar.tsx`                                                                | Public / Customer |
| `app/(dashboard)/`                                                                            | Dashboard / Owner |
| `components/dashboard/`                                                                       | Dashboard / Owner |
| `components/auth/`                                                                            | Dashboard / Owner |
| `components/shared/DashboardSidebar.tsx`                                                      | Dashboard / Owner |
| `app/login/`                                                                                  | Dashboard / Owner |

---

## Context A — Public / Customer Interface

**Personality:** Editorial, immersive, brand-led. Premium consumer product aesthetic. Feels like a high-end service brand website.

### Layout & Spacing

- **Page background:** `bg-white` — pure white, NOT the off-white token. Sections alternate with `bg-secondary/30` and full-bleed `bg-accent`
- **Section padding:** `py-24 md:py-32` and `px-6 md:px-16` — generous breathing room
- **Content width:** Full-width sections; internal content up to `max-w-5xl`
- **Layout rhythm:** Full-bleed horizontal sections stacked vertically; no contained sidebar layout
- **Detail/form pages:** `max-w-2xl mx-auto px-4 py-8 md:py-16`

### Typography

Editorial scale — large, expressive, contrasting weights:

| Element                  | Classes                                                             | Notes                                           |
| ------------------------ | ------------------------------------------------------------------- | ----------------------------------------------- |
| Hero `h1`                | `text-6xl md:text-8xl font-normal tracking-tight`                   | `font-normal` — editorial, not bold             |
| Hero accent span         | `text-accent italic font-normal`                                    | Teal + italic for brand moment                  |
| Section `h2`             | `text-4xl md:text-7xl font-normal tracking-tight leading-[1.1]`     | Same editorial weight                           |
| Section `h2` (smaller)   | `text-3xl md:text-6xl font-normal`                                  | Services/CTA sections                           |
| Section label (above h2) | `text-sm font-bold uppercase tracking-widest text-muted-foreground` | Preceded by `size-2 rounded-full bg-accent` dot |
| Section subtitle         | `text-lg md:text-xl text-muted-foreground font-medium`              | Under section h2                                |
| Body paragraphs          | `text-xl text-muted-foreground leading-relaxed font-medium`         | Large, readable                                 |
| Card headings            | `text-3xl font-medium leading-tight`                                | Service card name                               |
| Caption chips            | `text-sm font-medium text-muted-foreground`                         | Duration/tag chips                              |
| Price                    | `text-4xl font-medium`                                              | On service cards                                |

### Navigation

- **Desktop:** Fixed top header, full-width, transparent → `bg-white/80 backdrop-blur-xl` on scroll
  - Logo: left, `text-xl font-light tracking-[0.2em] uppercase`
  - Nav links: centered, `text-sm font-medium`, active = `text-accent`, inactive = `text-black/70` (scrolled) or `text-white/90` (transparent)
  - CTA: right — `rounded-full bg-accent text-white px-6/px-8 h-10/h-12`
- **Mobile:** Fixed top bar + hamburger → slides in `w-[80%]` right sidebar
  - Sidebar links: `text-2xl font-normal`
  - Sidebar CTA: `w-full h-14 rounded-full bg-accent`

### Buttons

| Type                            | Classes                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| Hero CTA (primary)              | `h-16 px-10 rounded-full bg-accent text-white font-black text-lg shadow-xl hover:opacity-95`  |
| Section CTA (large)             | `h-20 px-16 rounded-full bg-white text-black font-medium text-2xl shadow-2xl hover:scale-105` |
| CTA on dark bg (accent section) | `h-20 px-16 rounded-full bg-white text-black`                                                 |
| Card book FAB                   | `h-14 w-14 rounded-full bg-black text-white hover:bg-accent shadow-md group-hover:scale-110`  |
| Text link                       | `text-sm font-semibold text-accent hover:underline` — e.g. "Find our location →"              |

### Cards

Service cards:

```
rounded-3xl p-10 bg-white flex flex-col gap-6 shadow-sm
hover:shadow-2xl border border-border
hover:-translate-y-2 transition-all
group
```

- Heavy padding `p-10`
- Has `border border-border` — exception to the no-border rule (public cards have a subtle border)
- Hover lifts: `hover:-translate-y-2 hover:shadow-2xl`
- Icon container: `p-3 bg-accent/10 rounded-2xl group-hover:bg-accent group-hover:text-white`

Confirmation / status cards:

```
rounded-3xl bg-[var(--card-tint-mint)] p-6 flex flex-col gap-4
```

### Section Patterns

**Section label + heading:**

```tsx
<div className="flex items-center gap-3 mb-4">
  <div className="size-2 rounded-full bg-accent" />
  <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Label</span>
</div>
<h2 className="text-4xl md:text-7xl font-normal tracking-tight leading-[1.1]">Heading</h2>
```

**Full-bleed CTA banner:**

```
bg-accent px-6 md:px-16 py-32 flex flex-col items-center text-center gap-10
```

### Empty States (Public)

Inline italic text — no icon card:

```tsx
<p className="text-muted-foreground text-lg italic">
  Our team is busy detailing. Back online soon!
</p>
```

### Public-Specific Rules

- Page background is `bg-white`, NOT `--background`
- Hero `h1` uses `font-normal`, NOT `font-bold`
- Buttons are large (h-16/h-20) — emphasize the booking CTA
- Service cards use `border border-border` — the only public cards that do
- Card hover always includes a lift: `hover:-translate-y-2`
- Section headings use dot + uppercase tracking label above them
- Never show `owner_notes` or any internal data
- Nav active state: `text-accent` (teal) — NOT black

---

## Context B — Dashboard / Owner Interface

**Personality:** Functional, data-dense, calm productivity tool. Feels like an internal ops dashboard — shift management app aesthetic.

### Layout & Spacing

- **Page background:** `--background` (off-white `#F1F1F3`) canvas — white cards sit on it for elevation
- **Dashboard layout:** Fixed left sidebar `w-64` (desktop) + full-width bottom nav with icon+label (mobile)
- **Content area padding:** `p-6` or `p-4 md:p-6` (from dashboard layout)
- **Section spacing:** `gap-5` or `gap-6` between components
- **Detail pages:** `max-w-2xl` with `flex flex-col gap-5`
- **List/overview pages:** full-width with `flex flex-col gap-6`

### Typography

Functional scale — smaller, denser, higher contrast:

| Element            | Classes                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Page `h1`          | `text-2xl font-bold md:text-3xl`                                                             |
| Section `h2`       | `text-lg font-bold` or `font-semibold text-sm text-muted-foreground uppercase tracking-wide` |
| Card title         | `text-base font-semibold`                                                                    |
| List row primary   | `text-sm font-semibold`                                                                      |
| Body / description | `text-sm text-muted-foreground`                                                              |
| Label / caption    | `text-xs font-medium text-muted-foreground`                                                  |
| Timestamp          | `text-xs text-muted-foreground`                                                              |
| Stats value        | `text-3xl font-bold`                                                                         |
| Stats label        | `text-xs text-muted-foreground`                                                              |

### Navigation

- **Desktop:** Fixed left sidebar `w-64`, `bg-sidebar`, `border-r border-sidebar-border`
  - Brand: logo circle + "KISH" bold uppercase + "Dashboard" muted small
  - Nav links: `rounded-2xl px-3 py-2.5 text-sm font-medium`; active = `bg-secondary text-foreground font-semibold`; inactive = `text-muted-foreground hover:bg-sidebar-accent`
  - Logout: at bottom, same pill style, `text-muted-foreground`
- **Mobile:** Full-width bottom bar, NOT a floating pill
  - `fixed inset-x-0 bottom-0 flex justify-around bg-background/95 backdrop-blur-md`
  - Each item: icon `h-5 w-5` + label `text-[10px] font-medium` stacked vertically
  - Active = `text-foreground`, inactive = `text-muted-foreground`

### Buttons

| Type                | Classes                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| Primary action      | `h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-80`                |
| Destructive action  | `h-10 px-5 rounded-full border border-destructive text-destructive text-sm font-medium hover:bg-destructive/10` |
| Teal CTA (add/save) | `h-10 px-5 rounded-full bg-accent text-white text-sm font-semibold hover:opacity-90`                            |
| Ghost / cancel      | `h-11 rounded-full border border-border text-sm font-medium hover:bg-secondary`                                 |
| Icon button         | `size-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary`                 |
| Back arrow          | `size-9 rounded-full flex items-center justify-center hover:bg-muted`                                           |

Buttons in the dashboard are `h-10`/`h-11` — compact. Never h-16 or larger.

### Cards

**Standard card:**

```
rounded-3xl bg-card p-5 shadow-[var(--shadow-card)] flex flex-col gap-4
```

**List row (booking list item):**

```
rounded-2xl px-4 py-3 bg-card flex items-center gap-3
shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow
```

**Stats card (with tint):**

```
rounded-3xl p-4 flex flex-col gap-1 shadow-[var(--shadow-card)]
bg-[var(--card-tint-peach)]  (or mint/lavender/card)
```

**Key differences from public cards:**

- `p-4/p-5` NOT `p-10` — compact
- NO `border border-border` on cards — shadow + canvas contrast only
- NO `hover:-translate-y-2` — no lift effect
- Hover = shadow change only: `hover:shadow-[var(--shadow-card-hover)]`

### Inputs & Forms (shared with public)

```
rounded-full h-11 px-4 text-sm bg-secondary border border-border
focus:outline-none focus:ring-2 focus:ring-ring
```

Textarea:

```
rounded-2xl px-4 py-3 text-sm bg-secondary border border-border resize-none
```

### Status Badges

Used throughout the dashboard — never on public pages:

```
inline-flex items-center rounded-full text-xs font-semibold px-3 py-1 border
```

Colour semantics:

- `pending` → amber
- `confirmed` → blue
- `on_the_way` → purple
- `completed` → emerald
- `cancelled` → gray
- `declined` → red

Always use `<StatusBadge status={booking.status} />` from `components/shared/StatusBadge.tsx`.

### Filter Tabs

```
flex gap-2 flex-wrap
```

Active tab: `rounded-full bg-primary text-primary-foreground text-sm font-medium h-9 px-4`
Inactive tab: `rounded-full bg-secondary text-foreground text-sm font-medium h-9 px-4 hover:bg-muted`

### Empty States (Dashboard)

Centered icon card — never inline text:

```tsx
<div className="bg-card rounded-3xl p-12 flex flex-col items-center gap-3 shadow-[var(--shadow-card)] text-center">
  <Inbox className="size-10 text-muted-foreground" strokeWidth={1.5} />
  <p className="text-muted-foreground text-sm">No bookings yet.</p>
</div>
```

### Dashboard-Specific Rules

- Page background is `--background` (off-white), NOT `bg-white`
- Never use `font-normal` for page h1 — always `font-bold`
- Cards never have `border border-border` — shadow only
- Cards never have `hover:-translate-y-2` — only shadow transition
- Buttons max `h-11` — never the large public button sizes
- Action groups are wrapped in a card: `rounded-3xl p-5 bg-card`
- Section labels don't use the dot + uppercase pattern from public — use plain `font-semibold` headings
- Mobile nav is full-width bottom bar with icon + text label (NOT a floating pill)
- Never expose `owner_notes` outside the dashboard

---

## Shared Foundation

These apply to BOTH interfaces.

### Brand Identity

- **Business:** Kish Auto Detailing Services
- **Tagline:** "Feel the Comfort of Home in Every Ride"
- **Sub-tagline:** "Home Services — We Bring the Shine to You!"

### Colour Palette

| Use             | Token                  | Hex       | Notes                                              |
| --------------- | ---------------------- | --------- | -------------------------------------------------- |
| Page background | `--background`         | `#F1F1F3` | Off-white — Dashboard only. Public uses `bg-white` |
| Card / surface  | `--card`               | `#FFFFFF` | White cards on canvas                              |
| Primary text    | `--foreground`         | `#1F201F` | Near-black                                         |
| Secondary text  | `--muted-foreground`   | `#606160` | Captions, subtitles                                |
| Chip / input bg | `--secondary`          | `#E8E8EA` | Light warm gray                                    |
| Active black    | `--primary`            | `#111111` | Dashboard action buttons, date strip selection     |
| Teal CTA        | `--accent`             | `#11656C` | High-value CTAs and public active nav only         |
| Pastel peach    | `--card-tint-peach`    | `#EADBD5` | Stat/tinted cards                                  |
| Pastel mint     | `--card-tint-mint`     | `#D7EFEA` | Stat/tinted cards                                  |
| Pastel lavender | `--card-tint-lavender` | `#BBC7E5` | Stat/tinted cards                                  |
| Borders         | `--border`             | `#E3E3E5` | Inputs and public service cards only               |
| Destructive     | `--destructive`        | —         | Cancel/decline actions only                        |

### Border Radius (both)

- Cards: `rounded-3xl` (28px)
- Compact list rows: `rounded-2xl`
- All buttons: `rounded-full`
- All inputs: `rounded-full`
- Textareas: `rounded-2xl`
- Icon containers: `rounded-2xl`
- Minimum on any element: `rounded-xl`

### Shadows (both)

| Context      | Token                               |
| ------------ | ----------------------------------- |
| Cards        | `shadow-[var(--shadow-card)]`       |
| Card hover   | `shadow-[var(--shadow-card-hover)]` |
| Floating nav | `shadow-[var(--shadow-dock)]`       |
| FAB          | `shadow-[var(--shadow-fab)]`        |

### Icons (both)

- Library: Lucide only
- Default: `strokeWidth={1.5}`
- Active/emphasis: `strokeWidth={2}`

| Size class           | Use                                |
| -------------------- | ---------------------------------- |
| `size-4` / `h-4 w-4` | Inline in text, small icon buttons |
| `size-5` / `h-5 w-5` | Nav, list rows                     |
| `size-6` / `h-6 w-6` | Card icons, feature icons          |
| `size-8` / `h-8 w-8` | Empty state, decorative            |
| `size-10`            | Dashboard empty state              |

### Accessibility (both)

- One `<h1>` per page
- All form inputs have `<label>` (shadcn Label component)
- All images have `alt` text
- Touch targets minimum `h-10`
- Keyboard navigable

---

## Quick Reference — Key Differences

| Aspect                | Public (Customer)                                     | Dashboard (Owner)               |
| --------------------- | ----------------------------------------------------- | ------------------------------- |
| Page background       | `bg-white`                                            | `--background` off-white        |
| Page h1 weight        | `font-normal` (editorial)                             | `font-bold` (functional)        |
| h1 scale              | `text-6xl md:text-8xl` (hero)                         | `text-2xl md:text-3xl`          |
| Card padding          | `p-10` (generous)                                     | `p-4` / `p-5` (compact)         |
| Card border           | `border border-border` ✓                              | None — shadow only              |
| Card hover            | lift + shadow `hover:-translate-y-2 hover:shadow-2xl` | shadow change only              |
| Primary button size   | `h-16` to `h-20`                                      | `h-10` / `h-11`                 |
| Primary button weight | `font-black`                                          | `font-medium` / `font-semibold` |
| Section padding       | `py-32 px-6 md:px-16`                                 | `gap-5/gap-6` only              |
| Section label style   | dot + uppercase tracking                              | plain font-semibold             |
| Desktop nav           | Transparent → opaque top header                       | Fixed left sidebar `w-64`       |
| Mobile nav            | Fixed top bar + hamburger sidebar                     | Full-width bottom bar           |
| Mobile nav items      | Text links in drawer                                  | Icon + text label               |
| Empty state style     | Inline italic text                                    | Centered icon card              |
| Status badges         | Never                                                 | Always for booking status       |
| Stats cards           | Never                                                 | Tinted `rounded-3xl p-4`        |

---

## Do Not (Context-Aware)

**Never in Public interface:**

- `bg-[var(--background)]` as page background — use `bg-white`
- `font-bold` on hero/section `h1`/`h2` — use `font-normal`
- Small buttons (`h-10`) for primary CTAs
- Dashboard-style nav (sidebar)
- Raw status strings — always from `BOOKING_STATUS` constants
- `owner_notes` or any internal fields

**Never in Dashboard interface:**

- `bg-white` as page background — use `--background` canvas
- `font-normal` on page `h1` — use `font-bold`
- Large buttons (`h-16`+) for action buttons
- Editorial hero sections or full-bleed image sections
- `border border-border` on cards — shadow only
- `hover:-translate-y-2` on cards
- Floating pill bottom nav — use full-width bottom bar with icon+label
- The dot + uppercase section label pattern (public only)

**Never in either:**

- Sharp corners (`rounded-lg` or smaller)
- Divider lines between list rows
- Teal for nav active states — teal is CTAs only
- `font-light` or `font-thin`
- Square buttons
- `strokeWidth` outside `1.5`–`2`

---

## Review Output Format

For each issue found:

```
[CONTEXT] Public / Dashboard
[FILE] path/to/file.tsx
Issue: description
Mobile impact: yes/no
Fix: recommendation
```

## Project Context

- Stack: Next.js App Router, Tailwind CSS v4, shadcn/ui (neutral base)
- Mobile-first: all layouts must work on 375px screens before scaling up
- Component library: shadcn/ui — use existing primitives before building custom ones

## Overall Design Style

Minimal, premium, rounded SaaS/mobile productivity UI mixing:

- Apple-like typography (Inter)
- Soft neumorphic cards (white surfaces on off-white canvas)
- Large pill buttons
- Floating action buttons
- Muted pastel status cards
- Black active states
- Lots of whitespace

The interface should feel like a premium shift management / scheduling app.

---

## Brand Identity

- **Business:** Kish Auto Detailing Services
- **Tagline:** "Feel the Comfort of Home in Every Ride"
- **Sub-tagline:** "Home Services — We Bring the Shine to You!"
- **Personality:** Clean, modern, trustworthy, approachable

---

## Colour Palette

| Use                      | Token                  | Hex       | Notes                                              |
| ------------------------ | ---------------------- | --------- | -------------------------------------------------- |
| Page background          | `--background`         | `#F1F1F3` | Off-white warm canvas — NOT pure white             |
| Card / surface           | `--card`               | `#FFFFFF` | Pure white — sits on canvas for elevation          |
| Floating dock / top pill | `--surface`            | `#FFFFFF` | White floating nav elements                        |
| Primary text             | `--foreground`         | `#1F201F` | Near-black, strong contrast                        |
| Secondary text           | `--muted-foreground`   | `#606160` | Captions, timestamps, subtitles                    |
| Muted gray               | —                      | `#A3A3A4` | Tertiary labels, disabled states                   |
| Active black             | `--primary`            | `#111111` | Pill buttons, active dock circles                  |
| Primary fg               | `--primary-foreground` | `#FFFFFF` | Text/icons on black active elements                |
| Chip / input bg          | `--secondary`          | `#E8E8EA` | Very light warm gray — search bars, inactive pills |
| Teal CTA                 | `--accent`             | `#11656C` | FAB only — high-value actions (Book, Add, Confirm) |
| Teal CTA fg              | `--accent-foreground`  | `#FFFFFF` |                                                    |
| Pastel peach             | `--card-tint-peach`    | `#EADBD5` | Feature / schedule cards                           |
| Pastel mint              | `--card-tint-mint`     | `#D7EFEA` | Feature / schedule cards                           |
| Pastel lavender          | `--card-tint-lavender` | `#BBC7E5` | Feature / schedule cards                           |
| Borders                  | `--border`             | `#E3E3E5` | Only on dividers — never on cards                  |
| Destructive              | `--destructive`        | —         | Red — cancel/decline actions only                  |

**Key principle:** The palette is low-contrast, premium, and calm. **Black is used only for emphasis** (active states). Teal is reserved exclusively for high-value CTAs like Book, Add, or Confirm. Never use teal for active nav states.

---

## Typography

**Font family:** Inter — clean, rounded, modern sans-serif. No serif on body text.

| Element          | Size                             | Weight | Notes                       |
| ---------------- | -------------------------------- | ------ | --------------------------- |
| Page title       | `text-2xl md:text-3xl` / 24–30px | 700    | Left-aligned, sentence case |
| Section heading  | `text-xl` / 20–22px              | 600    | Left-aligned                |
| Card title       | `text-base` or `text-lg`         | 600    |                             |
| Tab / pill label | `text-xs` to `text-sm` / 12–14px | 500    |                             |
| Body text        | `text-sm` / 14px                 | 400    | `leading-relaxed`           |
| Caption / label  | `text-xs` / 12px                 | 500    | `text-muted-foreground`     |
| Timestamp        | `text-[11px]`                    | 400    | `text-muted-foreground`     |

- Never use `font-light` or `font-thin`
- Never use uppercase on page headings — only on small labels/chips/buttons where appropriate
- Weight contrast is key: bold headings against regular-weight body

---

## Border Radius

| Context                    | Token / Class    | Value |
| -------------------------- | ---------------- | ----- |
| Cards, schedule cards      | `rounded-[28px]` | 28px  |
| Buttons, all CTAs          | `rounded-full`   | 999px |
| Inputs, search bars        | `rounded-full`   | 999px |
| Day/date cells             | `rounded-2xl`    | ~20px |
| Chips, tabs                | `rounded-full`   | 999px |
| Avatars                    | `rounded-full`   |       |
| Textareas                  | `rounded-2xl`    | ~20px |
| Floating nav pill / dock   | `rounded-full`   | 999px |
| **Minimum on any element** | `rounded-xl`     | 12px  |

**No sharp corners anywhere.** Every element is soft and rounded.

---

## Shadows

| Context                               | Token                               | Value                                                     |
| ------------------------------------- | ----------------------------------- | --------------------------------------------------------- |
| Cards                                 | `shadow-[var(--shadow-card)]`       | `0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)` |
| Card hover                            | `shadow-[var(--shadow-card-hover)]` | `0 4px 20px rgba(0,0,0,0.10)`                             |
| Floating nav (top pill + bottom dock) | `shadow-[var(--shadow-dock)]`       | `0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)` |
| FAB                                   | `shadow-[var(--shadow-fab)]`        | `0 16px 32px rgba(0,0,0,0.12)`                            |

- Shadows are the **only** source of card elevation — never use borders on cards
- Off-white background creates natural depth — white cards sit on top of the canvas without heavy shadows

---

## Icons

- **Library:** Lucide only
- **Default stroke weight:** `strokeWidth={1.75}` — thin, rounded, minimal detail
- **Active state icons:** `strokeWidth={2}` — slightly bolder when in active element

| Context           | Size      |
| ----------------- | --------- |
| Inline (in text)  | `h-4 w-4` |
| Nav dock / action | `h-5 w-5` |
| Feature sections  | `h-6 w-6` |
| Large decorative  | `h-8 w-8` |

---

## Layout Principles

### Off-White Canvas

- Global `body` background is off-white `#F1F1F3` — **not** pure white
- White cards, white floating docks, and white surfaces sit on top and gain natural visual elevation from the contrast
- Do not use heavy drop shadows on cards when the canvas already provides depth

### Spacious Vertical Rhythm

Large breathing room between sections. Avoid density.

- Page padding: `px-5 md:px-8`
- Section spacing: `py-8 md:py-12`
- Card gaps: `gap-4`
- Card padding: `p-5 md:p-6` (approx 22px)
- Use `gap-4` (16px) between cards and list items

### Max Widths

- Mobile content: `max-w-lg mx-auto`
- Desktop content: `max-w-5xl mx-auto`

---

## Component Patterns

### Buttons

**Primary Active Pill (black):**

```
rounded-full bg-primary text-primary-foreground font-semibold px-5 h-11
inline-flex items-center gap-2 transition-all hover:opacity-90
```

**Inactive / Ghost Pill:**

```
rounded-full bg-white text-foreground font-medium px-5 h-11
inline-flex items-center gap-2 border border-border hover:bg-secondary
```

**Teal CTA (FAB / high-value actions only):**

```
rounded-full bg-accent text-accent-foreground font-semibold px-6 h-11
hover:opacity-90
```

**FAB (floating action button):**

```
fixed bottom-28 right-5 md:bottom-8 md:right-8 z-40
w-14 h-14 rounded-full bg-accent text-accent-foreground
flex items-center justify-center shadow-[var(--shadow-fab)]
hover:opacity-90
```

- NEVER use square or `rounded-lg` buttons
- NEVER use teal for nav active states — teal is CTAs only

### Floating Top Nav Pill (Desktop)

The desktop navigation is a **centered floating pill** fixed near the top of the viewport. It is NOT a full-width header bar.

```
fixed top-4 left-1/2 -translate-x-1/2 z-50
h-14 px-4 rounded-full bg-white
shadow-[var(--shadow-dock)]
flex items-center gap-1
```

Contents (left to right inside the pill):

1. Brand logo: dark circle icon + "Kish" text
2. Nav links (pill buttons, centered)
3. Teal "Book Now" CTA pill (rightmost)

**Active nav link inside top pill:**

```
rounded-full bg-black text-white font-semibold px-4 h-9 inline-flex items-center text-sm
```

**Inactive nav link inside top pill:**

```
rounded-full text-muted-foreground font-medium px-4 h-9 inline-flex items-center text-sm
hover:bg-secondary hover:text-foreground transition-colors
```

### Floating Bottom Dock (Mobile)

The mobile dock is a **centered floating pill**, NOT a full-width bottom bar.

```
fixed left-1/2 -translate-x-1/2 bottom-6 z-50
h-16 px-3 rounded-full bg-white
shadow-[var(--shadow-dock)]
flex items-center gap-1
```

**Active dock icon (black circle):**

```
w-12 h-12 rounded-full bg-black text-white flex items-center justify-center
```

**Inactive dock icon:**

```
w-12 h-12 rounded-full text-muted-foreground flex items-center justify-center
hover:bg-secondary hover:text-foreground transition-colors
```

- **Icon-only** — no text labels in the dock
- Only ONE black active circle at a time — keeps the UI calm but clear
- The dock should feel elevated above content (strong shadow)

### Cards

**Base card (white on off-white canvas):**

```
rounded-[28px] bg-white p-5 shadow-[var(--shadow-card)]
hover:shadow-[var(--shadow-card-hover)] transition-shadow
```

**Tinted schedule/feature card:**

```
rounded-[28px] p-5 bg-[var(--card-tint-mint)]  (or peach/lavender)
min-h-[118px] relative overflow-hidden
```

Tinted cards: soft pastel fill, faint inner decorative gradient, no heavy shadow, date column left, title + subtitle center, avatar stack right.

- **Never add a visible border to cards**

### Inputs & Search

```
rounded-full bg-secondary border-0 px-5 py-3 text-sm
placeholder:text-muted-foreground focus:ring-2 focus:ring-ring
```

Search bar: pill with Lucide `Search` icon inside left (`pl-10`).

Textarea: `rounded-2xl bg-secondary border-0 px-5 py-3`

### Status Badges

```
inline-flex items-center rounded-full text-xs font-semibold px-3 py-1 border
```

Semantic colour classes (amber=pending, blue=confirmed, purple=on_the_way, emerald=completed, gray=cancelled, red=declined). Never raw hex — use Tailwind semantic colours.

### Date/Time Selector Strip

- Container: `flex gap-2 overflow-x-auto scrollbar-none -mx-5 px-5 py-2`
- Day cell: `flex flex-col items-center gap-0.5 rounded-2xl px-3.5 py-2.5 cursor-pointer min-w-[3.5rem] transition-all`
- Selected: `bg-primary text-primary-foreground` (black)
- Unselected: `text-muted-foreground hover:bg-secondary`

### List Rows

- Row: `flex items-center gap-3 py-3`
- Avatar: `h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0`
- Content: `flex-1 min-w-0` — name `text-sm font-semibold truncate`, preview `text-xs text-muted-foreground truncate mt-0.5`
- Right: `text-[11px] text-muted-foreground shrink-0`
- **NO divider lines** — spacing only

### Trust Signal Strip

- `flex gap-6 overflow-x-auto scrollbar-none py-6 md:grid md:grid-cols-4`
- Each item: icon `h-5 w-5 text-muted-foreground` + label `text-xs font-medium`

---

## Do Not

- Do not use pure white `#FFFFFF` as the page background — use off-white `#F1F1F3`
- Do not add borders to cards — shadow + canvas contrast only
- Do not use `rounded-lg` or smaller on cards — minimum `rounded-2xl`, prefer `rounded-[28px]`
- Do not use square buttons — all `rounded-full`
- Do not use `strokeWidth` outside `1.75`–`2` on icons
- Do not use divider lines between list rows
- Do not use hamburger menus on mobile — use floating bottom dock
- Do not show a full-width top header bar on desktop — use floating pill nav
- Do not add text labels to the mobile dock items — icon-only
- Do not use top visible borders on the bottom dock
- Do not show `owner_notes` or internal fields in public-facing components
- Do not use dark/black backgrounds on public pages
- Do not use teal for navigation active states — teal is CTAs only
- Do not use gold/amber as primary — amber is only for "pending" badge

---

## Current Enforceable Rules

### Mobile-First Layout

- All padding starts mobile: `px-4 py-8` then scales: `md:px-8 md:py-16`
- No fixed pixel widths on containers — use `max-w-*` with `w-full`
- Stack layouts vertically on mobile, switch to row/grid on `md:` breakpoint
- Touch targets minimum `h-10` (`min-h-[40px]`) — dock items are `h-12 w-12`

### Component Usage

- Use shadcn/ui components from `components/ui/` before building custom equivalents
- Never duplicate a shadcn/ui primitive — extend via `className` or `cn()` from `lib/utils.ts`
- Use `cn()` utility for conditional class merging — never string concatenation

### Server vs Client Components

- Pages and layouts are Server Components by default
- Only add `"use client"` for: forms, interactive state, browser APIs, event handlers
- Never make an entire page a client component — isolate interactivity to the smallest component

### Accessibility

- All images need `alt` text
- Form inputs must have associated `<label>` (use shadcn `Label` component)
- Interactive elements must be keyboard-navigable
- Use semantic HTML: `<main>`, `<nav>`, `<section>`, `<h1>`–`<h3>` hierarchy

### Consistency Checks

- Heading hierarchy: one `h1` per page, `h2` for sections, `h3` for subsections
- Status badges for `BookingStatus` must use consistent colour coding across all views
- Loading states must exist for every async data fetch (skeleton or spinner)
- Empty states must be handled — never render a blank section

---

## Review Output Format

For each issue found:

```
[PAGE/COMPONENT] path/to/file.tsx
Issue: description
Mobile impact: yes/no
Fix: recommendation
```
