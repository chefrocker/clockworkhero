import { useState, useEffect } from 'react';
import Database from '@tauri-apps/plugin-sql';
import { saveSession, loadProjects } from '../services/db';
import { toast } from '../components/Toast';

interface TimerState {
  isRunning:   boolean;
  startTime:   number | null;
  projectId:   string;
  description: string;
}

const STORAGE_KEY = 'clockwork_timer';

const EMPTY_TIMER: TimerState = {
  isRunning: false, startTime: null, projectId: '', description: '',
};

function loadSavedTimer(): TimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_TIMER;
    const parsed = JSON.parse(raw) as TimerState;
    // Sanity-Check: Pflichtfelder müssen vorhanden sein
    if (typeof parsed.isRunning !== 'boolean') return EMPTY_TIMER;
    return parsed;
  } catch {
    return EMPTY_TIMER;
  }
}

export function useTimer(db: Database | null, onSaved?: () => void) {
  const [timerState, setTimerState] = useState<TimerState>(loadSavedTimer);
  const [timerDisplay, setTimerDisplay] = useState('00:00:00');

  // ── Gespeicherte projectId gegen DB validieren ────────────────────────────
  // Wenn das Projekt gelöscht wurde, Timer zurücksetzen (kein stummer Fehlschlag).
  useEffect(() => {
    if (!db || !timerState.projectId) return;
    (async () => {
      try {
        const projects = await loadProjects(db);
        const exists = projects.some(p => p.id.toString() === timerState.projectId);
        if (!exists) {
          console.warn('Timer-Projekt existiert nicht mehr – Timer wird zurückgesetzt.');
          toast.warning('Timer zurückgesetzt', 'Das zugeordnete Projekt wurde gelöscht.');
          const reset = { ...EMPTY_TIMER };
          setTimerState(reset);
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        console.error('Timer-Validierung fehlgeschlagen:', e);
      }
    })();
  // Nur einmal prüfen wenn db verfügbar wird
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  // ── Tick ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerState.isRunning || !timerState.startTime) {
      setTimerDisplay('00:00:00');
      return;
    }
    const id = setInterval(() => {
      const diff = Date.now() - timerState.startTime!;
      setTimerDisplay(new Date(diff).toISOString().substr(11, 8));
    }, 1000);
    return () => clearInterval(id);
  }, [timerState.isRunning, timerState.startTime]);

  // ── State-Update mit automatischem localStorage-Sync ─────────────────────
  const updateTimer = (patch: Partial<TimerState>) => {
    setTimerState(prev => {
      const next = { ...prev, ...patch };
      if (next.isRunning && next.startTime) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      return next;
    });
  };

  // ── Timer-Aktionen ────────────────────────────────────────────────────────
  const startTimer = () => {
    if (!timerState.projectId) {
      toast.warning('Kein Projekt gewählt', 'Bitte wähle ein Projekt aus bevor du den Timer startest.');
      return;
    }
    updateTimer({ isRunning: true, startTime: Date.now() });
  };

  const stopTimer = async () => {
    if (!timerState.isRunning || !timerState.startTime || !db) return;
    const end   = new Date();
    const start = new Date(timerState.startTime);
    try {
      await saveSession(db, start, end, timerState.projectId, timerState.description);
      const hrs = ((end.getTime() - start.getTime()) / 3600000).toFixed(1);
      toast.success('Timer gestoppt', `${hrs} Std gespeichert`);
      onSaved?.();
    } catch (e) {
      console.error('Timer-Stop Fehler:', e);
      toast.error('Timer konnte nicht gespeichert werden');
    }
    updateTimer({ ...EMPTY_TIMER });
  };

  return { timerState, timerDisplay, updateTimer, startTimer, stopTimer };
}
