import React, { useState, useEffect } from 'react';
import { FaClock, FaSave, FaTimes, FaPlus, FaTrash } from 'react-icons/fa';
import { Project } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectId: string, desc: string, start: Date, end: Date) => void;
  onDelete?: (id: string) => void; // NEU: Delete Callback
  onAddProject: (name: string, color: string, icon?: string, iconType?: 'app' | 'image') => void;
  start: Date | null;
  end: Date | null;
  projects: Project[];
  editingSessionId?: number; // NEU: Um zu wissen, ob wir editieren
}

export const SessionModal: React.FC<Props> = ({ isOpen, onClose, onSave, onDelete, onAddProject, start, end, projects, editingSessionId }) => {
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [durationMin, setDurationMin] = useState(0);

  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  useEffect(() => {
    if (isOpen && start && end) {
      setProjectId("");
      setDescription("");
      setIsCreatingProject(false);
      setNewProjectName("");
      
      setStartTime(start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
      setEndTime(end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
      
      const diff = Math.round((end.getTime() - start.getTime()) / 60000);
      setDurationMin(diff);
    }
  }, [isOpen, start, end]);

  const updateDateFromTime = (originalDate: Date, timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const newDate = new Date(originalDate);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    newDate.setSeconds(0);
    return newDate;
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartStr = e.target.value;
    setStartTime(newStartStr);
    if (start && end) {
        const s = updateDateFromTime(start, newStartStr);
        const e_date = updateDateFromTime(end, endTime);
        if (e_date < s) e_date.setDate(e_date.getDate() + 1);
        let diff = Math.round((e_date.getTime() - s.getTime()) / 60000);
        if (diff < 0) diff = 0;
        setDurationMin(diff);
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndStr = e.target.value;
    setEndTime(newEndStr);
    if (start) {
        const s = updateDateFromTime(start, startTime);
        let e_date = updateDateFromTime(start, newEndStr);
        if (e_date < s) e_date.setDate(e_date.getDate() + 1);
        let diff = Math.round((e_date.getTime() - s.getTime()) / 60000);
        if (diff < 0) diff = 0;
        setDurationMin(diff);
    }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDur = parseInt(e.target.value) || 0;
    setDurationMin(newDur);
    if (start) {
        const s = updateDateFromTime(start, startTime);
        const newEnd = new Date(s.getTime() + newDur * 60000);
        setEndTime(newEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    }
  };

  const handleQuickCreateProject = () => {
      if (newProjectName.trim()) {
          onAddProject(newProjectName, "#3498db", "", "app");
          setIsCreatingProject(false);
      }
  };

  const handleSave = () => {
      if (start && end) {
          const finalStart = updateDateFromTime(start, startTime);
          let finalEnd = updateDateFromTime(start, endTime);
          if (finalEnd < finalStart) finalEnd.setDate(finalEnd.getDate() + 1);
          onSave(projectId, description, finalStart, finalEnd);
      }
  };

  const handleDelete = () => {
      if (onDelete && editingSessionId) {
          if (window.confirm("Möchtest du diesen Eintrag wirklich löschen?")) {
              onDelete(`manual-${editingSessionId}`);
              onClose();
          }
      }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{width: '700px'}}>
        
        <div className="modal-header">
          <FaClock size={20} />
          <h2>{editingSessionId ? 'Eintrag bearbeiten' : 'Arbeitszeit erfassen'}</h2>
        </div>

        <div className="modal-body">
          <div style={{
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr', 
              gap: '20px', 
              marginBottom: '25px'
          }}>
              <div className="input-group">
                  <label className="input-label">Von</label>
                  <input type="time" className="input-time" value={startTime} onChange={handleStartChange} />
              </div>
              <div className="input-group">
                  <label className="input-label">Bis</label>
                  <input type="time" className="input-time" value={endTime} onChange={handleEndChange} />
              </div>
              <div className="input-group">
                  <label className="input-label">Dauer (Min)</label>
                  <input type="number" className="input-number" value={durationMin} onChange={handleDurationChange} />
              </div>
          </div>

          <div className="input-group" style={{marginBottom: '20px'}}>
            <label className="input-label">Projekt</label>
            {!isCreatingProject ? (
                <div style={{display: 'flex', gap: '10px'}}>
                    <select 
                        className="input-select" 
                        value={projectId} 
                        onChange={e => {
                            if (e.target.value === 'NEW') setIsCreatingProject(true);
                            else setProjectId(e.target.value);
                        }}
                    >
                        <option value="">-- Bitte wählen --</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        <option value="NEW" style={{fontWeight: 'bold', color: '#3b82f6'}}>+ Neues Projekt erstellen...</option>
                    </select>
                </div>
            ) : (
                <div style={{display: 'flex', gap: '10px'}}>
                    <input 
                        className="input-text" 
                        placeholder="Projektname eingeben..." 
                        value={newProjectName} 
                        onChange={e => setNewProjectName(e.target.value)}
                        autoFocus
                    />
                    <button className="btn-save" onClick={handleQuickCreateProject}><FaPlus /> Erstellen</button>
                    <button className="btn-secondary" onClick={() => setIsCreatingProject(false)}><FaTimes /></button>
                </div>
            )}
          </div>

          <div className="input-group">
            <label className="input-label">Beschreibung</label>
            <textarea 
              className="input-text"
              style={{height: '100px', resize: 'none'}}
              placeholder="Was hast du erledigt?"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer" style={{justifyContent: 'space-between'}}>
          {/* LÖSCHEN BUTTON (Links) */}
          <div>
              {editingSessionId && (
                  <button className="btn-secondary" onClick={handleDelete} style={{color: '#ef4444', borderColor: '#ef4444'}}>
                      <FaTrash /> Löschen
                  </button>
              )}
          </div>
          
          {/* RECHTE BUTTONS */}
          <div style={{display: 'flex', gap: '12px'}}>
            <button className="btn-close" onClick={onClose}><FaTimes /> Abbrechen</button>
            <button className="btn-save" onClick={handleSave}><FaSave /> Speichern</button>
          </div>
        </div>
      </div>
    </div>
  );
};
