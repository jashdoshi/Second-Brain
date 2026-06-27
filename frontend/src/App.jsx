import { useState, useEffect, useCallback } from 'react';
import { fetchGraph } from './api.js';
import GraphCanvas from './components/GraphCanvas.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import AddNote from './components/AddNote.jsx';
import NodeDetail from './components/NodeDetail.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';

const VIEWS = { GRAPH: 'graph', CHAT: 'chat', ADD: 'add', SETTINGS: 'settings' };

// ─── Sidebar icons (22×22 render, 16×16 viewBox) ─────────
const IconGraph = ({ active, dark }) => {
  const activeColor = dark ? '#d0d0d0' : '#111111';
  const dimColor    = dark ? '#555555' : '#999999';
  const linkActive  = dark ? '#686868' : '#888888';
  const linkDim     = dark ? '#404040' : '#cccccc';
  return (
    <svg viewBox="0 0 16 16" width="22" height="22">
      <circle cx="8"  cy="5"  r="2.5" fill={active ? activeColor : dimColor} />
      <circle cx="4"  cy="12" r="1.8" fill={active ? (dark ? '#888' : '#555') : (dark ? '#444444' : '#bbbbbb')} />
      <circle cx="12" cy="12" r="1.8" fill={active ? (dark ? '#888' : '#555') : (dark ? '#444444' : '#bbbbbb')} />
      <line x1="8" y1="5"  x2="4"  y2="12" stroke={active ? linkActive : linkDim} strokeWidth="1" />
      <line x1="8" y1="5"  x2="12" y2="12" stroke={active ? linkActive : linkDim} strokeWidth="1" />
      <line x1="4" y1="12" x2="12" y2="12" stroke={active ? linkActive : linkDim} strokeWidth="1" />
    </svg>
  );
};

const IconChat = ({ active, dark }) => {
  const color = active ? (dark ? '#d0d0d0' : '#111111') : (dark ? '#555555' : '#999999');
  return (
    <svg viewBox="0 0 16 16" width="22" height="22">
      <rect x="2" y="3" width="12" height="8" rx="1.5" stroke={color} strokeWidth="1.1" fill="none" />
      <line x1="5" y1="7" x2="11" y2="7" stroke={color} strokeWidth="1" />
      <path d="M4 11 L3 14 L7 11.5" stroke={color} strokeWidth="1" fill="none" />
    </svg>
  );
};

const IconPlus = ({ active, dark }) => {
  const color = active ? (dark ? '#d0d0d0' : '#111111') : (dark ? '#555555' : '#999999');
  return (
    <svg viewBox="0 0 16 16" width="22" height="22">
      <line x1="8" y1="3"  x2="8"  y2="13" stroke={color} strokeWidth="1.4" />
      <line x1="3" y1="8"  x2="13" y2="8"  stroke={color} strokeWidth="1.4" />
    </svg>
  );
};

const IconSearch = ({ dark }) => {
  const color = dark ? '#555555' : '#999999';
  return (
    <svg viewBox="0 0 16 16" width="22" height="22">
      <circle cx="7" cy="7" r="4" stroke={color} strokeWidth="1.1" fill="none" />
      <line x1="10.5" y1="10.5" x2="13" y2="13" stroke={color} strokeWidth="1.2" />
    </svg>
  );
};

const IconMcp = ({ dark }) => {
  const color = dark ? '#555555' : '#999999';
  return (
    <svg viewBox="0 0 16 16" width="22" height="22">
      <circle cx="8" cy="8" r="2"   stroke={color} strokeWidth="1"   fill="none" />
      <circle cx="8" cy="8" r="5.5" stroke={color} strokeWidth="0.9" fill="none" strokeDasharray="2.8 1.8" />
    </svg>
  );
};

// ─── Theme toggle (sun / moon) ────────────────────────────
const IconSun = () => (
  <svg viewBox="0 0 16 16" width="14" height="14">
    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.2" fill="none" />
    {[0,45,90,135,180,225,270,315].map((deg) => {
      const rad = (deg * Math.PI) / 180;
      const x1 = 8 + 4.5 * Math.cos(rad);
      const y1 = 8 + 4.5 * Math.sin(rad);
      const x2 = 8 + 6.2 * Math.cos(rad);
      const y2 = 8 + 6.2 * Math.sin(rad);
      return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />;
    })}
  </svg>
);

const IconMoon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14">
    <path d="M11 8.5A5 5 0 0 1 5.5 3a5 5 0 1 0 5.5 5.5z" stroke="currentColor" strokeWidth="1.2" fill="none" />
  </svg>
);

