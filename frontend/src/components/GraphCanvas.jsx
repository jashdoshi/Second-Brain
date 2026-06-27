import { useRef, useEffect, useLayoutEffect, useCallback, useMemo, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';

// ─── Color palettes ───────────────────────────────────────
const LIGHT = {
  bgCanvas:    '#f0f0f0',
  nodeHub:     '#1a1a1a',
  nodeMid:     '#888888',
  nodePerip:   '#c0c0c0',
  nodeFaded:   '#e0e0e0',
  nodeSelected:'#0a0a0a',
  nodeNeighbor:'#555555',
  linkDefault: '#c8c8c8',
  linkHighlight:'#a8a8a8',
  linkFaded:   'rgba(200,200,200,0.12)',
  ringStroke:  '#a0a0a0',
};

const DARK = {
  bgCanvas:    '#0a0a0a',
  nodeHub:     '#e8e8e8',
  nodeMid:     '#888888',
  nodePerip:   '#3b3b3b',
  nodeFaded:   '#1e1e1e',
  nodeSelected:'#f5f5f5',
  nodeNeighbor:'#b8b8b8',
  linkDefault: '#484848',
  linkHighlight:'#555555',
  linkFaded:   'rgba(70,70,70,0.12)',
  ringStroke:  '#565656',
};

function getTheme(isDark) { return isDark ? DARK : LIGHT; }

function baseColor(degree, theme) {
  if (degree >= 4) return theme.nodeHub;
  if (degree >= 2) return theme.nodeMid;
  return theme.nodePerip;
}

function baseVal(degree) {
  if (degree >= 4) return 6;
  if (degree >= 2) return 3;
  return 1;
}

function getBaseLabelColor(isDark) {
  return isDark ? '#ffffff' : '#000000';
}

function getFadedLabelColor(isDark) {
  return isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.22)';
}

