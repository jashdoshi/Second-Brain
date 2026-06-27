import { useState } from 'react';
import { clearGraph } from '../api.js';

export default function SettingsPanel({ onClose, onGraphCleared }) {
  const [confirming, setConfirming] = useState(false);
  const [clearing,   setClearing]   = useState(false);
  const [error,      setError]       = useState(null);

  async function handleConfirmClear() {
    setClearing(true);
    setError(null);
    try {
      await clearGraph();
      setConfirming(false);
      onGraphCleared();
    } catch (err) {
      setError(err.message ?? 'Failed to clear graph');
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="panel settings-panel">
      <div className="panel__header">
        <span className="panel__title">settings</span>
        <span className="panel__esc" onClick={onClose}>esc</span>
      </div>

      <div className="settings-section">
        <div className="settings-section__label">data</div>

        <div className="settings-danger-zone">
          <div className="settings-danger-zone__title">danger zone</div>

          {!confirming ? (
            <div className="settings-row">
              <div className="settings-row__info">
                <div className="settings-row__name">reset graph</div>
                <div className="settings-row__desc">
                  permanently deletes all nodes and edges from neo4j
                </div>
              </div>
              <button
                className="btn-danger"
                onClick={() => setConfirming(true)}
              >
                reset
              </button>
            </div>
          ) : (
            <div className="settings-confirm">
              <div className="settings-confirm__msg">
                this will delete all nodes and edges. this cannot be undone.
              </div>
              {error && (
                <div className="settings-confirm__error">{error}</div>
              )}
              <div className="settings-confirm__actions">
                <button
                  className="btn-cancel"
                  onClick={() => { setConfirming(false); setError(null); }}
                  disabled={clearing}
                >
                  cancel
                </button>
                <button
                  className="btn-danger"
                  onClick={handleConfirmClear}
                  disabled={clearing}
                >
                  {clearing ? 'clearing…' : 'yes, delete all'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