// ─── Brand logo icon — polygonal wireframe brain ──────────
const BrainIcon = () => (
  <svg
    viewBox="0 0 24 20"
    width="18"
    height="15"
    fill="none"
    aria-hidden="true"
    style={{ color: 'var(--text-faint)', flexShrink: 0 }}
  >
    {/* Polygonal brain outline — side view, two characteristic humps */}
    <polygon
      points="5,3 8,1 11,2 15,1 20,3 21,8 20,14 17,17 12,19 6,17 3,13 2,8"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    {/* Interior mesh lines */}
    <line x1="5"  y1="3"  x2="11" y2="7"  stroke="currentColor" strokeWidth="0.8"/>
    <line x1="8"  y1="1"  x2="11" y2="7"  stroke="currentColor" strokeWidth="0.8"/>
    <line x1="15" y1="1"  x2="11" y2="7"  stroke="currentColor" strokeWidth="0.8"/>
    <line x1="20" y1="3"  x2="16" y2="8"  stroke="currentColor" strokeWidth="0.8"/>
    <line x1="11" y1="7"  x2="16" y2="8"  stroke="currentColor" strokeWidth="0.8"/>
    <line x1="21" y1="8"  x2="16" y2="8"  stroke="currentColor" strokeWidth="0.8"/>
    <line x1="11" y1="7"  x2="9"  y2="13" stroke="currentColor" strokeWidth="0.8"/>
    <line x1="16" y1="8"  x2="15" y2="14" stroke="currentColor" strokeWidth="0.8"/>
    <line x1="9"  y1="13" x2="15" y2="14" stroke="currentColor" strokeWidth="0.8"/>
    <line x1="3"  y1="13" x2="9"  y2="13" stroke="currentColor" strokeWidth="0.8"/>
    <line x1="6"  y1="17" x2="9"  y2="13" stroke="currentColor" strokeWidth="0.8"/>
    {/* Interior vertex dots */}
    <circle cx="11" cy="7"  r="1.05" fill="currentColor"/>
    <circle cx="16" cy="8"  r="1.05" fill="currentColor"/>
    <circle cx="9"  cy="13" r="1.05" fill="currentColor"/>
    <circle cx="15" cy="14" r="1.05" fill="currentColor"/>
    {/* Key outline vertex dots */}
    <circle cx="8"  cy="1"  r="1.05" fill="currentColor"/>
    <circle cx="15" cy="1"  r="1.05" fill="currentColor"/>
    <circle cx="20" cy="3"  r="1.05" fill="currentColor"/>
  </svg>
);

