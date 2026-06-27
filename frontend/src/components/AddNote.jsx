import { useRef, useState } from 'react';
import { previewIngest, confirmIngest } from '../api.js';

const ACCEPTED = '.pdf,.docx,.md,.txt';
const STEP = { FORM: 'form', EXTRACTING: 'extracting', PREVIEW: 'preview', SAVING: 'saving' };

export default function AddNote({ onSuccess, onClose }) {
  const [step, setStep]       = useState(STEP.FORM);
  const [file, setFile]       = useState(null);
  const [source, setSource]   = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError]     = useState('');
  const inputRef = useRef(null);

  async function handleExtract() {
    if (!file) return;
    setStep(STEP.EXTRACTING);
    setError('');
    try {
      const result = await previewIngest(file, source);
      setPreview(result);
      setStep(STEP.PREVIEW);
    } catch (err) {
      setError('Extraction failed. Is the backend running?');
      setStep(STEP.FORM);
    }
  }

  async function handleConfirm() {
    setStep(STEP.SAVING);
    try {
      await confirmIngest(file, source);
      onSuccess();
    } catch {
      setError('Save failed. Is the backend running?');
      setStep(STEP.PREVIEW);
    }
  }

  function handleBack() {
    setStep(STEP.FORM);
    setPreview(null);
    setError('');
  }

  function handleFileDrop(e) {
    e.preventDefault();
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) setFile(dropped);
  }

  const previewNodes    = preview?.nodes ?? [];
  const previewEdges    = preview?.edges ?? [];
  const primaryEntities = previewNodes.slice(0, 3);
  const dimEntities     = previewNodes.slice(3);

  return (
    <div className="panel add-note-panel">
      <div className="panel__header">
        <span className="panel__title">
          {step === STEP.FORM || step === STEP.EXTRACTING ? 'upload document' : 'preview'}
        </span>
        <svg
          viewBox="0 0 10 10"
          width="10"
          height="10"
          style={{ cursor: 'pointer' }}
          onClick={onClose}
        >
          <line x1="2" y1="2" x2="8" y2="8" stroke="#ccc" strokeWidth="0.9" />
          <line x1="8" y1="2" x2="2" y2="8" stroke="#ccc" strokeWidth="0.9" />
        </svg>
      </div>

      {(step === STEP.FORM || step === STEP.EXTRACTING) && (
        <>
          {/* File drop zone */}
          <div className="add-note-section">
            <div className="field-label">document</div>
            <div
              className="file-dropzone"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
            >
              {file ? (
                <span className="file-name">{file.name}</span>
              ) : (
                <span className="file-placeholder">
                  drop a PDF, DOCX, or MD file here<br />or click to browse
                </span>
              )}
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED}
                style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          {/* Optional source */}
          <div className="add-note-section">
            <div className="field-label">source (optional)</div>
            <input
              className="field-input"
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. https://drive.google.com/..."
            />
          </div>

          {error && (
            <div style={{ padding: '0 12px', font: '300 8px var(--font-mono)', color: '#c00' }}>
              {error}
            </div>
          )}

          <div style={{ flex: 1 }} />

          <div className="add-note-actions">
            <button className="btn-cancel" onClick={onClose}>cancel</button>
            <button
              className="btn-primary"
              disabled={!file || step === STEP.EXTRACTING}
              onClick={handleExtract}
            >
              {step === STEP.EXTRACTING ? 'extracting…' : 'extract entities'}
            </button>
          </div>
        </>
      )}

      {(step === STEP.PREVIEW || step === STEP.SAVING) && (
        <>
          {/* Extracted entities */}
          <div className="add-note-entities" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 10 }}>
            <div className="field-label" style={{ marginBottom: 7 }}>extracted by ai</div>
            <div className="entity-tags">
              {primaryEntities.map((n, i) => (
                <span key={i} className="entity-tag">{n.name}</span>
              ))}
              {dimEntities.map((n, i) => (
                <span key={i} className="entity-tag entity-tag--dim">{n.name}</span>
              ))}
            </div>
            <div className="entity-summary">
              {`${previewNodes.length} nodes · ${previewEdges.length} edges — from ${preview?.filename ?? file?.name}`}
            </div>
          </div>

          {error && (
            <div style={{ padding: '0 12px', font: '300 8px var(--font-mono)', color: '#c00' }}>
              {error}
            </div>
          )}

          <div style={{ flex: 1 }} />

          <div className="add-note-actions">
            <button className="btn-cancel" onClick={handleBack} disabled={step === STEP.SAVING}>
              back
            </button>
            <button
              className="btn-primary"
              disabled={step === STEP.SAVING}
              onClick={handleConfirm}
            >
              {step === STEP.SAVING ? 'saving…' : 'add to brain'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
