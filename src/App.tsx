import { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import Database from '@tauri-apps/plugin-sql';
// FIX: FaPlay und FaStop sind jetzt hier im Import enthalten
import { FaPen, FaSave, FaCalendarDay, FaCalendarWeek, FaCog, FaChartPie, FaPlay, FaStop } from 'react-icons/fa';

import { 
    initDatabase, logActiveWindow, loadAllEvents, loadProjects, 
    addProject, deleteProject, saveSession, deleteSession,
    loadSettings, saveSettings, AppSettings,
    resetDatabase, updateProject
} from './services/db';

import { CalendarEngine } from './components/CalendarEngine';
import { SessionModal } from './components/SessionModal';
import { ActivityDetailModal } from './components/ActivityDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { Dashboard } from './components/Dashboard';
import { Project } from './types';
import './App.css';

interface WindowInfo { title: string; path: string; }

interface TimerState {
    isRunning: boolean;
    startTime: number | null;
    projectId: string;
    description: string;
}

function App() {
  const [db, setDb] = useState<Database | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'dashboard'>('day');
  const [settings, setSettings] = useState<AppSettings>({ 
      workStart: "08:00", 
      workEnd: "17:00", 
      theme: "light", 
      groupingThreshold: 10, 
      dailyTarget: 8 
  });
  
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [selection, setSelection] = useState<{start: Date, end: Date} | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<number | undefined>(undefined);

  // --- TIMER STATE ---
  const [timerState, setTimerState] = useState<TimerState>({
      isRunning: false, startTime: null, projectId: "", description: ""
  });
  const [timerDisplay, setTimerDisplay] = useState("00:00:00");

  const lastSavedTitle = useRef<string>("");

  useEffect(() => {
    async function start() {
      try {
        const database = await initDatabase();
        setDb(database);
        const loadedSettings = await loadSettings(database);
        setSettings(loadedSettings);
        
        if (loadedSettings.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        // Timer State laden
        const savedTimer = localStorage.getItem('clockwork_timer');
        if (savedTimer) {
            setTimerState(JSON.parse(savedTimer));
        }

        refreshData(database, isEditMode, viewMode === 'dashboard' ? 'day' : viewMode, loadedSettings.groupingThreshold);
      } catch (e) { console.error("DB Init Error:", e); }
    }
    start();
  }, []);

  // Timer Interval
  useEffect(() => {
      let interval: any;
      if (timerState.isRunning && timerState.startTime) {
          interval = setInterval(() => {
              const now = Date.now();
              const diff = now - timerState.startTime!;
              const date = new Date(diff);
              // UTC verwenden, um Zeitzonenprobleme bei der Dauer zu vermeiden
              const str = date.toISOString().substr(11, 8);
              setTimerDisplay(str);
          }, 1000);
      } else {
          setTimerDisplay("00:00:00");
      }
      return () => clearInterval(interval);
  }, [timerState]);

  useEffect(() => {
    const unlistenPromise = listen('active-window-change', async (event) => {
      const info = event.payload as WindowInfo;
      const title = info.title || "Unbekannt";
      const path = info.path || "";
      
      if (db && title !== lastSavedTitle.current && title !== "Unbekannt") {
        try {
            await logActiveWindow(db, title, path);
            lastSavedTitle.current = title;
        } catch (e) { console.error("Fehler beim Speichern:", e); }
      }
    });
    return () => { unlistenPromise.then(unlisten => unlisten()); };
  }, [db]);

  useEffect(() => { 
      if (db && viewMode !== 'dashboard') {
          refreshData(db, isEditMode, viewMode, settings.groupingThreshold); 
      }
  }, [isEditMode, viewMode, settings.groupingThreshold]);

  async function refreshData(database: Database, editMode: boolean, currentView: 'day' | 'week', threshold: number) {
    const finalThreshold = currentView === 'week' ? 60 : threshold;
    const events = await loadAllEvents(database, editMode, finalThreshold);
    const projs = await loadProjects(database);
    setCalendarEvents(events);
    setProjects(projs);
  }

  const handleDateSelect = (info: any) => {
    setSelection({ start: info.start, end: info.end });
    setEditingSessionId(undefined);
    setShowSessionModal(true);
  };

  const handleEventClick = (info: any) => {
    const props = info.event.extendedProps;
    if (props.type === 'manual' && isEditMode) {
        setSelection({ start: info.event.start, end: info.event.end });
        setEditingSessionId(props.dbId);
        setShowSessionModal(true);
    }
    if (props.type === 'auto' && !isEditMode) {
        setSelectedActivity({
            title: props.simpleName,
            exePath: props.exePath,
            color: props.appColor,
            subEvents: props.subEvents || []
        });
        setShowActivityModal(true);
    }
  };

  const handleEventChange = async (info: any) => {
      const props = info.event.extendedProps;
      if (db && props.type === 'manual') {
          await saveSession(db, info.event.start, info.event.end, props.projectId, props.description, props.dbId);
          refreshData(db, isEditMode, viewMode === 'dashboard' ? 'day' : viewMode, settings.groupingThreshold);
      }
  };

  const handleSaveSession = async (projectId: string, desc: string, start: Date, end: Date) => {
    if (db) {
      await saveSession(db, start, end, projectId, desc, editingSessionId);
      setShowSessionModal(false);
      refreshData(db, isEditMode, viewMode === 'dashboard' ? 'day' : viewMode, settings.groupingThreshold);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (db) {
      await deleteSession(db, id);
      refreshData(db, isEditMode, viewMode === 'dashboard' ? 'day' : viewMode, settings.groupingThreshold);
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
      if (db) {
          await saveSettings(db, newSettings);
          setSettings(newSettings);
          if (newSettings.darkMode) {
              document.body.classList.add('dark-mode');
          } else {
              document.body.classList.remove('dark-mode');
          }
          setShowSettings(false);
      }
  };

  const handleReset = async () => {
      if (db) {
          await resetDatabase(db);
          window.location.reload();
      }
  };

  const handleUpdateProject = async (id: number, name: string, color: string, icon?: string, iconType?: 'app' | 'image') => {
      if (db) {
          await updateProject(db, id, name, color, icon, iconType);
          refreshData(db, isEditMode, viewMode === 'dashboard' ? 'day' : viewMode, settings.groupingThreshold);
      }
  };

  const handleDeleteProject = async (id: number) => {
      if (db) {
          await deleteProject(db, id);
          refreshData(db, isEditMode, viewMode === 'dashboard' ? 'day' : viewMode, settings.groupingThreshold);
      }
  };

  const handleAddProject = async (name: string, color: string, icon?: string, iconType?: 'app' | 'image') => {
      if (db && name) {
          await addProject(db, name, color, icon, iconType);
          refreshData(db, isEditMode, viewMode === 'dashboard' ? 'day' : viewMode, settings.groupingThreshold);
      }
  };

  // --- TIMER FUNCTIONS ---
  const startTimer = () => {
      if (!timerState.projectId) {
          alert("Bitte wähle zuerst ein Projekt aus.");
          return;
      }
      const newState = {
          ...timerState,
          isRunning: true,
          startTime: Date.now()
      };
      setTimerState(newState);
      localStorage.setItem('clockwork_timer', JSON.stringify(newState));
  };

  const stopTimer = async () => {
      if (timerState.isRunning && timerState.startTime && db) {
          const end = new Date();
          const start = new Date(timerState.startTime);
          
          await saveSession(db, start, end, timerState.projectId, timerState.description);
          
          const newState = { isRunning: false, startTime: null, projectId: "", description: "" };
          setTimerState(newState);
          localStorage.removeItem('clockwork_timer');
          
          refreshData(db, isEditMode, viewMode === 'dashboard' ? 'day' : viewMode, settings.groupingThreshold);
      }
  };

  return (
    <div className="app-container">
      
      <SessionModal 
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        onSave={handleSaveSession}
        onDelete={handleDeleteSession}
        onAddProject={handleAddProject}
        start={selection?.start || null}
        end={selection?.end || null}
        projects={projects}
        editingSessionId={editingSessionId}
      />

      <ActivityDetailModal 
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        title={selectedActivity?.title || ''}
        exePath={selectedActivity?.exePath}
        color={selectedActivity?.color || '#ccc'}
        subEvents={selectedActivity?.subEvents || []}
      />

      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        projects={projects}
        onSaveSettings={handleSaveSettings}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
        onAddProject={handleAddProject}
        onResetData={handleReset}
        db={db}
      />

      <div className="app-header">
        <div className="header-left">
            <div className="header-status">
            <span className={`status-dot ${isEditMode ? 'active' : ''}`}></span>
            {isEditMode ? 'Modus: Erfassung' : 'Modus: Analyse'}
            </div>

            {/* TIMER SECTION */}
            <div className="timer-controls">
                {!timerState.isRunning ? (
                    <>
                        <select 
                            className="input-select" 
                            style={{width: '150px', height: '32px', fontSize: '0.85rem'}}
                            value={timerState.projectId}
                            onChange={e => setTimerState({...timerState, projectId: e.target.value})}
                        >
                            <option value="">Projekt wählen...</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input 
                            className="input-text" 
                            style={{width: '200px', height: '32px', fontSize: '0.85rem'}}
                            placeholder="Was machst du gerade?"
                            value={timerState.description}
                            onChange={e => setTimerState({...timerState, description: e.target.value})}
                        />
                        <button className="btn-save" style={{padding: '6px 12px', height: '32px'}} onClick={startTimer}>
                            <FaPlay size={10} /> Start
                        </button>
                    </>
                ) : (
                    <>
                        <span style={{fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)'}}>
                            Läuft: {projects.find(p => p.id.toString() === timerState.projectId)?.name}
                        </span>
                        <div className="timer-display">{timerDisplay}</div>
                        <button className="btn-secondary" style={{padding: '6px 12px', height: '32px', borderColor: '#ef4444', color: '#ef4444'}} onClick={stopTimer}>
                            <FaStop size={10} /> Stop
                        </button>
                    </>
                )}
            </div>
        </div>

        <div className="header-controls">
          <button onClick={() => setShowSettings(true)} style={{background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px'}} title="Einstellungen"><FaCog size={20} /></button>
          
          <div style={{display: 'flex', background: 'var(--panel-bg)', borderRadius: '8px', padding: '2px', marginRight: '10px', border: '1px solid var(--border-color)'}}>
              <button onClick={() => setViewMode('day')} style={{background: viewMode === 'day' ? 'var(--bg-color)' : 'transparent', boxShadow: viewMode === 'day' ? 'var(--shadow)' : 'none', padding: '6px 12px', borderRadius: '6px', border: 'none', fontWeight: '600', color: 'var(--text-color)'}}><FaCalendarDay /> Tag</button>
              <button onClick={() => setViewMode('week')} style={{background: viewMode === 'week' ? 'var(--bg-color)' : 'transparent', boxShadow: viewMode === 'week' ? 'var(--shadow)' : 'none', padding: '6px 12px', borderRadius: '6px', border: 'none', fontWeight: '600', color: 'var(--text-color)'}}><FaCalendarWeek /> Woche</button>
              <button onClick={() => setViewMode('dashboard')} style={{background: viewMode === 'dashboard' ? 'var(--bg-color)' : 'transparent', boxShadow: viewMode === 'dashboard' ? 'var(--shadow)' : 'none', padding: '6px 12px', borderRadius: '6px', border: 'none', fontWeight: '600', color: 'var(--text-color)'}}><FaChartPie /> Auswertung</button>
          </div>

          <button className={`btn-toggle ${isEditMode ? 'active' : ''}`} onClick={() => setIsEditMode(!isEditMode)}>{isEditMode ? <FaSave /> : <FaPen />}{isEditMode ? 'Erfassung beenden' : 'Zeiten erfassen'}</button>
          <button className="btn-refresh" onClick={() => db && refreshData(db, isEditMode, viewMode === 'dashboard' ? 'day' : viewMode, settings.groupingThreshold)}>Refresh</button>
        </div>
      </div>

      <div className="calendar-wrapper">
        {viewMode === 'dashboard' ? (
            <Dashboard db={db} projects={projects} />
        ) : (
            <CalendarEngine 
              events={calendarEvents}
              isEditMode={isEditMode}
              viewMode={viewMode}
              onDateSelect={handleDateSelect}
              onEventClick={handleEventClick}
              onDeleteSession={handleDeleteSession}
              onEventDrop={handleEventChange}
              onEventResize={handleEventChange}
              workStart={settings.workStart}
              workEnd={settings.workEnd}
              scrollTime={settings.workStart + ":00"}
              hiddenDays={settings.hiddenDays}
              weekSchedule={settings.weekSchedule}
            />
        )}
      </div>
    </div>
  );
}

export default App;