function buildNodeLabelSprite(text, color, nodeSize) {
  const paddingX = 18;
  const paddingY = 10;
  const fontSize = 40;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    return new THREE.Group();
  }

  context.font = `500 ${fontSize}px "Space Grotesk", sans-serif`;
  const metrics = context.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const textHeight = fontSize;

  canvas.width = textWidth + paddingX * 2;
  canvas.height = textHeight + paddingY * 2;

  context.font = `500 ${fontSize}px "Space Grotesk", sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = color;
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  const aspectRatio = canvas.width / canvas.height;
  const labelHeight = Math.max(nodeSize * 1.5, 4.5);

  sprite.scale.set(labelHeight * aspectRatio, labelHeight, 1);
  sprite.position.set(0, nodeSize + labelHeight * 0.55 + 0.8, 0);

  return sprite;
}

export default function GraphCanvas({
  nodes,
  edges,
  highlightedNodeIds,
  selectedNode,
  dimmed,
  isDark,
  onNodeSelect,
  onClearHighlight,
}) {
  const fgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const theme = getTheme(isDark);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDimensions({ width: Math.floor(width), height: Math.floor(height) });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const degreeMap = useMemo(() => {
    const m = new Map();
    nodes.forEach((n) => m.set(n.id, 0));
    edges.forEach((e) => {
      m.set(e.from_id, (m.get(e.from_id) ?? 0) + 1);
      m.set(e.to_id,   (m.get(e.to_id)   ?? 0) + 1);
    });
    return m;
  }, [nodes, edges]);

  const neighborSet = useMemo(() => {
    if (!selectedNode) return new Set();
    const s = new Set();
    edges.forEach((e) => {
      if (e.from_id === selectedNode.id) s.add(e.to_id);
      if (e.to_id   === selectedNode.id) s.add(e.from_id);
    });
    return s;
  }, [selectedNode, edges]);

  const getNodeColor = useCallback((node) => {
    const deg = degreeMap.get(node.id) ?? 0;
    if (selectedNode) {
      if (node.id === selectedNode.id) return theme.nodeSelected;
      if (neighborSet.has(node.id))    return theme.nodeNeighbor;
      return theme.nodeFaded;
    }
    if (highlightedNodeIds.size > 0) {
      return highlightedNodeIds.has(node.id) ? baseColor(deg, theme) : theme.nodeFaded;
    }
    if (dimmed) return isDark ? '#2a2a2a' : '#d0d0d0';
    return baseColor(deg, theme);
  }, [degreeMap, selectedNode, neighborSet, highlightedNodeIds, dimmed, isDark, theme]);

  const getNodeVal = useCallback((node) => {
    const deg = degreeMap.get(node.id) ?? 0;
    if (selectedNode?.id === node.id) return 8;
    return baseVal(deg);
  }, [degreeMap, selectedNode]);

  const getNodeLabelColor = useCallback((node) => {
    const baseLabelColor = getBaseLabelColor(isDark);
    const fadedLabelColor = getFadedLabelColor(isDark);

    if (selectedNode) {
      if (node.id === selectedNode.id || neighborSet.has(node.id)) {
        return baseLabelColor;
      }
      return fadedLabelColor;
    }

    if (highlightedNodeIds.size > 0) {
      return highlightedNodeIds.has(node.id) ? baseLabelColor : fadedLabelColor;
    }

    if (dimmed) {
      return fadedLabelColor;
    }

    return baseLabelColor;
  }, [isDark, selectedNode, neighborSet, highlightedNodeIds, dimmed]);

  const getLinkColor = useCallback((link) => {
    if (selectedNode) {
      const src = link.source?.id ?? link.source;
      const tgt = link.target?.id ?? link.target;
      if (src === selectedNode.id || tgt === selectedNode.id) return theme.linkHighlight;
      return theme.linkFaded;
    }
    if (highlightedNodeIds.size > 0) {
      const src = link.source?.id ?? link.source;
      const tgt = link.target?.id ?? link.target;
      if (highlightedNodeIds.has(src) && highlightedNodeIds.has(tgt)) return theme.linkHighlight;
      return theme.linkFaded;
    }
    return theme.linkDefault;
  }, [selectedNode, highlightedNodeIds, theme]);

  const getLinkWidth = useCallback((link) => {
    if (selectedNode) {
      const src = link.source?.id ?? link.source;
      const tgt = link.target?.id ?? link.target;
      if (src === selectedNode.id || tgt === selectedNode.id) return 1.5;
    }
    return 0.8;
  }, [selectedNode]);

  const graphData = useMemo(() => ({
    nodes: nodes.map((n) => ({ ...n })),
    links: edges.map((e) => ({
      source:   e.from_id,
      target:   e.to_id,
      relation: e.relation,
    })),
  }), [nodes, edges]);

  const nodeLabelSprites = useMemo(() => {
    const sprites = new Map();

    nodes.forEach((node) => {
      const sprite = buildNodeLabelSprite(
        node.name,
        getNodeLabelColor(node),
        getNodeVal(node),
      );
      sprites.set(node.id, sprite);
    });

    return sprites;
  }, [nodes, getNodeLabelColor, getNodeVal]);

  // Rebuild node colors whenever theme flips or highlight set changes
  useEffect(() => {
    if (fgRef.current) fgRef.current.refresh?.();
  }, [isDark]);

  useEffect(() => {
    if (fgRef.current) fgRef.current.refresh?.();
  }, [highlightedNodeIds, selectedNode, dimmed]);

  // Fit on first load
  useEffect(() => {
    if (fgRef.current && nodes.length > 0) {
      setTimeout(() => fgRef.current?.zoomToFit(400, 80), 600);
    }
  }, [nodes.length]);

  const handleNodeClick = useCallback((node) => onNodeSelect(node), [onNodeSelect]);
  const handleBgClick   = useCallback(() => {
    onNodeSelect(null);
    onClearHighlight?.();
  }, [onNodeSelect, onClearHighlight]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      {nodes.length > 0 && dimensions.width > 0 && dimensions.height > 0 && (
        <ForceGraph3D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          backgroundColor={theme.bgCanvas}
          nodeColor={getNodeColor}
          nodeVal={getNodeVal}
          nodeLabel={(n) => `${n.name} (${n.type ?? 'concept'})`}
          nodeThreeObject={(node) => nodeLabelSprites.get(node.id) ?? new THREE.Group()}
          nodeThreeObjectExtend
          linkColor={getLinkColor}
          linkWidth={getLinkWidth}
          linkLabel={(l) => l.relation ?? ''}
          onNodeClick={handleNodeClick}
          onBackgroundClick={handleBgClick}
          enableNodeDrag
          showNavInfo={false}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
        />
      )}
    </div>
  );
}
