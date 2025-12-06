import React, { useState, useEffect } from 'react';
import { FaClock, FaSave } from 'react-icons/fa';
import { Project } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // WICHTIG: onSave nimmt jetzt auch die neuen Zeiten entgegen
  onSave: (projectId: string, desc: string, start: Date, end: Date) => void;
  start: Date | null;
  end: Date | null;
  projects: Project[];
}

export const SessionModal: React.FC<Props> = ({ isOpen, onClose, onSave, start, end, projects }) => {
  const [projectId, setProjectId] = useState("");
  const [desc, setDesc] = useState("");
  
  // Lokale States für die Bearbeitung
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [duration, setDuration] = useState(0);

  // Wenn Modal aufgeht: Werte initialisieren
  useEffect(() => {
    if (isOpen && start && end) {
      setProjectId("");
      setDesc("");
      
      // Zeit formatieren für Input (HH:mm)
      setStartTime(formatTime(start));
      setEndTime(formatTime(end));
      
      // Dauer in Minuten berechnen
      const diff = Math.round((end.getTime() - start.getTime()) / 60000);
      setDuration(diff);
    }
  }, [isOpen, start, end]);

  // Helper: Date -> "HH:mm"
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Helper: "HH:mm" + Original Date -> New Date
  const updateDateFromTime = (originalDate: Date, timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const newDate = new Date(originalDate);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    return newDate;
  };

  // LOGIK: Startzeit geändert
  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartStr = e.target.value;
    setStartTime(newStartStr);
    
    // Dauer beibehalten -> Ende verschieben? Oder Ende fix lassen?
    // Üblich: Ende fix lassen, Dauer anpassen (außer Start > Ende)
    if (start && end) {
        const s = updateDateFromTime(start, newStartStr);
        const e_date = updateDateFromTime(end, endTime);
        let diff = Math.round((e_date.getTime() - s.getTime()) / 60000);
        
        if (diff < 0) diff = 0; // Keine negative Dauer
        setDuration(diff);
    }
  };

  // LOGIK: Endzeit geändert -> Dauer anpassen
  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndStr = e.target.value;
    setEndTime(newEndStr);

    if (start) {
        const s = updateDateFromTime(start, startTime);
        const e_date = updateDateFromTime(start, newEndStr); // Basis ist Start-Tag (falls über Mitternacht, hier vereinfacht)
        let diff = Math.round((e_date.getTime() - s.getTime()) / 60000);
        if (diff < 0) diff = 0;
        setDuration(diff);
    }
  };

  // LOGIK: Dauer geändert -> Endzeit anpassen
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDur = parseInt(e.target.value) || 0;
    setDuration(newDur);

    if (start) {
        const s = updateDateFromTime(start, startTime);
        const newEnd = new Date(s.getTime() + newDur * 60000);
        setEndTime(formatTime(newEnd));
    }
  };

  const handleSave = () => {
      if (start && end) {
          const finalStart = updateDateFromTime(start, startTime);
          const finalEnd = updateDateFromTime(end, endTime); // Wir nehmen an, es ist der gleiche Tag wie 'end'
          onSave(projectId, desc, finalStart, finalEnd);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        
        <div className="modal-header" style={{background: '#27ae60'}}>
          <FaClock size={24} />
          <h2>Arbeitszeit erfassen</h2>
        </div>

        <div className="modal-body">
          
          {/* ZEIT EINGABE */}
          <div className="input-row">
              <div className="input-group">
                  <label className="input-label">Von</label>
                  <input 
                    type="time" 
                    className="input-time" 
                    value={startTime} 
                    onChange={handleStartChange}
                  />
              </div>
              <div className="input-group">
                  <label className="input-label">Bis</label>
                  <input 
                    type="time" 
                    className="input-time" 
                    value={endTime} 
                    onChange={handleEndChange}
                  />
              </div>
              <div className="input-group" style={{flex: 0.6}}>
                  <label className="input-label">Minuten</label>
                  <input 
                    type="number" 
                    className="input-number" 
                    value={duration} 
                    onChange={handleDurationChange}
                  />
              </div>
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
          <button className="btn-save" onClick={handleSave}>
            <FaSave style={{marginRight: '5px'}}/> Speichern
          </button>
        </div>

      </div>
    </div>
  );
};
