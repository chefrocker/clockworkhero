import React, { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import Database from '@tauri-apps/plugin-sql';
import { FaPen, FaSave, FaBriefcase, FaFolderPlus, FaTrash } from 'react-icons/fa';

// Imports der neuen Module
import { initDatabase, logActiveWindow, loadAllEvents, loadProjects, addProject, deleteProject, saveSession, deleteSession } from './services/db';
import { CalendarEngine } from './components/CalendarEngine';
import { SessionModal } from './components/SessionModal';
import { Project } from './types';
import './App.css';

function App() {
  const [db, setDb] = useState<Database | null>(null);
  const [currentWindow, setCurrentWindow] = useState("Warte auf Tracking...");
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  // UI States
  const [isEditMode, setIsEditMode] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  
  // Temp Data für Modal
  const [selection, setSelection] = useState<{start: Date, end: Date} | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("#3498db");

  const lastSavedTitle = useRef<string>("");

  // 1. INIT
  useEffect(() => {
    async function start() {
      try {
        const database = await initDatabase();
        setDb(database);
        refreshData(database, isEditMode);
      } catch (e) { console.error(e); }
    }
    start();
  }, []);

  // 2. TRACKING
  useEffect(() => {
    const unlistenPromise = listen('active-window-change', async (event) => {
      const title = event.payload as string;
      setCurrentWindow(title);
      if (db && title !== lastSavedTitle.current && title !== "Unbekannt") {
        await logActiveWindow(db, title);
        lastSavedTitle.current = title;
      }
    });
    return () => { unlistenPromise.then(unlisten => unlisten()); };
  }, [db]);

  // 3. RELOAD bei Modus-Wechsel
  useEffect(() => { if (db) refreshData(db, isEditMode); }, [isEditMode]);

  async function refreshData(database: Database, editMode: boolean) {
    const events = await loadAllEvents(database, editMode);
    const projs = await loadProjects(database);
    setCalendarEvents(events);
    setProjects(projs);
  }

  // --- HANDLER ---
  const handleDateSelect = (info: any) => {
    setSelection({ start: info.start, end: info.end });
    setShowSessionModal(true);
  };

  const handleSaveSession = async (projectId: string, desc: string) => {
    if (db && selection) {
      await saveSession(db, selection.start, selection.end, projectId, desc);
      setShowSessionModal(false);
      refreshData(db, isEditMode);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (db) {
      await deleteSession(db, id);
      refreshData(db, isEditMode);
    }
  };

  const handleAddProject = async () => {
    if (db && newProjectName) {
      await addProject(db, newProjectName, newProjectColor);
      setNewProjectName("");
      refreshData(db, isEditMode);
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (db) {
      await deleteProject(db, id);
      refreshData(db, isEditMode);
    }
  };

  return (
    <div className="app-container">
      
      <SessionModal 
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        onSave={handleSaveSession}
        start={selection?.start || null}
        end={selection?.end || null}
        projects={projects}
      />

      {/* PROJEKT MANAGER (Inline Modal für Einfachheit hier gelassen, könnte auch ausgelagert werden) */}
      {showProjectManager && (
        <div className="modal-overlay" onClick={() => setShowProjectManager(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header" style={{background: '#2c3e50'}}>
                    <FaBriefcase size={24} />
                    <h2>Projekte</h2>
                </div>
                <div className="modal-body">
                    <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
                        <input className="input-text" placeholder="Projektname" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
                        <input type="color" value={newProjectColor} onChange={e => setNewProjectColor(e.target.value)} style={{height: '40px', width: '50px', border: 'none', cursor: 'pointer'}} />
                        <button className="btn-save" onClick={handleAddProject} style={{width: 'auto', padding: '0 15px'}}><FaFolderPlus /></button>
                    </div>
                    <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                        {projects.map(p => (
                            <div key={p.id} style={{display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                    <div style={{width: '15px', height: '15px', borderRadius: '50%', background: p.color}}></div>
                                    <strong>{p.name}</strong>
                                </div>
                                <button onClick={() => handleDeleteProject(p.id)} style={{background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer'}}><FaTrash /></button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="modal-footer"><button className="btn-close" onClick={() => setShowProjectManager(false)}>Schließen</button></div>
            </div>
        </div>
      )}

      {/* HEADER */}
      <div className="app-header">
        <div className="header-status">
          <span className={`status-dot ${isEditMode ? 'active' : ''}`}></span>
          {isEditMode ? 'Modus: Erfassung' : 'Modus: Analyse'}
        </div>
        <div className="header-controls">
          <button className="btn-secondary" onClick={() => setShowProjectManager(true)}>
            <FaBriefcase /> Projekte
          </button>
          <button 
            className={`btn-toggle ${isEditMode ? 'active' : ''}`}
            onClick={() => setIsEditMode(!isEditMode)}
          >
            {isEditMode ? <FaSave /> : <FaPen />}
            {isEditMode ? 'Erfassung beenden' : 'Zeiten erfassen'}
          </button>
          <button className="btn-refresh" onClick={() => db && refreshData(db, isEditMode)}>
            Refresh
          </button>
        </div>
      </div>

      {/* KALENDER */}
      <div className="calendar-wrapper">
        <CalendarEngine 
          events={calendarEvents}
          isEditMode={isEditMode}
          onDateSelect={handleDateSelect}
          onDeleteSession={handleDeleteSession}
        />
      </div>
    </div>
  );
}

export default App;
