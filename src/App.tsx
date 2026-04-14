import { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import Database from '@tauri-apps/plugin-sql';
import { FaCalendarDay, FaCalendarWeek, FaCog, FaChartPie, FaPlay, FaStop, FaEye, FaPencilAlt } from 'react-icons/fa';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import { invoke } from '@tauri-apps/api/core';
import { UpdateChecker } from './components/UpdateChecker';
import { ToastContainer, toast } from './components/Toast';

import {
  initDatabase, logActiveWindow, loadAllEvents, loadProjects,
  addProject, deleteProject, saveSession, deleteSession,
  loadSettings, saveSettings, AppSettings,
  resetDatabase, updateProject
} from './services/db';

import { CalendarEngine, CalendarHandle } from './components/CalendarEngine';
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

  // isEditMode = true -> "Eingabemodus" (Icons rechts, Platz für neue Einträge)
  // isEditMode = false -> "ActivityCards Modus" (Breite Karten zur Ansicht)
  const [isEditMode, setIsEditMode] = useState(false);

  const [viewMode, setViewMode] = useState<'day' | 'week' | 'dashboard'>('week');
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
  const [selection, setSelection] = useState<{ start: Date, end: Date } | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<number | undefined>(undefined);

  // Timer State
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false, startTime: null, projectId: "", description: ""
  });
  const [timerDisplay, setTimerDisplay] = useState("00:00:00");
  const lastSavedTitle    = useRef<string>("");
  const calendarEngineRef = useRef<CalendarHandle>(null);

  // ScrollTime State (Startet bei aktueller Stunde)
  const [initialScrollTime, setInitialScrollTime] = useState("08:00:00");

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

        // Aktuelle Zeit für ScrollTime setzen
        const now = new Date();
        const currentHour = now.getHours().toString().padStart(2, '0');
        setInitialScrollTime(`${currentHour}:00:00`);

        refreshData(database, isEditMode, viewMode === 'dashboard' ? 'day' : viewMode, loadedSettings);
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
        const str = date.toISOString().substr(11, 8);
        setTimerDisplay(str);
      }, 1000);
    } else { setTimerDisplay("00:00:00"); }
    return () => clearInterval(interval);
  }, [timerState]);

  // Active Window Listener
  useEffect(() => {
    const unlistenPromise = listen('active-window-change', async (event) => {
      const info = event.payload as WindowInfo;
      const title = info.title || "Unbekannt";
      const path = info.path || "";

      if (db && title !== lastSavedTitle.current && title !== "Unbekannt") {
        try {
          await logActiveWindow(db, title, path);
          lastSavedTitle.current = title;

          // Verzögertes Refresh um DB-Schreibvorgang abzuschließen
          setTimeout(() => {
            refreshData(db, isEditMode, viewMode === 'dashboard' ? 'day' : viewMode, settings);
          }, 100);
        } catch (e) { console.error("Fehler beim Speichern:", e); }
      }
    });
    return () => { unlistenPromise.then(unlisten => unlisten()); };
  }, [db, isEditMode, viewMode, settings]);

  // Auto-Refresh Fallback (alle 60 Sekunden)
  useEffect(() => {
    if (!db) return;

    const interval = setInterval(() => {
      refreshData(db, isEditMode, viewMode === 'dashboard' ? 'day' : viewMode, settings);
    }, 60000); // Alle 60 Sekunden

    return () => clearInterval(interval);
  }, [db, isEditMode, viewMode, settings]);

  // ── Keyboard Shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Shortcuts deaktivieren wenn Nutzer in einem Eingabefeld tippt
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      // Modals offen → nur Esc behandeln
      const modalOpen = showSessionModal || showActivityModal || showSettings;

      switch (e.key) {
        case 'Escape':
          if (showSessionModal)  { setShowSessionModal(false);  e.preventDefault(); }
          if (showActivityModal) { setShowActivityModal(false); e.preventDefault(); }
          if (showSettings)      { setShowSettings(false);      e.preventDefault(); }
          break;

        // Navigation (nur wenn kein Modal offen)
        case 'ArrowLeft':
          if (!modalOpen && viewMode !== 'dashboard') { calendarEngineRef.current?.prev(); e.preventDefault(); }
          break;
        case 'ArrowRight':
          if (!modalOpen && viewMode !== 'dashboard') { calendarEngineRef.current?.next(); e.preventDefault(); }
          break;
        case 'h': case 'H':
          if (!modalOpen && viewMode !== 'dashboard') { calendarEngineRef.current?.today(); e.preventDefault(); }
          break;

        // Ansicht wechseln (nur wenn kein Modal offen)
        case 'd': case 'D':
          if (!modalOpen) { setViewMode('day');       e.preventDefault(); }
          break;
        case 'w': case 'W':
          if (!modalOpen) { setViewMode('week');      e.preventDefault(); }
          break;
        case 'a': case 'A':
          if (!modalOpen) { setViewMode('dashboard'); e.preventDefault(); }
          break;

        // Neue Session
        case 'n': case 'N':
          if (!modalOpen) {
            const now = new Date();
            const end = new Date(now.getTime() + 60 * 60 * 1000);
            setSelection({ start: now, end });
            setEditingSessionId(undefined);
            setEditingSessionData(null);
            setShowSessionModal(true);
            e.preventDefault();
          }
          break;

        // Modus togglen
        case 'm': case 'M':
          if (!modalOpen && viewMode !== 'dashboard') { setIsEditMode(v => !v); e.preventDefault(); }
          break;

        // Einstellungen
        case ',':
          if (e.metaKey || e.ctrlKey) { setShowSettings(true); e.preventDefault(); }
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSessionModal, showActivityModal, showSettings, viewMode]);

  // Refresh bei Modus-Wechsel
  useEffect(() => {
    if (db && viewMode !== 'dashboard') {
      refreshData(db, isEditMode, viewMode, settings);
    }
  }, [isEditMode, viewMode, settings.groupingThreshold, db, settings]);

  async function refreshData(database: Database, editMode: boolean, currentView: 'day' | 'week', settings: AppSettings) {
    let finalThreshold = settings.groupingThreshold || 10;

    if (settings.autoGrouping) {
      finalThreshold = currentView === 'week' ? 45 : 10;
    }

    try {
      const events = await loadAllEvents(database, editMode, finalThreshold);
      const projs  = await loadProjects(database);
      setCalendarEvents(events);
      setProjects(projs);

      // Tray-Tooltip mit heutigen gebuchten Stunden aktualisieren
      const today    = new Date(); today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);
      const todayHours = events
        .filter((e: any) =>
          e.extendedProps?.type === 'manual' &&
          new Date(e.start) >= today &&
          new Date(e.start) <= todayEnd
        )
        .reduce((sum: number, e: any) => {
          if (!e.start || !e.end) return sum;
          return sum + (new Date(e.end).getTime() - new Date(e.start).getTime()) / 3600000;
        }, 0);
      invoke('update_tray_tooltip', { text: `ClockworkHero • Heute: ${todayHours.toFixed(1)}h` }).catch(() => {});
    } catch (e) {
      console.error('refreshData Fehler:', e);
      toast.error('Daten konnten nicht geladen werden', 'Bitte das Programm neu starten.');
    }
  }

  const [editingSessionData, setEditingSessionData] = useState<{ projectId: string, description: string } | null>(null);

  // ... (existing code)

  const handleDateSelect = (info: any) => {
    setSelection({ start: info.start, end: info.end });
    setEditingSessionId(undefined);
    setEditingSessionData(null); // Reset data for new session
    setShowSessionModal(true);
  };

  const handleEventClick = (info: any) => {
    const props = info.event.extendedProps;
    if (props.type === 'manual') {
      setSelection({ start: info.event.start, end: info.event.end });
      setEditingSessionId(props.dbId);
      // capture existing data
      setEditingSessionData({
        projectId: props.projectId,
        description: props.description
      });
      setShowSessionModal(true);
      return;
    }

    // Auto-Event Details (immer verfügbar, wenn geklickt)
    if (props.type === 'auto') {
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
      refreshData(db, isEditMode, viewMode === 'dashboard' ? 'day' : viewMode, settings);
    }
  };

  const handleSaveSession = async (projectId: string, desc: string, start: Date, end: Date) => {
    if (!db) return;
    try {
      await saveSession(db, start, end, projectId, desc, editingSessionId);
      setShowSessionModal(false);
      toast.success('Session gespeichert');
      refreshData(db, isEditMode, viewMode === 'dashboard' ? 'day' : viewMode, settings);
    } catch (e) {
      console.error('saveSession Fehler:', e);
      toast.error('Speichern fehlgeschlagen', 'Die Session konnte nicht gespeichert werden.');
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!db) return;
    try {
      await deleteSession(db, id);
      refreshData(db, isEditMode, viewMode === 'dashboard' ? 'day' : viewMode, settings);
    } catch (e) {
      toast.error('Löschen fehlgeschlagen');
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    if (db) {
      await saveSettings(db, newSettings);

      // Autostart Sync
      try {
        const currentlyEnabled = await isEnabled();
        if (newSettings.autostart && !currentlyEnabled) {
          await enable();
        } else if (!newSettings.autostart && currentlyEnabled) {
          await disable();
        }
      } catch (e) {
        console.error("Autostart Sync Fehler:", e);
      }

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
      refreshData(db, isEditMode, viewMode === 'dashboard' ? 'day' : viewMode, settings);
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (db) {
      await deleteProject(db, id);
      refreshData(db, isEditMode, viewMode === 'dashboard' ? 'day' : viewMode, settings);
    }
  };

  const handleAddProject = async (name: string, color: string, icon?: string, iconType?: 'app' | 'image') => {
    if (db && name) {
      await addProject(db, name, color, icon, iconType);
      refreshData(db, isEditMode, viewMode === 'dashboard' ? 'day' : viewMode, settings);
    }
  };

  const startTimer = () => {
    if (!timerState.projectId) {
      toast.warning('Kein Projekt gewählt', 'Bitte wähle ein Projekt aus bevor du den Timer startest.');
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
    if (!timerState.isRunning || !timerState.startTime || !db) return;
    const end   = new Date();
    const start = new Date(timerState.startTime);
    try {
      await saveSession(db, start, end, timerState.projectId, timerState.description);
      const hrs = ((end.getTime() - start.getTime()) / 3600000).toFixed(1);
      toast.success('Timer gestoppt', `${hrs} Std gespeichert`);
    } catch (e) {
      toast.error('Timer konnte nicht gespeichert werden');
    }
    const newState = { isRunning: false, startTime: null, projectId: "", description: "" };
    setTimerState(newState);
    localStorage.removeItem('clockwork_timer');
    refreshData(db, isEditMode, viewMode === 'dashboard' ? 'day' : viewMode, settings);
  };

  // ...

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
        initialData={editingSessionData} // Pass the data
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

      {/* ── Globale Notifications ─────────────────────────────────────── */}
      <ToastContainer />
      <UpdateChecker />

      <div className="app-header">
        {/* ── Links: Timer ──────────────────────────────────────────────── */}
        <div className="header-left">
          {!timerState.isRunning ? (
            <div className="timer-idle">
              <select
                className="header-input"
                value={timerState.projectId}
                onChange={e => setTimerState({ ...timerState, projectId: e.target.value })}
                aria-label="Projekt für Timer"
              >
                <option value="">Projekt wählen…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input
                className="header-input"
                placeholder="Woran arbeitest du?"
                value={timerState.description}
                onChange={e => setTimerState({ ...timerState, description: e.target.value })}
                aria-label="Beschreibung"
              />
              <button
                className="btn-timer-start"
                onClick={startTimer}
                title="Timer starten"
              >
                <FaPlay size={10} /> Start
              </button>
            </div>
          ) : (
            <div className="timer-running">
              <div className="timer-pulse" />
              <span className="timer-project">
                {projects.find(p => p.id.toString() === timerState.projectId)?.name ?? '–'}
              </span>
              <div className="timer-display">{timerDisplay}</div>
              <button
                className="btn-timer-stop"
                onClick={stopTimer}
                title="Timer stoppen und speichern"
              >
                <FaStop size={10} /> Stopp
              </button>
            </div>
          )}
        </div>

        {/* ── Rechts: Navigation + Ansicht + Einstellungen ──────────────── */}
        <div className="header-right">

          {/* View-Switcher */}
          <div className="view-switcher">
            <button
              className={`view-btn ${viewMode === 'day' ? 'active' : ''}`}
              onClick={() => setViewMode('day')}
              title="Tagesansicht"
            >
              <FaCalendarDay size={13} /> Tag
            </button>
            <button
              className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
              title="Wochenansicht"
            >
              <FaCalendarWeek size={13} /> Woche
            </button>
            <button
              className={`view-btn ${viewMode === 'dashboard' ? 'active' : ''}`}
              onClick={() => setViewMode('dashboard')}
              title="Analytics Dashboard"
            >
              <FaChartPie size={13} /> Auswertung
            </button>
          </div>

          {/* Ansichts-Toggle: Erfassen ↔ Ansicht */}
          {viewMode !== 'dashboard' && (
            <button
              className={`btn-mode-toggle ${isEditMode ? 'mode-edit' : 'mode-view'}`}
              onClick={() => setIsEditMode(!isEditMode)}
              title={isEditMode ? 'Wechseln zu: Aktivitäts-Ansicht' : 'Wechseln zu: Buchungs-Modus'}
            >
              {isEditMode
                ? <><FaPencilAlt size={12} /> Buchen</>
                : <><FaEye size={12} /> Ansicht</>
              }
            </button>
          )}

          {/* Einstellungen */}
          <button
            className="btn-settings"
            onClick={() => setShowSettings(true)}
            title="Einstellungen öffnen"
          >
            <FaCog size={14} /> Einstellungen
          </button>
        </div>
      </div>

      <div className="calendar-wrapper">
        {viewMode === 'dashboard' ? (
          <Dashboard db={db} projects={projects} />
        ) : (
          <CalendarEngine
            ref={calendarEngineRef}
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
            scrollTime={initialScrollTime}
            hiddenDays={settings.hiddenDays}
            weekSchedule={settings.weekSchedule}
          />
        )}
      </div>
    </div>
  );
}

export default App;
