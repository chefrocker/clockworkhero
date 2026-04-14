import { useState, useRef, useCallback } from 'react';
import { FaCalendarDay, FaCalendarWeek, FaCog, FaChartPie, FaPlay, FaStop, FaEye, FaPencilAlt } from 'react-icons/fa';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import { UpdateChecker }        from './components/UpdateChecker';
import { ToastContainer, toast } from './components/Toast';

import {
  addProject, deleteProject, saveSession, deleteSession,
  saveSettings, AppSettings, resetDatabase, updateProject,
} from './services/db';

import { CalendarEngine, CalendarHandle } from './components/CalendarEngine';
import { SessionModal }        from './components/SessionModal';
import { ActivityDetailModal } from './components/ActivityDetailModal';
import { SettingsModal }       from './components/SettingsModal';
import { Dashboard }           from './components/Dashboard';

import { useAppInit }           from './hooks/useAppInit';
import { useTimer }             from './hooks/useTimer';
import { useCalendarData }      from './hooks/useCalendarData';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

import './App.css';

function App() {
  // ── Initialisierung ───────────────────────────────────────────────────────
  const { db, settings, setSettings, initialScrollTime, isReady } = useAppInit();

  // ── UI-Zustand ────────────────────────────────────────────────────────────
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewMode,   setViewMode]   = useState<'day' | 'week' | 'dashboard'>('week');

  const [showSessionModal,  setShowSessionModal]  = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showSettings,      setShowSettings]      = useState(false);

  const [selectedActivity,   setSelectedActivity]   = useState<any>(null);
  const [selection,          setSelection]           = useState<{ start: Date; end: Date } | null>(null);
  const [editingSessionId,   setEditingSessionId]   = useState<number | undefined>(undefined);
  const [editingSessionData, setEditingSessionData] = useState<{ projectId: string; description: string } | null>(null);

  const calendarEngineRef = useRef<CalendarHandle>(null);

  // ── Daten (Events + Projekte) ─────────────────────────────────────────────
  const { calendarEvents, projects, refresh, handleRangeChange } =
    useCalendarData(db, isEditMode, viewMode, settings);

  // ── Timer ─────────────────────────────────────────────────────────────────
  const { timerState, timerDisplay, updateTimer, startTimer, stopTimer } =
    useTimer(db, refresh);

  // ── Keyboard Shortcuts ────────────────────────────────────────────────────
  const openNewSession = useCallback(() => {
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    setSelection({ start: now, end });
    setEditingSessionId(undefined);
    setEditingSessionData(null);
    setShowSessionModal(true);
  }, []);

  useKeyboardShortcuts({
    calendarRef:          calendarEngineRef,
    viewMode,
    showSessionModal, showActivityModal, showSettings,
    setViewMode, setIsEditMode,
    setShowSessionModal, setShowActivityModal, setShowSettings,
    openNewSession,
  });

  // ── Event-Handler ─────────────────────────────────────────────────────────
  const handleDateSelect = (info: any) => {
    setSelection({ start: info.start, end: info.end });
    setEditingSessionId(undefined);
    setEditingSessionData(null);
    setShowSessionModal(true);
  };

  const handleEventClick = (info: any) => {
    const props = info.event.extendedProps;
    if (props.type === 'manual') {
      setSelection({ start: info.event.start, end: info.event.end });
      setEditingSessionId(props.dbId);
      setEditingSessionData({ projectId: props.projectId, description: props.description });
      setShowSessionModal(true);
      return;
    }
    if (props.type === 'auto') {
      setSelectedActivity({ title: props.simpleName, exePath: props.exePath, color: props.appColor, subEvents: props.subEvents || [] });
      setShowActivityModal(true);
    }
  };

  const handleEventChange = async (info: any) => {
    const props = info.event.extendedProps;
    if (db && props.type === 'manual') {
      await saveSession(db, info.event.start, info.event.end, props.projectId, props.description, props.dbId);
      refresh();
    }
  };

  const handleSaveSession = async (projectId: string, desc: string, start: Date, end: Date) => {
    if (!db) return;
    try {
      await saveSession(db, start, end, projectId, desc, editingSessionId);
      setShowSessionModal(false);
      toast.success('Session gespeichert');
      refresh();
    } catch (e) {
      console.error('saveSession Fehler:', e);
      toast.error('Speichern fehlgeschlagen', 'Die Session konnte nicht gespeichert werden.');
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!db) return;
    try {
      await deleteSession(db, id);
      refresh();
    } catch {
      toast.error('Löschen fehlgeschlagen');
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    if (!db) return;
    await saveSettings(db, newSettings);
    try {
      const active = await isEnabled();
      if (newSettings.autostart && !active) await enable();
      else if (!newSettings.autostart && active) await disable();
    } catch (e) { console.error('Autostart Sync Fehler:', e); }

    setSettings(newSettings);
    if (newSettings.darkMode) document.body.classList.add('dark-mode');
    else                      document.body.classList.remove('dark-mode');
    setShowSettings(false);
  };

  const handleAddProject = async (name: string, color: string, icon?: string, iconType?: 'app' | 'image') => {
    if (db && name) { await addProject(db, name, color, icon, iconType); refresh(); }
  };

  const handleUpdateProject = async (id: number, name: string, color: string, icon?: string, iconType?: 'app' | 'image') => {
    if (db) { await updateProject(db, id, name, color, icon, iconType); refresh(); }
  };

  const handleDeleteProject = async (id: number) => {
    if (db) { await deleteProject(db, id); refresh(); }
  };

  const handleReset = async () => {
    if (db) { await resetDatabase(db); window.location.reload(); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
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
        initialData={editingSessionData}
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

      <ToastContainer />
      <UpdateChecker />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="app-header">

        {/* Links: Timer */}
        <div className="header-left">
          {!timerState.isRunning ? (
            <div className="timer-idle">
              <select
                className="header-input"
                value={timerState.projectId}
                onChange={e => updateTimer({ projectId: e.target.value })}
                aria-label="Projekt für Timer"
              >
                <option value="">Projekt wählen…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input
                className="header-input"
                placeholder="Woran arbeitest du?"
                value={timerState.description}
                onChange={e => updateTimer({ description: e.target.value })}
                aria-label="Beschreibung"
              />
              <button className="btn-timer-start" onClick={startTimer} title="Timer starten">
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
              <button className="btn-timer-stop" onClick={stopTimer} title="Timer stoppen und speichern">
                <FaStop size={10} /> Stopp
              </button>
            </div>
          )}
        </div>

        {/* Rechts: Ansicht + Modus + Einstellungen */}
        <div className="header-right">
          <div className="view-switcher">
            <button className={`view-btn ${viewMode === 'day'       ? 'active' : ''}`} onClick={() => setViewMode('day')}       title="Tagesansicht">
              <FaCalendarDay  size={13} /> Tag
            </button>
            <button className={`view-btn ${viewMode === 'week'      ? 'active' : ''}`} onClick={() => setViewMode('week')}      title="Wochenansicht">
              <FaCalendarWeek size={13} /> Woche
            </button>
            <button className={`view-btn ${viewMode === 'dashboard' ? 'active' : ''}`} onClick={() => setViewMode('dashboard')} title="Analytics Dashboard">
              <FaChartPie     size={13} /> Auswertung
            </button>
          </div>

          {viewMode !== 'dashboard' && (
            <button
              className={`btn-mode-toggle ${isEditMode ? 'mode-edit' : 'mode-view'}`}
              onClick={() => setIsEditMode(v => !v)}
              title={isEditMode ? 'Wechseln zu: Aktivitäts-Ansicht' : 'Wechseln zu: Buchungs-Modus'}
            >
              {isEditMode ? <><FaPencilAlt size={12} /> Buchen</> : <><FaEye size={12} /> Ansicht</>}
            </button>
          )}

          <button className="btn-settings" onClick={() => setShowSettings(true)} title="Einstellungen öffnen">
            <FaCog size={14} /> Einstellungen
          </button>
        </div>
      </div>

      {/* ── Kalender / Dashboard ────────────────────────────────────────── */}
      <div className="calendar-wrapper">
        {!isReady ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.4, fontSize: '0.9rem' }}>
            Lädt…
          </div>
        ) : viewMode === 'dashboard' ? (
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
            onRangeChange={handleRangeChange}
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
