import { useState, useRef, useEffect } from 'react';
import { queryGraph } from '../api.js';

function ThinkingDots() {
  return (
    <div className="chat-thinking">
      <div className="chat-bubble__sender">brain ›</div>
      <div className="chat-thinking__dots">
        <div className="chat-thinking__dot" />
        <div className="chat-thinking__dot" />
        <div className="chat-thinking__dot" />
      </div>
    </div>
  );
}

function UserBubble({ text }) {
  return (
    <div className="chat-bubble--user">
      <p>{text}</p>
    </div>
  );
}

function AIBubble({ text, sourceNodeIds, sourceNodeNames, onSourceClick }) {
  return (
    <div className="chat-bubble--ai">
      <div className="chat-bubble__sender">brain ›</div>
      <div className="chat-bubble__body">
        <p>{text}</p>
      </div>
      {sourceNodeNames.length > 0 && (
        <div className="chat-bubble__sources">
          {sourceNodeNames.map((name, i) => (
            <span
              key={sourceNodeIds[i]}
              className="source-tag"
              onClick={() => onSourceClick(sourceNodeIds[i])}
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatPanel({ onHighlight, onClose, isDark }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend() {
    const q = input.trim();
    if (!q || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setLoading(true);

    try {
      const result = await queryGraph(q);
      const sourceIds   = result.source_node_ids ?? [];
      const sourceNames = result.source_node_names ?? sourceIds;
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: result.answer, sourceNodeIds: sourceIds, sourceNodeNames: sourceNames },
      ]);
      onHighlight(sourceIds);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'Could not reach the backend. Is it running?', sourceNodeIds: [], sourceNodeNames: [] },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') onClose();
  }

  function handleSourceClick(nodeId) {
    onHighlight([nodeId]);
  }

  return (
    <div className="panel chat-panel">
      <div className="panel__header">
        <span className="panel__title">query mode</span>
        <span className="panel__esc" onClick={onClose}>esc</span>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <UserBubble key={i} text={msg.text} />
          ) : (
            <AIBubble
              key={i}
              text={msg.text}
              sourceNodeIds={msg.sourceNodeIds}
              sourceNodeNames={msg.sourceNodeNames}
              onSourceClick={handleSourceClick}
            />
          )
        )}
        {loading && <ThinkingDots />}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <div className="chat-input-wrap">
          <input
            ref={inputRef}
            className="chat-input-field"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ask your brain..."
          />
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            aria-label="Send"
          >
            <svg viewBox="0 0 10 10" width="10" height="10">
              <path
                d="M2 5 L8 5 M6 3 L8 5 L6 7"
                stroke={isDark ? '#111111' : '#f5f5f5'}
                strokeWidth="1"
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
