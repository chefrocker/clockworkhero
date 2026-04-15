import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FaTimes, FaSearch, FaTrash, FaPencilAlt, FaClock } from 'react-icons/fa';
import { Project } from '../types';
import { AppIcon } from './AppIcon';

interface CalendarEvent {
  id: string;
  start: Date | string;
  end:   Date | string;
  extendedProps: {
    type:         string;
    dbId?:        number;
    projectId?:   number;
    projectName?: string;
    projectColor?: string;
    projectIcon?: string;
    projectIconType?: 'app' | 'image';
    description?: string;
  };
}

interface Props {
  isOpen:   boolean;
  onClose:  () => void;
  events:   CalendarEvent[];
  projects: Project[];
  onEdit:   (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(d: Date) {
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
}
function fmtDur(ms: number) {
  const m = Math.round(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 > 0 ? `${m % 60}m` : ''}`.trim() : `${m}m`;
}

export const SessionsPanel: React.FC<Props> = ({ isOpen, onClose, events, onEdit, onDelete }) => {
  const [query,         setQuery]         = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 80); }
  }, [isOpen]);

  // Nur manuelle Sessions, sortiert nach Startzeit absteigend
  const sessions = useMemo(() => {
    return events
      .filter(e => e.extendedProps?.type === 'manual')
      .map(e => ({ ...e, start: new Date(e.start), end: new Date(e.end) }))
      .sort((a, b) => b.start.getTime() - a.start.getTime());
  }, [events]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return sessions;
    return sessions.filter(s =>
      (s.extendedProps.description || '').toLowerCase().includes(q) ||
      (s.extendedProps.projectName || '').toLowerCase().includes(q)
    );
  }, [sessions, query]);

  // Gesamtstunden der gefilterten Sessions
  const totalHours = filtered.reduce(
    (sum, s) => sum + (s.end.getTime() - s.start.getTime()) / 3600000, 0
  );

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      onDelete(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 4000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ width: '620px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: 0 }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 20px 14px', borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
        }}>
          <FaClock style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-color)' }}>
              Sessionen
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {filtered.length} Einträge · {totalHours.toFixed(1)}h gesamt
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
            <FaTimes size={16} />
          </button>
        </div>

        {/* Suchleiste */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <FaSearch size={12} style={{
              position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-secondary)', pointerEvents: 'none',
            }} />
            <input
              ref={inputRef}
              className="input-text"
              placeholder="Suche nach Beschreibung oder Projekt…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ paddingLeft: '34px', width: '100%', boxSizing: 'border-box' }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px' }}
              >
                <FaTimes size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Liste */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {query ? 'Keine Treffer für diese Suche.' : 'Noch keine Sessionen im sichtbaren Zeitraum.'}
            </div>
          ) : (
            filtered.map(s => {
              const durationMs = s.end.getTime() - s.start.getTime();
              const color      = s.extendedProps.projectColor || '#94a3b8';
              const isConfirm  = confirmDelete === s.id;

              return (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '11px 20px',
                  borderBottom: '1px solid var(--border-color)',
                  borderLeft: `3px solid ${color}`,
                  background: isConfirm ? '#fef2f2' : 'transparent',
                  transition: 'background 0.15s',
                }}>
                  {/* Projekt-Icon */}
                  <div style={{ flexShrink: 0, width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {s.extendedProps.projectIconType === 'image' && s.extendedProps.projectIcon ? (
                      <img src={s.extendedProps.projectIcon} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', display: 'block' }} />
                    ) : (
                      <AppIcon appName={s.extendedProps.projectName || ''} fallbackColor={color} size={24} />
                    )}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                        {s.extendedProps.description || s.extendedProps.projectName || '–'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color, fontWeight: 600, flexShrink: 0 }}>
                        {s.extendedProps.projectName}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {fmtDate(s.start)} · {fmtTime(s.start)} – {fmtTime(s.end)} · {fmtDur(durationMs)}
                    </div>
                  </div>

                  {/* Aktionen */}
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button
                      onClick={() => { onEdit(s as any); onClose(); }}
                      title="Bearbeiten"
                      style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-color)'; e.currentTarget.style.color = 'var(--text-color)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      <FaPencilAlt size={11} />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      title={isConfirm ? 'Wirklich löschen?' : 'Löschen'}
                      style={{
                        background: isConfirm ? '#ef4444' : 'none',
                        border: `1px solid ${isConfirm ? '#ef4444' : 'var(--border-color)'}`,
                        borderRadius: '6px', padding: '4px 8px', cursor: 'pointer',
                        color: isConfirm ? 'white' : '#ef4444',
                        transition: 'all 0.15s', fontSize: '0.75rem', fontWeight: isConfirm ? 700 : 400,
                      }}
                    >
                      {isConfirm ? '✓' : <FaTrash size={11} />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
