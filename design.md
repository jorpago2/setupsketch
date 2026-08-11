# SetupSketch visual contract

## Shared contract (normative)

This application consumes `@jorpago2/scientific-ui` and follows the [shared interface contract](https://github.com/jorpago2/jorpago2.github.io/blob/main/docs/interface-contract.md). React Flow nodes, ports, routing and diagram export are local scientific-editor exceptions.

SetupSketch uses Carbon Design System as its visual source of truth. This contract replaces the previous custom interface contract; compatibility with the old look is not a requirement.

## System

- Theme: Carbon `g10`.
- Typography: IBM Plex Sans throughout, including coordinates, identifiers and numerical readouts.
- Color, spacing, focus, motion and component states come from Carbon tokens.
- Controls and panels are square. Do not restore decorative radii, pills, gradients or ornamental shadows.
- Blue identifies actions and selection. Red is reserved for destructive or error states.

## Product structure

The functional workspace remains a split engineering workbench:

1. A compact application bar contains project identity and global actions.
2. The left rail switches between the component library and the canvas.
3. The canvas is the primary working surface and remains implemented with React Flow.
4. Document properties describe layout, canvas and project settings.
5. Selection properties describe only the currently selected node or connection.

Document and selection properties must never be merged into one inspector.

## Components

Use `@carbon/react` and `@carbon/react/icons` before creating custom controls. The current baseline uses Carbon Button, IconButton, Popover and Accordion. Native scientific inputs may remain when Carbon has no direct equivalent, but their visual states must use Carbon tokens and preserve accessible labels.

Canvas nodes, ports, edges and React Flow controls are product-specific. They should use Carbon color and focus tokens without pretending to be standard Carbon components.

## Responsive behavior

- Desktop keeps the canvas visible while a library or inspector opens beside it.
- Mobile shows one workspace layer at a time and keeps the two primary workspace switches reachable at the bottom.
- Repeating an active switch closes its panel and returns to the canvas.
- Menus close from the trigger, outside click or Escape.
- Touch targets remain at least 44 px and no essential action depends on hover.

## Source of truth

- Carbon Sass is loaded from `src/styles.scss`.
- `tokens.css` contains only stable aliases needed by existing canvas and domain styles.
- Tailwind, Headless UI and Heroicons are not part of the stack.
- New visual rules should use Carbon components or tokens instead of extending the alias layer.
