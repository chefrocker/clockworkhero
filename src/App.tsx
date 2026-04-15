import { useState, useRef, useCallback } from 'react';
import { FaCalendarDay, FaCalendarWeek, FaCog, FaChartPie, FaPlay, FaStop, FaEye, FaPencilAlt, FaKeyboard, FaList } from 'react-icons/fa';
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
import { ShortcutsModal }       from './components/ShortcutsModal';
import { SessionsPanel }        from './components/SessionsPanel';

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
  const [showShortcuts,     setShowShortcuts]     = useState(false);
  const [showSessionsPanel, setShowSessionsPanel] = useState(false);

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
    setShowSessionModal, setShowActivityModal, setShowSettings, setShowShortcuts, setShowSessionsPanel,
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

  const handleEditFromPanel = (event: any) => {
    const props = event.extendedProps;
    setSelection({ start: new Date(event.start), end: new Date(event.end) });
    setEditingSessionId(props.dbId);
    setEditingSessionData({ projectId: String(props.projectId ?? ''), description: props.description || '' });
    setShowSessionModal(true);
  };

  const handleReset = async () => {
    if (db) { await resetDatabase(db); window.location.reload(); }
  };

  // ── Tages- & Wochenfortschritt ───────────────────────────────────────────
  const { todayHours, weekHours } = (() => {
    const now      = new Date();
    const today    = new Date(now); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today); todayEnd.setDate(todayEnd.getDate() + 1);

    // Montag dieser Woche (oder Sonntag je nach firstDayOfWeek)
    const firstDay  = settings.firstDayOfWeek ?? 1;
    const dayOfWeek = now.getDay(); // 0=So, 1=Mo, ...
    const diff      = (dayOfWeek - firstDay + 7) % 7;
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - diff);
    const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);

    const manualSessions = calendarEvents.filter(e => e.extendedProps?.type === 'manual');
    const hours = (from: Date, to: Date) =>
      manualSessions
        .filter(e => new Date(e.start) >= from && new Date(e.start) < to)
        .reduce((sum, e) => sum + (new Date(e.end).getTime() - new Date(e.start).getTime()) / 3600000, 0);

    return { todayHours: hours(today, todayEnd), weekHours: hours(weekStart, weekEnd) };
  })();
  const dailyTarget = settings.dailyTarget ?? 8;
  const targetPct   = Math.min(100, (todayHours / dailyTarget) * 100);
  const targetColor = targetPct >= 100 ? '#10b981' : targetPct >= 60 ? '#3b82f6' : '#f59e0b';

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

      <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <SessionsPanel
        isOpen={showSessionsPanel}
        onClose={() => setShowSessionsPanel(false)}
        events={calendarEvents}
        projects={projects}
        onEdit={handleEditFromPanel}
        onDelete={handleDeleteSession}
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

        {/* Mitte: Tages- & Wochenfortschritt */}
        {viewMode !== 'dashboard' && isReady && (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div className="header-progress" title={`Heute: ${todayHours.toFixed(1)}h von ${dailyTarget}h Tagesziel`}>
              <div className="header-progress-label">
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Heute</span>
                <span>{todayHours.toFixed(1)}h <span style={{ opacity: 0.45 }}>/ {dailyTarget}h</span></span>
              </div>
              <div className="header-progress-bar">
                <div className="header-progress-fill" style={{ width: `${targetPct}%`, background: targetColor }} />
              </div>
            </div>
            <div className="header-progress" title={`Diese Woche: ${weekHours.toFixed(1)}h`}>
              <div className="header-progress-label">
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Woche</span>
                <span>{weekHours.toFixed(1)}h</span>
              </div>
              <div className="header-progress-bar">
                <div className="header-progress-fill" style={{ width: `${Math.min(100, (weekHours / (dailyTarget * 5)) * 100)}%`, background: '#6366f1' }} />
              </div>
            </div>
          </div>
        )}

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

          <button className="btn-settings" onClick={() => setShowSessionsPanel(true)} title="Sessionen-Liste (L)">
            <FaList size={14} />
          </button>
          <button className="btn-settings" onClick={() => setShowShortcuts(true)} title="Tastaturkürzel (?)">
            <FaKeyboard size={14} />
          </button>
          <button className="btn-settings" onClick={() => setShowSettings(true)} title="Einstellungen öffnen (Ctrl+,)">
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
            firstDayOfWeek={settings.firstDayOfWeek ?? 1}
          />
        )}
      </div>
    </div>
  );
}

export default App;
