# SetupSketch

Browser-based editor for optical, photonic, and electronic experimental setup diagrams.

## Features

- Original library of optical, photonic, laboratory hardware, and RF/electronic components
- Separate beam and signal connections with independent visibility layers
- Drag positioning, labels, rotation, and color controls
- Undo/redo and automatic local saving
- SVG, high-resolution PNG, PDF, and editable JSON export
- Static deployment to GitHub Pages

All symbols are generic original sketches; the project is not affiliated with or endorsed by any equipment manufacturer.

## Development

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite. Production validation uses `pnpm test`.

## PDF export

The PDF button opens the browser print dialog with an A4 landscape, diagram-only layout. Select **Save as PDF** to retain vector text and shapes.
