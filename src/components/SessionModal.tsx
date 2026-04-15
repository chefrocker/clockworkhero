import React, { useState, useEffect, useRef } from 'react';
import { FaClock, FaSave, FaTimes, FaPlus, FaTrash, FaHistory } from 'react-icons/fa';
import { Project } from '../types';
import { toast } from './Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectId: string, desc: string, start: Date, end: Date) => void;
  onDelete?: (id: string) => void;
  onAddProject: (name: string, color: string, icon?: string, iconType?: 'app' | 'image') => void;
  start: Date | null;
  end: Date | null;
  projects: Project[];
  editingSessionId?: number;
  initialData?: { projectId: string; description: string } | null;
}

const HISTORY_KEY = 'clockwork_desc_history';
const HISTORY_MAX = 8;

function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(desc: string) {
  if (!desc.trim()) return;
  const prev = loadHistory().filter(d => d !== desc.trim());
  const next = [desc.trim(), ...prev].slice(0, HISTORY_MAX);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

const QUICK_PRESETS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '1h',  minutes: 60 },
  { label: '2h',  minutes: 120 },
  { label: '4h',  minutes: 240 },
];

export const SessionModal: React.FC<Props> = ({
  isOpen, onClose, onSave, onDelete, onAddProject,
  start, end, projects, editingSessionId, initialData
}) => {
  const [projectId,    setProjectId]    = useState('');
  const [description,  setDescription]  = useState('');
  const [startTime,    setStartTime]    = useState('');
  const [endTime,      setEndTime]      = useState('');
  const [durationMin,  setDurationMin]  = useState(0);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName,    setNewProjectName]    = useState('');
  const [confirmDelete,     setConfirmDelete]     = useState(false);
  const [showHistory,       setShowHistory]       = useState(false);
  const [history,           setHistory]           = useState<string[]>([]);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && start && end) {
      setProjectId(initialData?.projectId || '');
      setDescription(initialData?.description || '');
      setIsCreatingProject(false);
      setNewProjectName('');
      setConfirmDelete(false);
      setShowHistory(false);
      setHistory(loadHistory());

      setStartTime(start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
      setEndTime(end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
      setDurationMin(Math.round((end.getTime() - start.getTime()) / 60000));
    }
  }, [isOpen, start, end, initialData]);

  // History-Dropdown schließen bei Klick außerhalb
  useEffect(() => {
    if (!showHistory) return;
    const handler = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showHistory]);

  const updateDateFromTime = (originalDate: Date, timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const d = new Date(originalDate);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStartTime(val);
    if (start && end) {
      const s = updateDateFromTime(start, val);
      const e2 = updateDateFromTime(end, endTime);
      if (e2 < s) e2.setDate(e2.getDate() + 1);
      setDurationMin(Math.max(0, Math.round((e2.getTime() - s.getTime()) / 60000)));
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEndTime(val);
    if (start) {
      const s = updateDateFromTime(start, startTime);
      const e2 = updateDateFromTime(start, val);
      if (e2 < s) e2.setDate(e2.getDate() + 1);
      setDurationMin(Math.max(0, Math.round((e2.getTime() - s.getTime()) / 60000)));
    }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dur = parseInt(e.target.value, 10) || 0;
    setDurationMin(dur);
    if (start) {
      const s = updateDateFromTime(start, startTime);
      const newEnd = new Date(s.getTime() + dur * 60000);
      setEndTime(newEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    }
  };

  const applyPreset = (minutes: number) => {
    setDurationMin(minutes);
    if (start) {
      const s = updateDateFromTime(start, startTime);
      const newEnd = new Date(s.getTime() + minutes * 60000);
      setEndTime(newEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    }
  };

  const handleQuickCreateProject = () => {
    const name = newProjectName.trim();
    if (!name) return;
    if (name.length > 50) { toast.warning('Name zu lang', 'Maximal 50 Zeichen.'); return; }
    onAddProject(name, '#3498db', '', 'app');
    setIsCreatingProject(false);
    toast.success('Projekt erstellt', name);
  };

  const handleSave = () => {
    if (!projectId) { toast.warning('Kein Projekt gewählt', 'Bitte wähle ein Projekt aus.'); return; }
    if (!start || !end) return;

    const finalStart = updateDateFromTime(start, startTime);
    let finalEnd = updateDateFromTime(start, endTime);
    if (finalEnd <= finalStart) finalEnd.setDate(finalEnd.getDate() + 1);

    const ms = finalEnd.getTime() - finalStart.getTime();
    if (ms < 60_000)        { toast.warning('Zu kurz', 'Die Session muss mindestens 1 Minute lang sein.'); return; }
    if (ms > 24 * 3600_000) { toast.warning('Zu lang', 'Eine Session kann maximal 24 Stunden dauern.'); return; }

    saveHistory(description);
    onSave(projectId, description, finalStart, finalEnd);
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    if (onDelete && editingSessionId) {
      onDelete(`manual-${editingSessionId}`);
      onClose();
      toast.success('Eintrag gelöscht');
    }
  };

  // Dauer-Anzeige formatiert
  const durationLabel = durationMin >= 60
    ? `${Math.floor(durationMin / 60)}h ${durationMin % 60 > 0 ? `${durationMin % 60}m` : ''}`.trim()
    : `${durationMin}m`;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '700px' }}>

        <div className="modal-header">
          <FaClock size={20} />
          <h2>{editingSessionId ? 'Eintrag bearbeiten' : 'Arbeitszeit erfassen'}</h2>
          {start && (
            <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
              {start.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          )}
        </div>

        <div className="modal-body">

          {/* ── Zeit-Zeile ─────────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '12px' }}>
            <div className="input-group">
              <label htmlFor="session-start-time" className="input-label">Von</label>
              <input id="session-start-time" name="session-start-time" type="time"
                className="input-time" value={startTime} onChange={handleStartChange} />
            </div>
            <div className="input-group">
              <label htmlFor="session-end-time" className="input-label">Bis</label>
              <input id="session-end-time" name="session-end-time" type="time"
                className="input-time" value={endTime} onChange={handleEndChange} />
            </div>
            <div className="input-group">
              <label htmlFor="session-duration" className="input-label">
                Dauer (Min) &nbsp;
                <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>= {durationLabel}</span>
              </label>
              <input id="session-duration" name="session-duration" type="number"
                className="input-number" value={durationMin} onChange={handleDurationChange} min={1} />
            </div>
          </div>

          {/* ── Quick-Presets ──────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', alignSelf: 'center', marginRight: '4px' }}>Schnell:</span>
            {QUICK_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.minutes)}
                style={{
                  padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem',
                  border: `1px solid ${durationMin === p.minutes ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: durationMin === p.minutes ? 'var(--primary)' : 'var(--panel-bg)',
                  color: durationMin === p.minutes ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 0.15s', fontWeight: 600,
                }}
              >{p.label}</button>
            ))}
          </div>

          {/* ── Projekt ────────────────────────────────────────────────────── */}
          <div className="input-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="session-project-select" className="input-label">Projekt</label>
            {!isCreatingProject ? (
              <select id="session-project-select" name="session-project-select"
                className="input-select" value={projectId}
                onChange={e => { if (e.target.value === 'NEW') setIsCreatingProject(true); else setProjectId(e.target.value); }}
              >
                <option value="">-- Bitte wählen --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="NEW" style={{ fontWeight: 'bold', color: '#3b82f6' }}>+ Neues Projekt erstellen…</option>
              </select>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <input id="new-project-quick-name" name="new-project-quick-name"
                  className="input-text" placeholder="Projektname eingeben…"
                  value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleQuickCreateProject()}
                  autoFocus />
                <button className="btn-save" onClick={handleQuickCreateProject}><FaPlus /> Erstellen</button>
                <button className="btn-secondary" onClick={() => setIsCreatingProject(false)}><FaTimes /></button>
              </div>
            )}
          </div>

          {/* ── Beschreibung + Verlauf ──────────────────────────────────────── */}
          <div className="input-group" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label htmlFor="session-description" className="input-label" style={{ margin: 0 }}>Beschreibung</label>
              {history.length > 0 && (
                <button
                  onClick={() => setShowHistory(v => !v)}
                  style={{
                    background: showHistory ? 'var(--primary)' : 'none',
                    border: `1px solid ${showHistory ? 'var(--primary)' : 'var(--border-color)'}`,
                    borderRadius: '6px', padding: '2px 8px', cursor: 'pointer',
                    fontSize: '0.75rem', color: showHistory ? 'white' : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                  title="Zuletzt verwendete Beschreibungen"
                >
                  <FaHistory size={10} /> Verlauf
                </button>
              )}
            </div>

            {showHistory && (
              <div ref={historyRef} style={{
                position: 'absolute', top: '28px', right: 0, zIndex: 100,
                background: 'var(--panel-bg)', border: '1px solid var(--border-color)',
                borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                minWidth: '300px', maxWidth: '100%', overflow: 'hidden',
              }}>
                <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>
                  Zuletzt verwendet
                </div>
                {history.map((h, i) => (
                  <div key={i}
                    onClick={() => { setDescription(h); setShowHistory(false); }}
                    style={{
                      padding: '9px 14px', cursor: 'pointer', fontSize: '0.88rem',
                      color: 'var(--text-color)', borderBottom: i < history.length - 1 ? '1px solid var(--border-color)' : 'none',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-color)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {h}
                  </div>
                ))}
              </div>
            )}

            <textarea id="session-description" name="session-description"
              className="input-text" style={{ height: '90px', resize: 'none' }}
              placeholder="Was hast du erledigt?"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div>
            {editingSessionId && (
              <button className="btn-secondary" onClick={handleDelete}
                style={{
                  color: confirmDelete ? 'white' : '#ef4444',
                  borderColor: '#ef4444',
                  background: confirmDelete ? '#ef4444' : undefined,
                  transition: 'all 0.2s',
                }}
              >
                <FaTrash /> {confirmDelete ? 'Wirklich löschen?' : 'Löschen'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-close" onClick={onClose}><FaTimes /> Abbrechen</button>
            <button className="btn-save" onClick={handleSave}><FaSave /> Speichern</button>
          </div>
        </div>
      </div>
    </div>
  );
};
