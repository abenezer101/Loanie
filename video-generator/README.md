# Video Generator - Remotion Studio

## Overview
This service generates loan briefing videos using Remotion. You can visually edit the video templates using Remotion Studio.

## Running Remotion Studio

To launch the visual editor:

```bash
npm run studio
```

This will open Remotion Studio at `http://localhost:3002`

## Editing Video Templates

1. **Start the Studio**: Run `npm run studio`
2. **Navigate to LoanBriefing composition**: You'll see the composition in the Studio UI
3. **Edit visually**: 
   - Adjust timing and duration by dragging scenes
   - Preview changes in real-time
   - Modify props using the visual editor
4. **Edit code**: Changes made to files in the `remotion/` folder will hot-reload
   - `Root.tsx` - Composition configuration and default props
   - `Main.tsx` - Main composition component
   - `Scene.tsx` - Individual scene rendering logic

## File Structure

```
remotion/
├── index.tsx       # Entry point (registers root)
├── Root.tsx        # Composition definitions with sample data
├── Main.tsx        # Main video composition
├── Scene.tsx       # Scene renderer (renders each scene)
└── types.ts        # TypeScript type definitions
```

## How It Works

1. **AI generates JSON manifest** - The main app sends a video manifest (scenes, narration, visuals)
2. **Video Generator receives manifest** - `index.js` processes the request
3. **Remotion renders video** - Uses the templates in `remotion/` to render the final MP4
4. **Your edits persist** - Any changes you make to the template code will be used for all future renders

## Tips

- **Sample Data**: The default props in `Root.tsx` contain sample loan data so you can preview the video without running a full generation
- **Live Reload**: Changes to TypeScript files will automatically reload in Studio
- **Port Configuration**: Studio runs on port 3002 (configured in `remotion.config.ts`)
- **Template Editing**: Focus your edits on `Scene.tsx` - this is where the visual layout is defined

## Running the Production Server

```bash
npm start        # Production mode
npm run dev      # Development mode with auto-restart
```