export default function App() {
  const [view,               setView]               = useState(VIEWS.GRAPH);
  const [graphData,          setGraphData]           = useState({ nodes: [], edges: [] });
  const [highlightedNodeIds, setHighlightedNodeIds]  = useState(new Set());
  const [selectedNode,       setSelectedNode]        = useState(null);
  const [connected,          setConnected]           = useState(false);
  const [statusMsg,          setStatusMsg]           = useState('graph · idle');
  const [isDark,             setIsDark]              = useState(
    () => localStorage.getItem('sb-theme') === 'dark'
  );

  // Apply theme attribute to <html> so CSS variables resolve correctly
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('sb-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const loadGraph = useCallback(async () => {
    try {
      const data = await fetchGraph();
      setGraphData(data);
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  const handleNodeSelect = useCallback((node) => {
    setSelectedNode(node ?? null);
    if (node) setView(VIEWS.GRAPH);
  }, []);

  const handleHighlight = useCallback((ids) => {
    setHighlightedNodeIds(new Set(ids));
    setStatusMsg(`${ids.length} node${ids.length !== 1 ? 's' : ''} highlighted`);
  }, []);

  const handleQueryOpen = useCallback(() => {
    setSelectedNode(null);
    setView(VIEWS.CHAT);
    setStatusMsg('query · active');
  }, []);

  const handleAddOpen = useCallback(() => {
    setSelectedNode(null);
    setView(VIEWS.ADD);
    setStatusMsg('ingestion · ready');
  }, []);

  const handleGraphOpen = useCallback(() => {
    setView(VIEWS.GRAPH);
    setSelectedNode(null);
    setStatusMsg('graph · idle');
  }, []);

  const handleClearHighlight = useCallback(() => {
    setHighlightedNodeIds(new Set());
    setStatusMsg('graph · idle');
  }, []);

  const handleSettingsOpen = useCallback(() => {
    setSelectedNode(null);
    setView(VIEWS.SETTINGS);
    setStatusMsg('settings');
  }, []);

  const handleGraphCleared = useCallback(async () => {
    await loadGraph();
    setHighlightedNodeIds(new Set());
    setSelectedNode(null);
    setView(VIEWS.GRAPH);
    setStatusMsg('graph · cleared');
  }, [loadGraph]);

  const handleIngestSuccess = useCallback(async () => {
    await loadGraph();
    setView(VIEWS.GRAPH);
    setStatusMsg('graph · updated');
  }, [loadGraph]);

  const nodeCount = graphData.nodes.length;
  const edgeCount = graphData.edges.length;
  const dimGraph  = view === VIEWS.CHAT || view === VIEWS.ADD || view === VIEWS.SETTINGS;

  return (
    <div className="app">
      {/* Titlebar */}
      <div className="titlebar">
        <div className="titlebar__brand">
          <BrainIcon />
          <span className="titlebar__logo">second·brain</span>
        </div>

        {/* Theme toggle */}
        <button
          className="theme-toggle"
          onClick={() => setIsDark((d) => !d)}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ color: 'var(--text-faint)', background: 'none', border: 'none' }}
        >
          {isDark ? <IconSun /> : <IconMoon />}
        </button>

        <div className="titlebar__nav">
          <div
            className={`titlebar__tab ${view !== VIEWS.ADD ? 'titlebar__tab--active' : ''}`}
            onClick={handleGraphOpen}
          >
            graph
          </div>
          <div className="titlebar__tab">nodes</div>
          <div
            className={`titlebar__tab ${view === VIEWS.SETTINGS ? 'titlebar__tab--active' : ''}`}
            onClick={handleSettingsOpen}
          >
            settings
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="main">
        {/* Sidebar */}
        <div className="sidebar">
          <span className="sidebar__icon" onClick={handleGraphOpen}>
            <IconGraph active={view === VIEWS.GRAPH && !selectedNode} dark={isDark} />
          </span>
          <span className="sidebar__icon" onClick={handleQueryOpen}>
            <IconChat active={view === VIEWS.CHAT} dark={isDark} />
          </span>
          <span className="sidebar__icon" onClick={handleAddOpen}>
            <IconPlus active={view === VIEWS.ADD} dark={isDark} />
          </span>
          <div className="sidebar__divider" />
          <span className="sidebar__icon">
            <IconSearch dark={isDark} />
          </span>
          <span className="sidebar__icon">
            <IconMcp dark={isDark} />
          </span>
        </div>

        {/* Graph canvas */}
        <div className="canvas-area">
          {nodeCount > 0 && (
            <div className="canvas-stats">
              {`nodes ${nodeCount} · edges ${edgeCount}`}
            </div>
          )}
          <GraphCanvas
            nodes={graphData.nodes}
            edges={graphData.edges}
            highlightedNodeIds={highlightedNodeIds}
            selectedNode={selectedNode}
            dimmed={dimGraph}
            isDark={isDark}
            onNodeSelect={handleNodeSelect}
            onClearHighlight={handleClearHighlight}
          />
          {nodeCount === 0 && (
            <div className="canvas-empty">
              <svg viewBox="0 0 40 40" width="40" height="40">
                <circle cx="20" cy="12" r="6" fill="none" stroke="var(--empty-icon-stroke)" strokeWidth="1.2" />
                <circle cx="10" cy="30" r="4" fill="none" stroke="var(--empty-icon-stroke)" strokeWidth="1.2" />
                <circle cx="30" cy="30" r="4" fill="none" stroke="var(--empty-icon-stroke)" strokeWidth="1.2" />
                <line x1="20" y1="12" x2="10" y2="30" stroke="var(--empty-icon-stroke)" strokeWidth="0.8" />
                <line x1="20" y1="12" x2="30" y2="30" stroke="var(--empty-icon-stroke)" strokeWidth="0.8" />
              </svg>
              <div className="canvas-empty__label">no nodes yet</div>
              <div className="canvas-empty__hint">add a note to start building your graph</div>
            </div>
          )}
        </div>

        {/* Right panels */}
        {view === VIEWS.CHAT && (
          <ChatPanel
            onHighlight={handleHighlight}
            onClose={handleGraphOpen}
            isDark={isDark}
          />
        )}
        {view === VIEWS.ADD && (
          <AddNote
            onSuccess={handleIngestSuccess}
            onClose={handleGraphOpen}
          />
        )}
        {selectedNode && view === VIEWS.GRAPH && (
          <NodeDetail
            node={selectedNode}
            allNodes={graphData.nodes}
            allEdges={graphData.edges}
            onNodeSelect={handleNodeSelect}
            onClose={() => handleNodeSelect(null)}
          />
        )}
        {view === VIEWS.SETTINGS && (
          <SettingsPanel
            onClose={handleGraphOpen}
            onGraphCleared={handleGraphCleared}
          />
        )}
      </div>

      {/* Status bar */}
      <div className="statusbar">
        <div className={`status-dot status-dot--connected`} style={{ background: connected ? 'var(--dot-connected)' : '#c00' }} />
        <span className="status-text">{connected ? 'connected' : 'disconnected'}</span>
        <div className="status-dot status-dot--neo4j" />
        <span className="status-text">neo4j</span>
        {highlightedNodeIds.size > 0 && (
          <span className="status-text" style={{ color: 'var(--text-primary)' }}>
            {highlightedNodeIds.size} nodes highlighted
          </span>
        )}
        <span className="status-text status-text--right">{statusMsg}</span>
      </div>
    </div>
  );
}
