# Scientific Tool Visual Architecture

## Purpose

This document defines the visual and interaction architecture for SetupSketch and provides a reusable model for related scientific web applications. The interface should reveal information progressively: the scientific result remains visible and dominant, while configuration, contextual properties, and secondary results appear only when the user requests them.

The architecture follows IBM Carbon Design System conventions and treats visual hierarchy, responsive behavior, accessibility, and interaction consistency as product requirements.

## Design principles

1. **The scientific result is the primary content.** Configuration controls support the result and must not compete with it.
2. **One stable application header.** Product identity, document context, and global actions belong to one continuous header divided into three functional regions.
3. **Progressive disclosure.** Tool options are hidden by default and exposed from a compact navigation rail.
4. **Context determines placement.** Tool-level options open from the left; properties of a selected scientific object appear on the right.
5. **One task at a time.** Only one tool-level panel should be open at once. A second activation of the active navigation item closes it.
6. **Comparable results use tabs.** Tabs are reserved for peer scientific results, not for navigation, settings, or workflow stages.
7. **Responsive priority is explicit.** On narrow screens, controls become overlays or sheets so that the scientific result is not permanently compressed.
8. **Carbon is the visual source of truth.** Components, tokens, typography, focus behavior, and interaction states should come from the installed Carbon implementation wherever applicable.

## Information hierarchy

The interface is organized into five layers, from global to contextual:

1. **Application layer:** tool identity and global document actions.
2. **Workflow layer:** component library, canvas settings, experiment configuration, and review tools.
3. **Result layer:** the principal scientific visualization or output.
4. **Selection layer:** properties of the selected component, connection, data series, or scientific object.
5. **Status layer:** save state, units, counts, validation, progress, warnings, and solver state.

These layers must remain distinct. In particular, document or experiment settings must not be mixed with the properties of a selected object.

