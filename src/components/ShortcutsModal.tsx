import React from 'react';
import { FaTimes, FaKeyboard } from 'react-icons/fa';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS: { key: string; desc: string; group?: string }[] = [
  { key: 'Navigation',     desc: '',                     group: 'separator' },
  { key: '← →',           desc: 'Vorherige / nächste Woche oder Tag' },
  { key: 'H',             desc: 'Zur heutigen Ansicht springen' },
  { key: 'D',             desc: 'Tagesansicht' },
  { key: 'W',             desc: 'Wochenansicht' },
  { key: 'A',             desc: 'Auswertungs-Dashboard' },
  { key: 'Aktionen',      desc: '',                     group: 'separator' },
  { key: 'N',             desc: 'Neue Session erfassen' },
  { key: 'L',             desc: 'Sessionen-Liste öffnen' },
  { key: 'M',             desc: 'Buchungs-Modus / Aktivitäts-Ansicht wechseln' },
  { key: 'Ctrl + ,',      desc: 'Einstellungen öffnen' },
  { key: '?',             desc: 'Diese Hilfe anzeigen' },
  { key: 'Escape',        desc: 'Offenes Fenster schließen' },
];

export const ShortcutsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '460px' }}>
        <div className="modal-header">
          <FaKeyboard size={18} />
          <h2>Tastaturkürzel</h2>
        </div>

        <div className="modal-body" style={{ padding: '20px 24px' }}>
          {SHORTCUTS.map((s, i) => {
            if (s.group === 'separator') {
              return (
                <div key={i} style={{
                  fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--text-secondary)',
                  marginTop: i === 0 ? 0 : '18px', marginBottom: '10px',
                }}>
                  {s.key}
                </div>
              );
            }
            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 0',
                borderBottom: '1px solid var(--border-color)',
              }}>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-color)' }}>{s.desc}</span>
                <kbd style={{
                  background: 'var(--panel-bg)',
                  border: '1px solid var(--border-color)',
                  borderBottom: '2px solid var(--border-color)',
                  borderRadius: '5px',
                  padding: '2px 8px',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: 'var(--text-color)',
                  flexShrink: 0,
                  marginLeft: '12px',
                  whiteSpace: 'nowrap',
                }}>
                  {s.key}
                </kbd>
              </div>
            );
          })}
        </div>

        <div className="modal-footer">
          <button className="btn-close" onClick={onClose}><FaTimes /> Schließen</button>
        </div>
      </div>
    </div>
  );
};
