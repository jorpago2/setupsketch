# SetupSketch design system

SetupSketch uses a modern-minimal, technical-austere system shared with the scientific tool suite. The interface stays quiet around the scientific drawing: one teal accent, green-tinted neutral surfaces, clear rules, and information revealed by the user.

## Structure

- App macrostructure: **Split Studio**. The canvas is the permanent work surface on desktop; Components and Properties are mutually exclusive contextual rails. On narrow screens the three become exclusive layers selected from a bottom bar.
- Navigation: **N9 edge-aligned minimal**, adapted as an application header. The wordmark, editable project name, essential edit controls, and two disclosures are the only persistent items.
- Content pages, if added later: **Long Document**, with stacked section heads and no decorative eyebrows.
- Marketing pages: not defined; this repository is an editor, not a landing page.
- Footer: none inside the editor viewport.

## Theme

- Route: custom tuned.
- Vibe: layered technical calm.
- Axes: light / geometric-sans / chromatic-teal.
- Accent use: active layer, focus, connection state, and primary export only; never a large surface.
- Depth: rules and surface lightness first; one restrained shadow for raised menus and the paper canvas.

## Typography

- Display and body: IBM Plex Sans, 400–700.
- Labels and numeric UI: IBM Plex Mono, 500–600, with tabular figures where values align.
- UI body floor: 12 px only for compact labels; editable content and explanatory text use 14 px or above.
- Scientific diagram export typography remains controlled by the export model and is not coupled to the interface font.

## Interaction

- Controls have default, hover, focus-visible, active, and disabled states without border-width changes.
- Touch targets are at least 44 × 44 px below 60 rem.
- Motion is cut to state colour changes and native disclosure behaviour. Reduced motion collapses all optional transitions.
- Components, Canvas, and Properties remain keyboard-accessible buttons with `aria-pressed` state.

## Responsive contract

- 320–959 px: one active workspace layer at a time; persistent bottom layer switcher; toolbar stays one line and scrolls horizontally rather than wrapping controls.
- 960 px and above: canvas stays visible; one contextual rail may open beside it.
- No horizontal page scroll, `100vw`, hover-only actions, or wrapped primary control labels.

## Exports

### CSS source of truth

The complete source is [`tokens.css`](tokens.css). Core roles:

```css
:root {
  --color-paper: oklch(97.2% 0.008 155);
  --color-paper-2: oklch(94.5% 0.012 175);
  --color-paper-3: oklch(91.5% 0.016 175);
  --color-rule: oklch(86% 0.018 175);
  --color-rule-2: oklch(75% 0.026 180);
  --color-muted: oklch(44% 0.022 190);
  --color-neutral: oklch(34% 0.024 195);
  --color-ink-2: oklch(38% 0.026 195);
  --color-ink: oklch(22% 0.025 205);
  --color-accent: oklch(45% 0.09 190);
  --color-accent-ink: oklch(98.5% 0.006 155);
  --color-focus: oklch(60% 0.17 210);
  --font-display: "IBM Plex Sans", ui-sans-serif, sans-serif;
  --font-body: "IBM Plex Sans", ui-sans-serif, sans-serif;
  --font-outlier: "IBM Plex Mono", ui-monospace, monospace;
}
```

### Tailwind v4

```css
@theme {
  --color-paper: oklch(97.2% 0.008 155);
  --color-paper-2: oklch(94.5% 0.012 175);
  --color-paper-3: oklch(91.5% 0.016 175);
  --color-rule: oklch(86% 0.018 175);
  --color-rule-2: oklch(75% 0.026 180);
  --color-muted: oklch(44% 0.022 190);
  --color-neutral: oklch(34% 0.024 195);
  --color-ink-2: oklch(38% 0.026 195);
  --color-ink: oklch(22% 0.025 205);
  --color-accent: oklch(45% 0.09 190);
  --color-focus: oklch(60% 0.17 210);
  --font-display: "IBM Plex Sans", ui-sans-serif, sans-serif;
  --font-body: "IBM Plex Sans", ui-sans-serif, sans-serif;
  --font-outlier: "IBM Plex Mono", ui-monospace, monospace;
  --spacing-3xs: 0.125rem;
  --spacing-2xs: 0.25rem;
  --spacing-xs: 0.5rem;
  --spacing-sm: 0.75rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2.5rem;
  --radius-card: 0.625rem;
  --radius-input: 0.5rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### DTCG tokens.json

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(97.2% 0.008 155)", "$type": "color" },
    "paper-2": { "$value": "oklch(94.5% 0.012 175)", "$type": "color" },
    "paper-3": { "$value": "oklch(91.5% 0.016 175)", "$type": "color" },
    "rule": { "$value": "oklch(86% 0.018 175)", "$type": "color" },
    "rule-2": { "$value": "oklch(75% 0.026 180)", "$type": "color" },
    "muted": { "$value": "oklch(44% 0.022 190)", "$type": "color" },
    "neutral": { "$value": "oklch(34% 0.024 195)", "$type": "color" },
    "ink-2": { "$value": "oklch(38% 0.026 195)", "$type": "color" },
    "ink": { "$value": "oklch(22% 0.025 205)", "$type": "color" },
    "accent": { "$value": "oklch(45% 0.09 190)", "$type": "color" },
    "focus": { "$value": "oklch(60% 0.17 210)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "IBM Plex Sans, ui-sans-serif, sans-serif", "$type": "fontFamily" },
    "body": { "$value": "IBM Plex Sans, ui-sans-serif, sans-serif", "$type": "fontFamily" },
    "outlier": { "$value": "IBM Plex Mono, ui-monospace, monospace", "$type": "fontFamily" }
  },
  "space": {
    "xs": { "$value": "0.5rem", "$type": "dimension" },
    "sm": { "$value": "0.75rem", "$type": "dimension" },
    "md": { "$value": "1rem", "$type": "dimension" },
    "lg": { "$value": "1.5rem", "$type": "dimension" }
  },
  "duration": {
    "micro": { "$value": "120ms", "$type": "duration" },
    "short": { "$value": "180ms", "$type": "duration" },
    "long": { "$value": "300ms", "$type": "duration" }
  }
}
```

### shadcn/ui variables

```css
:root {
  --background: 97.2% 0.008 155;
  --foreground: 22% 0.025 205;
  --card: 98.5% 0.006 155;
  --card-foreground: 22% 0.025 205;
  --popover: 99.2% 0.004 155;
  --popover-foreground: 22% 0.025 205;
  --primary: 45% 0.09 190;
  --primary-foreground: 98.5% 0.006 155;
  --secondary: 91.5% 0.016 175;
  --secondary-foreground: 38% 0.026 195;
  --muted: 94.5% 0.012 175;
  --muted-foreground: 44% 0.022 190;
  --accent: 45% 0.09 190;
  --accent-foreground: 98.5% 0.006 155;
  --destructive: 48% 0.16 25;
  --destructive-foreground: 98.5% 0.006 155;
  --border: 86% 0.018 175;
  --input: 86% 0.018 175;
  --ring: 60% 0.17 210;
  --radius: 0.625rem;
}
```
