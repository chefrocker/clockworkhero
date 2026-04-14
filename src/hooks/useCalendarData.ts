import { useState, useEffect, useRef, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import Database from '@tauri-apps/plugin-sql';
import { loadAllEvents, loadProjects, logActiveWindow, DateRange, AppSettings } from '../services/db';
import { Project } from '../types';
import { toast } from '../components/Toast';

interface WindowInfo { title: string; path: string; }

export function useCalendarData(
  db:          Database | null,
  isEditMode:  boolean,
  viewMode:    'day' | 'week' | 'dashboard',
  settings:    AppSettings
) {
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [projects,       setProjects]       = useState<Project[]>([]);

  // null = CalendarEngine hat noch keine Range gemeldet → kein frühzeitiger Load
  const [visibleRange, setVisibleRange] = useState<DateRange | null>(null);
  const lastSavedTitle = useRef<string>('');

  // ── Core refresh ─────────────────────────────────────────────────────────
  const refreshData = useCallback(async (
    database:    Database,
    editMode:    boolean,
    currentView: 'day' | 'week',
    cfg:         AppSettings,
    range:       DateRange | null,
  ) => {
    const threshold = cfg.autoGrouping
      ? (currentView === 'week' ? 45 : 10)
      : (cfg.groupingThreshold || 10);

    try {
      const [events, projs] = await Promise.all([
        loadAllEvents(database, editMode, threshold, range ?? undefined),
        loadProjects(database),
      ]);
      setCalendarEvents(events);
      setProjects(projs);

      // Tray-Tooltip: heutige gebuchte Stunden
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
      invoke('update_tray_tooltip', {
        text: `ClockworkHero • Heute: ${todayHours.toFixed(1)}h`,
      }).catch(() => {});
    } catch (e) {
      console.error('refreshData Fehler:', e);
      toast.error('Daten konnten nicht geladen werden', 'Bitte das Programm neu starten.');
    }
  }, []);

  // Convenience-Wrapper – immer aktuelle State-Werte dank Closure über refreshData
  const refresh = useCallback(() => {
    if (!db || viewMode === 'dashboard') return;
    refreshData(db, isEditMode, viewMode, settings, visibleRange);
  }, [db, isEditMode, viewMode, settings, visibleRange, refreshData]);

  // ── Sichtbaren Bereich aktualisieren (CalendarEngine → datesSet) ─────────
  const handleRangeChange = useCallback((start: Date, end: Date) => {
    // Defensiv: ungültige Dates verwerfen
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return;

    setVisibleRange(prev => {
      if (
        prev &&
        prev.start.getTime() === start.getTime() &&
        prev.end.getTime()   === end.getTime()
      ) return prev;                       // keine Änderung → kein Re-Render
      return { start, end };
    });
  }, []);

  // ── Haupt-Refresh-Effekt ──────────────────────────────────────────────────
  // Lädt neu wenn: DB bereit wird, Range sich ändert, Modus/Settings wechseln.
  // Startet NICHT bevor CalendarEngine die echte Range gemeldet hat (visibleRange !== null).
  useEffect(() => {
    if (!db) return;
    if (viewMode === 'dashboard') return;
    if (!visibleRange) return;            // warten bis CalendarEngine datesSet feuert

    refreshData(db, isEditMode, viewMode, settings, visibleRange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRange, db, isEditMode, viewMode, settings.groupingThreshold, settings.autoGrouping]);

  // ── Active-Window Listener ────────────────────────────────────────────────
  // Refs halten immer aktuelle Werte → kein stale-closure-Problem.
  const dbRef          = useRef(db);
  const editModeRef    = useRef(isEditMode);
  const viewModeRef    = useRef(viewMode);
  const settingsRef    = useRef(settings);
  const visibleRangeRef = useRef(visibleRange);
  useEffect(() => { dbRef.current          = db;          }, [db]);
  useEffect(() => { editModeRef.current    = isEditMode;  }, [isEditMode]);
  useEffect(() => { viewModeRef.current    = viewMode;    }, [viewMode]);
  useEffect(() => { settingsRef.current    = settings;    }, [settings]);
  useEffect(() => { visibleRangeRef.current = visibleRange; }, [visibleRange]);

  useEffect(() => {
    if (!db) return;

    const unlistenPromise = listen<WindowInfo>('active-window-change', async event => {
      const { title = 'Unbekannt', path = '' } = event.payload;
      if (title === lastSavedTitle.current || title === 'Unbekannt') return;

      try {
        await logActiveWindow(db, title, path);
        lastSavedTitle.current = title;

        setTimeout(() => {
          const currentDb   = dbRef.current;
          const currentView = viewModeRef.current;
          if (!currentDb || currentView === 'dashboard') return;
          refreshData(
            currentDb,
            editModeRef.current,
            currentView,
            settingsRef.current,
            visibleRangeRef.current,
          );
        }, 100);
      } catch (e) { console.error('Fehler beim Speichern:', e); }
    });

    return () => { unlistenPromise.then(u => u()); };
  // Listener nur neu aufbauen wenn DB-Instanz wechselt
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  // ── 60-Sekunden Fallback-Refresh ─────────────────────────────────────────
  useEffect(() => {
    if (!db) return;
    const id = setInterval(() => {
      if (viewModeRef.current !== 'dashboard') {
        refreshData(
          dbRef.current!,
          editModeRef.current,
          viewModeRef.current,
          settingsRef.current,
          visibleRangeRef.current,
        );
      }
    }, 60_000);
    return () => clearInterval(id);
  // Interval nur neu aufbauen wenn DB wechselt
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  return { calendarEvents, projects, setProjects, refresh, handleRangeChange };
}
