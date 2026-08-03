# SetupSketch

Browser-based editor for optical, photonic, and electronic experimental setup diagrams.

## Features

- Scientific component library with drag-and-drop positioning
- Directed connections, labels, rotation, and color controls
- Undo/redo and automatic local saving
- SVG, high-resolution PNG, PDF, and editable JSON export
- Static deployment to GitHub Pages

## Development

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite. Production validation uses `pnpm test`.

## PDF export

The PDF button opens the browser print dialog with an A4 landscape, diagram-only layout. Select **Save as PDF** to retain vector text and shapes.
