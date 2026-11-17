---
name: GeoNerds
description: "Restrained iOS-inspired geography play, with structural glass and readable content."
colors:
  primary: "oklch(0.535 0.21 258)"
  primary-foreground: "oklch(1 0 0)"
  background: "oklch(0.974 0.006 255)"
  foreground: "oklch(0.235 0.018 255)"
  card: "oklch(1 0 0)"
  muted: "oklch(0.94 0.009 255)"
  muted-foreground: "oklch(0.47 0.022 255)"
  border: "oklch(0.885 0.012 255)"
  success: "oklch(0.49 0.135 153)"
  danger: "oklch(0.55 0.21 25)"
  warning: "oklch(0.57 0.13 65)"
  glass: "oklch(0.995 0.003 255 / 0.83)"
  dark-primary: "oklch(0.71 0.155 253)"
  dark-primary-foreground: "oklch(0.18 0.035 255)"
  dark-background: "oklch(0.165 0.012 255)"
  dark-foreground: "oklch(0.965 0.006 255)"
  dark-card: "oklch(0.225 0.014 255)"
  dark-muted: "oklch(0.28 0.015 255)"
  dark-muted-foreground: "oklch(0.735 0.016 255)"
  dark-border: "oklch(0.335 0.016 255)"
  dark-success: "oklch(0.72 0.17 152)"
  dark-danger: "oklch(0.66 0.22 25)"
  dark-warning: "oklch(0.82 0.16 80)"
  dark-glass: "oklch(0.235 0.015 255 / 0.87)"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.333333
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.375
rounded:
  control: "12px"
  segment: "10px"
  segmented-group: "13px"
  surface: "16px"
  floating-nav: "22px"
  sheet-top: "24px"
  pill: "9999px"
spacing:
  compact: "4px"
  tight: "8px"
  control: "12px"
  inset: "16px"
  section: "20px"
  block: "24px"
  wide: "28px"
  spacious: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  button-secondary:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  button-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  navigation:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.floating-nav}"
    padding: "6px"
  category-chip-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.surface}"
---

# Design System: GeoNerds

## Overview

**Creative North Star: "Restrained iOS / Liquid Glass"**

GeoNerds uses a quiet, cool-neutral interface for choosing and playing geography games. Familiar controls, clear task hierarchy and accurate state feedback carry the experience. This is a web interface inspired by iOS, not a claim of native Apple behavior or certification.

Glass is structural: it distinguishes sticky navigation and game toolbars from opaque game content. The existing GeoNerds name, globe logo, real flags, geographic geometry and sourced imagery retain their identity; no decorative raster was added for this redesign. The user-pinned direction takes precedence over generic stylistic preferences.

**Key Characteristics:**

- Cool light and dark grounds with blue actions and semantic feedback colors.
- Opaque grouped content; translucent floating chrome with an opaque fallback.
- Compact Geist hierarchy, rounded controls and wrapping task status.
- Short state transitions, safe-area-aware navigation and reduced-motion support.

This is a source-derived record of the finished implementation, not an accessibility or whole-app verification certificate. Verification limits are recorded in `docs/geo-ux-overhaul-2026-11.md`.

## Colors

Cool near-neutral layers let the flags, maps and questions supply the subject's color. Frontmatter records the default light values and their explicit dark counterparts; live components use the corresponding CSS custom properties from `src/app/globals.css`. Sidecar tonal strips are synthesized previews, not additional production tokens.

### Primary

- **Clear Action Blue:** primary buttons, selected filters, active navigation and score emphasis.
- **Action Ink:** the paired foreground on filled blue controls; its dark-theme counterpart is intentionally dark.

### Secondary

- **Correct Green:** correct answers, positive state and success controls.
- **Error Red:** incorrect answers and destructive controls.
- **Attention Amber:** warning state. Feedback must remain understandable through text or icons.

### Neutral

- **Cool Ground:** the page background.
- **Reading Ink:** main text and content foreground.
- **Solid Surface:** opaque cards, question containers and fields.
- **Inset Neutral:** grouped settings and secondary controls.
- **Quiet Ink:** supporting copy and inactive controls.
- **Quiet Separator:** borders and list dividers.
- **Structural Glass:** translucent navigation material; not a question-area background.

**The State Pairing Rule.** Select foreground and background from the same theme; do not assume white text is correct on every accent in dark mode.

## Typography

**Display Font:** Geist, with a UI-sans/system fallback.

**Body Font:** Geist, with the same fallback.

Geist and Geist Mono are loaded by the root layout. The UI uses the sans face for headings and controls; game scores primarily use tabular numerals rather than a decorative display face.

### Hierarchy

- **Display:** the home title; the `display` token is the observed home heading, not an oversized marketing hero.
- **Headline:** setup game titles, using the `headline` token.
- **Section:** compact bold headings (typically 1.25rem), separated by space rather than ornamental labels.
- **Body:** supporting explanations use the relaxed `body` token; game prompts may be larger according to their task.
- **Label:** semibold controls use the `label` token. Library titles use a compact intermediate size (15px); summaries use 13px.
- **Caption:** supporting counts and HUD labels commonly use 12px. Bottom-navigation labels and the small Classic badge are 10px exceptions, not the default text scale.

