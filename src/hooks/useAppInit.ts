import { useState, useEffect } from 'react';
import Database from '@tauri-apps/plugin-sql';
import { initDatabase, loadSettings, AppSettings } from '../services/db';

const DEFAULT_SETTINGS: AppSettings = {
  workStart: '08:00',
  workEnd: '17:00',
  theme: 'light',
  groupingThreshold: 10,
  dailyTarget: 8,
};

export function useAppInit() {
  const [db,                 setDb]                 = useState<Database | null>(null);
  const [settings,           setSettings]           = useState<AppSettings>(DEFAULT_SETTINGS);
  const [initialScrollTime,  setInitialScrollTime]  = useState('08:00:00');
  const [isReady,            setIsReady]            = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // DB öffnen + Schema-Migrationen vollständig abschliessen,
        // bevor irgendetwas anderes geladen wird.
        const database       = await initDatabase();
        const loadedSettings = await loadSettings(database);
        if (cancelled) return;

        setDb(database);
        setSettings(loadedSettings);

        // Dark-mode
        if (loadedSettings.darkMode) document.body.classList.add('dark-mode');
        else                          document.body.classList.remove('dark-mode');

        // Scroll auf aktuelle Stunde (Stunde -1 damit der Kontext sichtbar ist)
        const h = Math.max(0, new Date().getHours() - 1).toString().padStart(2, '0');
        setInitialScrollTime(`${h}:00:00`);

        // Erst jetzt als "bereit" markieren → CalendarEngine wird gerendert
        setIsReady(true);
      } catch (e) {
        console.error('DB Init Error:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { db, settings, setSettings, initialScrollTime, isReady };
}