## Desktop composition

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Tool identity        │ Document context and status │ Global actions          │
├────────┬──────────────┬─────────────────────────────┬─────────────────────────┤
│        │              │ Result tabs, when required  │                         │
│ Left   │ Tool options ├─────────────────────────────┤ Contextual properties   │
│ rail   │ hidden by    │                             │ shown only when an      │
│        │ default      │ Primary scientific result  │ object is selected      │
│        │              │                             │                         │
├────────┴──────────────┴─────────────────────────────┴─────────────────────────┤
│ Units · counts · validation · progress · warnings · scientific state          │
└──────────────────────────────────────────────────────────────────────────────┘
```

Recommended regions:

- Header: one Carbon-aligned row with a stable height.
- Navigation rail: approximately 80 px wide on desktop.
- Tool options panel: approximately 288–320 px wide when open.
- Contextual inspector: approximately 320 px wide when needed.
- Result region: consumes all remaining width and height.
- Status strip: a compact, persistent row at the bottom of the workbench.

These dimensions describe relationships rather than fixed page geometry. The result region must be allowed to grow and must remain usable at intermediate widths.

## Unified application header

The application uses a single header divided into three stable sections.

### 1. Tool identity

The left section identifies the application:

- Product mark or compact initial.
- Tool name, such as `SetupSketch`.
- Optional short descriptor, such as `Scientific diagram editor`.

The identity is not an interactive navigation substitute unless the product explicitly provides a home route.

### 2. Document context and status

The center section communicates what the user is currently editing:

- Editable project, experiment, or simulation name.
- Save state placed directly beside the name.
- A success icon with `Saved` after persistence completes.
- A progress state such as `Saving…` while persistence is pending.
- A clear error state when persistence fails.

The project name should be visually centered in the available header region rather than centered across the full viewport. Save feedback belongs close to the field because it describes that field's document state.

### 3. Global actions

The right section contains actions that affect the document as a whole:

- Undo and redo.
- Import or open.
- Export.
- Share or copy link when supported.
- Other document-level actions that are used frequently enough to justify permanent header placement.

Use icon-only controls only when the symbol is familiar and an accessible name and tooltip are provided. Less frequent actions should be grouped in an overflow menu instead of widening the header indefinitely.

The header must not contain component properties, experiment parameters, result tabs, or workflow navigation.

## Left navigation rail

The desktop navigation rail provides access to tool-level areas. For SetupSketch, the current categories are:

- **Components:** scientific component library.
- **Canvas:** document, layout, grid, and canvas configuration.
- **Experiment:** experiment-level metadata and configuration.
- **Review:** validation, checks, and publication preparation.

### Required behavior

- Options remain hidden until their navigation item is activated.
- Activating an inactive item opens its panel adjacent to the rail.
- Activating the same item again closes the panel.
- Activating another item replaces the current panel rather than stacking panels.
- A visible close action is provided inside the panel.
- `Escape` closes the active panel and returns focus to its trigger.
- The active navigation item exposes its expanded state programmatically.
- Closing a panel must not change or clear the scientific result.

### Placement rule

All workflow and tool-level panels open from the left. This creates one predictable spatial model: the user chooses a tool on the left and receives its options immediately beside it.

The current interface does not follow this consistently: `Components` opens on the left, while `Canvas`, `Experiment`, and `Review` open on the right. The target architecture moves all four tool-level panels to the left.

## Central scientific result region

The center of the workbench is permanently reserved for the most important scientific output. Depending on the application, this may be:

- An experimental setup diagram.
- A device geometry or mesh.
- An electromagnetic field distribution.
- A waveguide mode profile.
- A spectrum or transfer function.
- A current–voltage characteristic.
- A convergence or residual plot.
- A scientific image, table, or multidimensional viewer.

### Result-region rules

- The result is visible when the application opens whenever a meaningful result already exists.
- Opening configuration must not replace the result with a form.
- Closing all panels maximizes the result region.
- The result retains a stable coordinate system and does not reset zoom, pan, selection, or active result when panels open or close.
- Empty, loading, error, and unsolved states occupy the same region as the final result.
- Result-specific controls such as zoom, fit, cursor mode, scale, or display layers belong inside or immediately adjacent to the result region.
- Controls must not cover scientifically important labels, axes, legends, handles, or data.
- A toolbar over the result should contain only actions that directly manipulate or inspect that result.

For SetupSketch, the React Flow canvas is the primary result and editing surface. Its nodes, ports, connections, viewport controls, and selection states are domain-specific, but their color, focus, spacing, and feedback should remain consistent with Carbon.

## Multiple scientific results

Use Carbon tabs when a tool produces two or more peer results that the user may compare or inspect independently.

Examples:

- `Geometry | Mesh | Electric field | Magnetic field`
- `Mode profile | Effective index | Dispersion | Loss`
- `I–V | Band diagram | Carrier density | Recombination`
- `Time response | Spectrum | Phase | Convergence`

### Tab rules

- Do not display a tab bar for a single result.
- Place result tabs at the top of the result region, below the global header.
- Keep result tabs out of the left workflow rail and global header.
- Tabs represent equivalent views of the same scientific task, not sequential workflow steps.
- Preserve the available result viewport when switching tabs to prevent layout jumps.
- Preserve state per tab when useful, including zoom, cursor, selected trace, or display range.
- Use concise, domain-appropriate labels.
- Support keyboard navigation and expose the selected tab correctly.
- When the number of results cannot fit at narrow widths, use an accessible overflow behavior rather than shrinking labels below usability.

If results must be viewed simultaneously for comparison, tabs may be insufficient. A deliberate comparison mode can provide a split view, but it should only be introduced for a demonstrated scientific need.

## Right contextual inspector

The right side is reserved for properties of the currently selected scientific object. Examples include:

- Component identity and label.
- Position, rotation, and dimensions.
- Material or model assignment.
- Port, boundary, or connection properties.
- Trace appearance or selected data-series settings.
- Object-specific validation messages.

### Inspector rules

- The inspector remains closed when no object is selected.
- It opens or updates when the user selects an object.
- It never contains global canvas, project, experiment, or solver settings.
- Deselecting the object closes the inspector unless the product has a clearly communicated pin behavior.
- Editing a value provides immediate, reversible feedback where safe.
- Destructive actions are visually separated from routine properties.
- Long forms use clear sections or accordions; they must not become one uninterrupted list.

This separation prevents the ambiguity of a generic `Properties` panel whose contents change between document settings and object settings.

## Status and scientific feedback

A compact status strip may occupy the bottom of the workbench. It should report information that is useful while viewing the result but does not deserve permanent header space.

Potential content includes:

- Number of components and connections.
- Coordinate or cursor readout.
- Current units and scale.
- Solver state: not solved, queued, running, converged, or failed.
- Progress and elapsed time.
- Validation issue count.
- Active layer or dataset.
- Save state when it is not already shown in the header.

Status content should be short, non-interactive by default, and ordered by importance. Detailed logs, validation lists, and diagnostic information should open on demand.

## Progressive disclosure model

The interface should reveal information in this order:

1. Tool identity and current document.
2. Primary scientific result.
3. Result tabs, only when multiple peer results exist.
4. Tool options, after the user chooses a left-rail category.
5. Object properties, after the user selects an object.
6. Detailed diagnostics, logs, or advanced options, after an explicit request.

Advanced controls should not be visible merely because they exist. A control deserves permanent placement only when it is frequently used, affects the current result directly, and can be understood without additional context.

## Responsive behavior

### Large desktop and laptop

- Keep the rail vertical on the left.
- Keep the scientific result visible while a single side panel is open.
- Allow the user to close all panels and maximize the result.
- If both the tool panel and contextual inspector are open, close or overlay the less important panel before the result becomes unusably narrow.

### Compact desktop and tablet landscape

- Retain the same conceptual regions.
- Prefer overlaying the contextual inspector rather than reducing the result below its usable minimum.
- Shorten labels only when their meaning remains unambiguous.
- Move infrequent header actions into an overflow menu.

### Tablet portrait and mobile

- Keep a compact version of the unified header.
- Convert the left rail into a bottom navigation bar.
- Present tool options as a full-width sheet or overlay above the result.
- Present contextual properties as a sheet or dedicated layer rather than a permanently visible right column.
- Preserve a direct way to close every temporary layer.
- Return focus to the triggering control after a layer closes.
- Keep the result as the default workspace when no temporary layer is active.
- Do not require horizontal page scrolling.
- Do not rely on hover for essential information or actions.
- Keep interactive targets at least 44 × 44 px.

The navigation changes position on mobile, but its categories and interaction model remain the same. Responsive behavior must not create a different information architecture.

## Panel priority and conflict resolution

When available width cannot support every region simultaneously, use this priority:

1. Primary scientific result.
2. Active task controls required to operate on the result.
3. Result tabs.
4. Contextual object inspector.
5. Tool-level configuration panel.
6. Secondary status details.

This priority determines which panel becomes an overlay, collapses, or closes. It must never be implemented by clipping content or hiding page overflow to conceal a layout defect.

## Carbon visual language

### Components

Use installed Carbon components for standard controls such as buttons, icon buttons, tabs, text inputs, dropdowns, accordions, tooltips, notifications, menus, and loading states. Product-specific scientific elements may remain custom when Carbon has no equivalent.

### Tokens

Use Carbon or established project tokens for:

- Spacing and gutters.
- Typography and type scale.
- Background and layer colors.
- Borders and separators.
- Interactive, selected, disabled, and focus states.
- Motion duration and easing.

Avoid arbitrary colors, decorative shadows, gradients, excessive rounding, or one-off spacing values that weaken the Carbon hierarchy.

### Typography

- Use IBM Plex Sans for interface text.
- Use IBM Plex Mono selectively for coordinates, identifiers, numerical readouts, and logs.
- Keep scientific symbols and Greek characters in a font with complete glyph coverage.
- Maintain a clear distinction between tool identity, section headings, field labels, scientific annotations, and status text.

### Layers and surfaces

Use surface changes to communicate hierarchy:

- Header and navigation establish the application shell.
- Panels use an appropriate Carbon layer above the workbench background.
- The result surface remains visually quiet and optimized for scientific content.
- Selection and focus use Carbon interaction colors rather than decorative emphasis.

## Interaction states

Every interactive control must be reviewed in the following applicable states:

- Default.
- Hover.
- Keyboard focus.
- Active or pressed.
- Selected.
- Expanded or collapsed.
- Disabled.
- Loading.
- Error.
- Success.

Panel transitions should be brief and should not delay interaction. Opening or closing a panel must not unexpectedly move focus, clear a selection, reset a result, or alter scientific data.

## Accessibility requirements

- Use semantic controls and native behavior whenever possible.
- Give every icon-only button an accessible name and tooltip.
- Maintain a logical tab order: header, navigation, active panel, result controls, result content, contextual inspector, and status actions.
- Make active and expanded states available to assistive technology.
- Return focus to a panel trigger when its panel closes.
- Ensure tabs, menus, sheets, canvas controls, and inspectors are keyboard operable.
- Provide visible Carbon-aligned focus indicators.
- Do not communicate solver, validation, or save state using color alone.
- Announce meaningful asynchronous changes such as save failure, solver completion, or validation results without repeatedly interrupting the user.
- Keep scientific annotations readable at supported zoom levels and viewport sizes.

## Content resilience

The layout must remain stable with:

- Long project and experiment names.
- Localized navigation and action labels.
- Many result tabs.
- Long component names and scientific quantities.
- Missing optional values.
- Empty and unsolved states.
- Multiple validation warnings.
- Long units, symbols, and numerical values.
- Large datasets and slow calculations.

Text may truncate only when the full value is available through an accessible mechanism and truncation does not remove essential scientific meaning.

## Observed SetupSketch baseline

Browser inspection of the current Pump–probe workspace established the following baseline:

| Viewport | Header | Navigation | Primary result | Panel behavior | Overflow |
| --- | --- | --- | --- | --- | --- |
| 1440 × 900 | Single 48 px header | Left 80 px rail | Central React Flow canvas | Components opens left; other tool panels open right | No page overflow observed |
| 390 × 844 | Single 48 px header | Bottom 64 px navigation | Central scaled canvas | Temporary workspace layers | No page overflow observed |

At 1440 × 900 with panels closed, the canvas occupies approximately 90% of the usable page width. This is the desired default emphasis. The main structural inconsistency is the mixed placement of tool-level panels.

## Target changes for SetupSketch

1. Preserve the existing single, three-part application header.
2. Keep save status directly beside the editable document name and include a success icon for the saved state.
3. Keep the four workflow categories in the left rail on desktop and bottom navigation on mobile.
4. Move `Canvas`, `Experiment`, and `Review` panels to the left, matching `Components`.
5. Make workflow panels mutually exclusive and toggleable from their active trigger.
6. Reserve the right side for properties of the selected node or connection.
7. Keep the React Flow canvas mounted and visually dominant while panels open and close.
8. Add result tabs only when SetupSketch introduces multiple peer scientific result views.
9. Keep counts and document/canvas state in the bottom status strip.
10. Verify the complete behavior across desktop, laptop, tablet, and mobile widths.

## Validation matrix

Significant interface changes should be checked at minimum at:

- 1440 × 900 — desktop.
- 1280 × 800 — laptop.
- 1024 × 768 — compact desktop or tablet landscape.
- 768 × 1024 — tablet portrait.
- 390 × 844 — mobile.

For each relevant viewport, verify:

- Header alignment and truncation.
- Navigation placement and active state.
- Panel opening, replacement, and closing.
- Escape behavior and focus return.
- Result visibility and minimum usable size.
- Result tabs and keyboard navigation when present.
- Contextual inspector behavior with and without selection.
- Zoom, pan, selection, and result state preservation.
- Long labels and document names.
- Loading, empty, error, success, and validation states.
- Absence of horizontal page overflow, clipping, overlap, or controls outside the viewport.
- Absence of relevant console and runtime errors.

## Definition of done

The visual architecture is correctly implemented when:

1. One header contains identity, document context, and global actions in three stable regions.
2. Tool-level navigation is vertical on desktop and becomes bottom navigation on mobile.
3. Tool options are hidden by default, mutually exclusive, and opened from the navigation side.
4. The central scientific result remains the dominant and persistent workspace.
5. Peer results use accessible tabs without introducing unnecessary navigation.
6. Selection properties are separated from document and workflow settings.
7. Temporary panels never rely on clipped or hidden overflow to appear correct.
8. Responsive behavior preserves the same information hierarchy across supported viewports.
9. Carbon components, tokens, typography, and interaction states are used appropriately.
10. Browser verification confirms the intended layout and interactions at the defined viewport matrix.