**The Task Hierarchy Rule.** The game name, question and next action must outrank metadata; preserve text wrapping instead of shrinking the entire interface.

## Layout

The shared page container is full-width with a ceiling (1152px), centered with padding (28px 20px 40px). Below 640px, padding becomes (20px 16px 32px). Reused spacing steps are recorded in the frontmatter; the implementation is a compact 4px-based rhythm with occasional component-specific gaps.

Home becomes a main library plus a side column (280px) at 1024px. Below that, the side column follows the library. Filters scroll horizontally while their buttons retain their hit area. Setup uses a centered narrow column (576px); the game HUD uses a wider ceiling (768px) and allows status pills to wrap onto a new line.

Desktop navigation appears from 1024px. Smaller screens use a floating bottom bar with safe-area-aware padding. Game routes hide the global header and bottom navigation and use dedicated exit/help controls. The responsive help dialog is a bottom sheet on small screens and a centered panel from 640px, with a height ceiling (90dvh).

## Elevation & Depth

Content rests on solid tonal layers without decorative card shadows. Floating chrome combines blur (24px), saturation (1.6), a low ambient shadow and an inset highlight. Under reduced-transparency preference or absent backdrop-filter support, the material becomes opaque.

### Shadow Vocabulary

- **Light chrome:** `0 8px 28px oklch(0.25 0.025 255 / 0.09)`.
- **Dark chrome:** `0 10px 32px oklch(0.08 0.015 255 / 0.3)`.
- **Selected segment:** `0 2px 5px oklch(0.2 0.02 255 / 0.09)`.

**The Chrome-Only Glass Rule.** Keep translucent material on floating navigation and toolbars; keep questions, maps and answer content on opaque reading surfaces.

## Shapes

Soft rectangles define control and content families. Controls use the `control` radius; cards use `surface`; the floating navigation and mobile sheet have their own larger silhouettes. Segmented groups and their selected children have nested radii. Pills are reserved for filters and compact status, not every container.

Borders are quiet separators and state indicators, not an outline around every card. Actual flags and country geometry remain content, never fabricated decorative map shapes.

## Components

### Buttons

Tactile and restrained. The shared button supports primary, secondary, ghost, outline, danger and success variants. Default controls have a minimum height (44px); icon controls are square (44px). Large buttons have a minimum height (52px), and the setup start action overrides it to (56px) with wrapping text.

Primary, danger and success hover by brightness (1.1); secondary and ghost use tonal background changes. Pressing scales the shared button (0.98). Transitions are short (150ms), and reduced motion removes its transform. Disabled controls are dimmed (0.45) and do not receive pointer input. Focus uses a visible ring; semantic danger/success buttons use theme-specific text colors beyond their default frontmatter pairing.

### Chips

Home filter chips are filled blue when selected and quiet text otherwise. Their visible pill has a minimum height (32px), inside a button with a minimum hit height (44px). Selection is also exposed through `aria-pressed`.

### Cards / Containers

Opaque and softly grouped. The shared Card provides surface color and radius but no fixed padding or shadow; the consuming surface supplies spacing. Library groups use quiet dividers between full-width rows. Rows change tone on hover and press without lifting the whole card.

### Inputs / Fields

The shared field treatment uses a solid surface, a fine input border, a minimum height (44px), padding (10px 12px), readable text (1rem / 1.4), and a primary-colored focus border. Home search is a distinct inset variant with a height (48px), room for search/clear controls and a visible focus ring.

### Navigation

Sticky glass header and floating mobile bar share blue active states with a subtle blue tint. Text labels accompany Lucide SVG icons in bottom navigation. Current routes use `aria-current`; the header provides a keyboard skip link. Preserve the globe logo rather than substituting a generic icon.

### Segmented Settings, HUD and Help

Segmented settings use an inset track, opaque selected segments and short transitions (180ms ease-out). Setup exposes a useful quick-start path before its expandable advanced settings. HUD statistics use compact pills, tabular numerals and wrapping rather than forcing a single narrow line.

The help modal has exit, focus containment, Escape dismissal and focus restoration in source. Its panel motion is brief (200ms) and disabled when reduced motion is requested. Preserve explanatory answer feedback and an explicit next action where the game implements them; do not mistake automatic dismissal for the shared pattern.

## Do's and Don'ts

### Do:

- **Do** use the existing theme variables and pair foregrounds with their matching surfaces.
- **Do** keep task content opaque and reserve glass for navigation or toolbars.
- **Do** preserve meaningful labels, visible keyboard focus, wrapping text and safe-area spacing.
- **Do** retain authentic GeoNerds identity, flags, geographic outlines and source credits.
- **Do** honor reduced-motion and reduced-transparency preferences.

### Don't:

- **Don't** turn every content card into a blurred glass panel.
- **Don't** replace the pinned restrained direction with decorative auroras or page entrance choreography.
- **Don't** encode correct, incorrect, selected or training state through color alone.
- **Don't** treat this document as proof of measured contrast, browser completeness or flawless native iOS behavior.

Not canonized: task-specific uppercase advanced-setting labels, very small navigation/badge captions, and route-specific legacy styling are not promoted into reusable visual rules. Existing companion-product palettes remain scoped to their own routes. No unmeasured contrast or untested route behavior is legitimized by this record.
