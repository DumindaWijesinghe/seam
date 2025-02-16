# Seam - Parametric Pattern Drafting Application

A web-based tool for creating and manipulating sewing patterns with parametric controls. Built with p5.js, this application aims to revolutionize pattern drafting by providing a digital, precise, and interactive environment.

## Motivation

Traditional pattern drafting methods often involve manual measurements, paper patterns, and complex calculations. Seam aims to modernize this process by:

- Enabling digital pattern creation with precise measurements
- Allowing parametric adjustments to patterns
- Providing instant visual feedback for changes
- Supporting accurate measurements and scaling
- Facilitating easy modifications and iterations

## Features

### Drawing Tools
- **Line Tool**: Create precise lines with snapping capabilities
- **Point Tool**: Place points on lines or freely on the canvas
- **Select Tool**: Modify existing elements
  - Drag lines and points
  - Resize lines using handles
  - Edit line lengths directly by clicking on measurements
- **Snap Mode**: Automatically snap to grid points and existing elements

### Measurement and Grid
- Configurable grid system with zoom functionality
- Real-time measurements displayed on lines
- Support for metric measurements (centimeters)
- Precise point placement with relative distances shown

### Editing Capabilities
- Undo/Redo functionality
- Line length editing through direct input
- Point and line dragging with maintained relationships
- Snap-to-grid and snap-to-element features

### Interface
- Intuitive toolbar for tool selection
- Dynamic zoom slider for detail work
- Informative tooltip system
- High-contrast display of selected and highlighted elements

## Setup

1. Clone the repository:
```bash
git clone [repository-url]
cd seam
```

2. Install dependencies:
- Ensure you have a web server installed (e.g., live-server, http-server)
- The application uses p5.js, which is included via CDN

3. Start the development server:
```bash
# If using live-server
live-server

# If using http-server
http-server
```

4. Open your browser and navigate to `http://localhost:8080` (or the port shown in your terminal)

## Usage

### Basic Operations

1. **Drawing Lines**
   - Select the line tool (first button)
   - Click to set start point
   - Click again to set end point
   - Use snap mode for precise connections

2. **Adding Points**
   - Select the point tool (fourth button)
   - Click anywhere to place a point
   - Hover over lines to snap points to them

3. **Selecting and Editing**
   - Select the select tool (third button)
   - Click elements to select them
   - Drag handles to resize lines
   - Click measurements to edit them directly
   - Drag points or lines to move them

4. **Zoom Control**
   - Use the slider at the bottom right
   - Zoom range: 0.5x to 4x

### Keyboard Shortcuts

- `Ctrl + Z`: Undo
- `Ctrl + Shift + Z`: Redo
- `Enter`: Confirm length edit
- `Escape`: Cancel length edit

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[Add your chosen license here]

## Future Plans

- Pattern piece creation and management
- Measurement presets and sizing systems
- Export functionality (PDF, DXF)
- Custom seam allowance settings
- Pattern grading capabilities
- Dart manipulation tools 