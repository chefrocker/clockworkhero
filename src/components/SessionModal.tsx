import React, { useState, useEffect } from 'react';
import { FaClock, FaSave } from 'react-icons/fa';
import { Project } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectId: string, desc: string) => void;
  start: Date | null;
  end: Date | null;
  projects: Project[];
}

export const SessionModal: React.FC<Props> = ({ isOpen, onClose, onSave, start, end, projects }) => {
  const [projectId, setProjectId] = useState("");
  const [desc, setDesc] = useState("");

  // Reset bei Öffnen
  useEffect(() => {
    if (isOpen) {
      setProjectId("");
      setDesc("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const durationMin = start && end ? Math.round((end.getTime() - start.getTime()) / 60000) : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        
        <div className="modal-header" style={{background: '#27ae60'}}>
          <FaClock size={24} />
          <h2>Arbeitszeit erfassen</h2>
        </div>

        <div className="modal-body">
          <div className="modal-row">
            <span className="modal-label">Zeitraum</span>
            <span className="modal-value">
              {start?.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {end?.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
            </span>
          </div>
          <div className="modal-row">
            <span className="modal-label">Dauer</span>
            <span className="modal-value">{durationMin} Min.</span>
          </div>

          <div style={{marginTop: '20px'}}>
            <label className="input-label">Projekt wählen</label>
            <select 
              className="input-select"
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
            >
              <option value="">-- Kein Projekt --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div style={{marginTop: '15px'}}>
            <label className="input-label">Beschreibung</label>
            <input 
              className="input-text"
              placeholder="Was hast du erledigt?"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-close" onClick={onClose}>Abbrechen</button>
          <button className="btn-save" onClick={() => onSave(projectId, desc)}>
            <FaSave style={{marginRight: '5px'}}/> Speichern
          </button>
        </div>

      </div>
    </div>
  );
};
