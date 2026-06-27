# react-force-graph-3d — 3D Graph Rendering

## What is it?

`react-force-graph-3d` is a React component that renders an interactive 3D graph in the browser. You give it nodes and links, and it:

- Runs a physics simulation (force-directed layout) so nodes arrange themselves naturally
- Renders everything in 3D using WebGL (via Three.js under the hood)
- Handles mouse/touch interaction (rotate, zoom, click)

The result: a 3D floating web of concepts you can spin around and explore.

---

## Why force-directed layout?

A force-directed graph treats edges as springs (attraction) and nodes as magnets (repulsion). The simulation runs until everything settles into a stable position where:
- Connected nodes are pulled together (because of their shared edge)
- Unconnected nodes push apart (to avoid clutter)

The result is a layout where **clusters of related concepts naturally group together** — you can visually see which topics are tightly connected without reading any labels.

---

## How it's used in this project

### `GraphCanvas.jsx`

The actual component is significantly more sophisticated than a basic wrapper. Key behaviours:

**Node color** — varies by degree (how many edges a node has) and context:
- Hub nodes (4+ edges): darkest color
- Mid nodes (2-3 edges): medium color
- Peripheral nodes (0-1 edges): lightest color
- When a node is selected: all non-neighbors are faded out
- When query results are highlighted: non-highlighted nodes are faded out
- Light and dark themes have separate color palettes

**Node size** — controlled by `nodeVal`:
- Hub nodes (4+ edges): size 6
- Mid nodes (2-3 edges): size 3
- Peripheral nodes: size 1
- Selected node: size 8 (enlarged)

**Custom 3D labels** — node names are rendered as canvas-based `THREE.Sprite` objects positioned above each node, using the "Space Grotesk" font. This is done via `nodeThreeObject` and `nodeThreeObjectExtend`.

**Responsive sizing** — the canvas fills its container using a `ResizeObserver` to track container dimensions.

**Interactions:**
- Click a node → opens `NodeDetail` panel in `App.jsx`
- Click background → clears selection and highlights

---

## Basic usage pattern

```jsx
import ForceGraph3D from 'react-force-graph-3d';

<ForceGraph3D
  graphData={{ nodes: [...], links: [...] }}
  nodeColor={node => colorFunction(node)}
  nodeVal={node => sizeFunction(node)}
  nodeLabel={node => `${node.name} (${node.type})`}
  nodeThreeObject={node => custom3DObject(node)}
  nodeThreeObjectExtend    // adds 3D object ON TOP of default sphere (not replacing it)
  linkColor={link => colorFunction(link)}
  linkWidth={link => widthFunction(link)}
  linkLabel={link => link.relation}
  onNodeClick={node => handleClick(node)}
  onBackgroundClick={() => clearSelection()}
  backgroundColor="#0a0a0a"
  width={containerWidth}
  height={containerHeight}
/>
```

---

## The graphData format

```js
// Nodes: any properties you want, but must have `id`
const graphData = {
  nodes: [
    { id: "uuid-1", name: "RAG", type: "concept" },
    { id: "uuid-2", name: "Vector Search", type: "concept" },
  ],
  links: [
    { source: "uuid-1", target: "uuid-2", relation: "uses" }
  ]
};
```

After the simulation runs, `source` and `target` in each link are **replaced** by the actual node objects (not just IDs). So in color/width callbacks, you need to handle both:
```js
const srcId = link.source?.id ?? link.source;  // could be object or string
```

---

## The highlight flow

```
User asks question in ChatPanel
    ↓
POST /query → returns answer + source_node_ids
    ↓
ChatPanel calls onHighlight(source_node_ids)
    ↓
highlightedNodeIds state updates in App.jsx
    ↓
GraphCanvas re-renders with new colors
    ↓
Highlighted nodes remain visible, others fade out
```

---

## Key props

| Prop | What it does |
|---|---|
| `graphData` | `{ nodes: [...], links: [...] }` |
| `nodeColor` | Function returning a color string per node |
| `nodeVal` | Function returning a size value per node |
| `nodeThreeObject` | Function returning a custom Three.js Object3D per node |
| `nodeThreeObjectExtend` | If true, adds the custom object on top of the default sphere |
| `onNodeClick` | Callback when a node is clicked |
| `onBackgroundClick` | Callback when empty space is clicked |
| `nodeLabel` | Tooltip text shown on hover |
| `linkColor` | Function returning a color per link |
| `linkWidth` | Function returning a line width per link |
| `linkLabel` | Label shown on edge hover |
| `d3AlphaDecay` | How fast the simulation settles (lower = longer animation) |
| `d3VelocityDecay` | Node damping (higher = less bouncy) |

---

## Performance consideration

The 3D rendering is GPU-intensive. For very large graphs (thousands of nodes), the simulation can slow down. At company knowledge graph scale (hundreds of nodes), it performs well.

---

*Last updated: 2026-06-28*
