import Database from '@tauri-apps/plugin-sql';
import { LogEntry, Project, WorkSession, AppSettings, ActivitySubEvent } from '../types';
import { exportSessionsToExcel, exportAllLogsToExcel, backupDatabase, restoreDatabase } from './exportService';
import { getDashboardStats, DashboardStats } from './analyticsService';

export { exportSessionsToExcel, exportAllLogsToExcel, backupDatabase, restoreDatabase, getDashboardStats };
export type { DashboardStats, AppSettings };

// --- HELPER: PROZESS-BASIERTE ERKENNUNG ---

// Mapping von Exe-Namen zu schönen Anzeigenamen
const EXE_MAPPING: Record<string, string> = {
  'notepad++.exe': 'Notepad++',
  'chrome.exe': 'Google Chrome',
  'firefox.exe': 'Firefox',
  'msedge.exe': 'Edge',
  'code.exe': 'VS Code',
  'winword.exe': 'Word',
  'excel.exe': 'Excel',
  'powerpnt.exe': 'PowerPoint',
  'outlook.exe': 'Outlook',
  'onenote.exe': 'OneNote',
  'teams.exe': 'Teams',
  'spotify.exe': 'Spotify',
  'discord.exe': 'Discord',
  'whatsapp.exe': 'WhatsApp',
  'slack.exe': 'Slack',
  'explorer.exe': 'Explorer',
  'cmd.exe': 'Terminal',
  'powershell.exe': 'Terminal',
  'pwsh.exe': 'Terminal',
  'wt.exe': 'Terminal',
  'powershell_ise.exe': 'Terminal'
};

function getAppNameFromPath(path: string, title: string): string {
  if (!path) return title || "Unbekannt";

  // 1. Dateinamen aus Pfad extrahieren (z.B. "C:\Program Files\App\app.exe" -> "app.exe")
  // Wir splitten sowohl nach \ als auch / um sicherzugehen
  const parts = path.split(/[/\\]/);
  const filename = parts[parts.length - 1].toLowerCase();

  // 2. Prüfen ob wir ein schönes Mapping haben
  if (EXE_MAPPING[filename]) {
    return EXE_MAPPING[filename];
  }

  // 3. Fallback: .exe entfernen und den ersten Buchstaben groß machen
  let cleanName = filename.replace('.exe', '');
  return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
}

function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 85%)`;
}

// --- INIT ---
export async function initDatabase(): Promise<Database> {
  const db = await Database.load("sqlite:tracker.db");

  await db.execute(`CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, exe_path TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS app_colors (name TEXT PRIMARY KEY, color TEXT, icon TEXT)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, color TEXT, icon TEXT, icon_type TEXT)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS work_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, description TEXT, start_time DATETIME, end_time DATETIME)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);

  try { await db.execute("ALTER TABLE logs ADD COLUMN exe_path TEXT"); } catch (e) { }
  try { await db.execute("ALTER TABLE projects ADD COLUMN icon TEXT"); } catch (e) { }
  try { await db.execute("ALTER TABLE projects ADD COLUMN icon_type TEXT"); } catch (e) { }
  try { await db.execute("ALTER TABLE app_colors ADD COLUMN icon TEXT"); } catch (e) { }

  return db;
}

// --- SETTINGS ---
const DEFAULT_SETTINGS: AppSettings = {
  workStart: "08:00", workEnd: "17:00", dailyTarget: 8, theme: "light", groupingThreshold: 10, autoGrouping: false
};

export async function loadSettings(db: Database): Promise<AppSettings> {
  const rows = await db.select<{ key: string, value: string }[]>("SELECT * FROM settings");
  const settings: any = { ...DEFAULT_SETTINGS };
  rows.forEach(row => {
    if (row.key === 'workStart') settings.workStart = row.value;
    if (row.key === 'workEnd') settings.workEnd = row.value;
    if (row.key === 'dailyTarget') settings.dailyTarget = parseFloat(row.value);
    if (row.key === 'theme') settings.theme = row.value;
    if (row.key === 'groupingThreshold') settings.groupingThreshold = parseInt(row.value);
    if (row.key === 'autoGrouping') settings.autoGrouping = row.value === 'true';
    if (row.key === 'autostart') settings.autostart = row.value === 'true';
    if (row.key === 'adminPassword') settings.adminPassword = row.value;
    if (row.key === 'weekSchedule') { try { settings.weekSchedule = JSON.parse(row.value); } catch (e) { } }
  });
  return settings;
}

export async function saveSetting(db: Database, key: string, value: string) {
  await db.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)", [key, value]);
}

export async function saveSettings(db: Database, settings: AppSettings) {
  await saveSetting(db, 'workStart', settings.workStart || "08:00");
  await saveSetting(db, 'workEnd', settings.workEnd || "17:00");
  await saveSetting(db, 'dailyTarget', (settings.dailyTarget || 8).toString());
  await saveSetting(db, 'groupingThreshold', (settings.groupingThreshold || 10).toString());
  await saveSetting(db, 'autoGrouping', (settings.autoGrouping ?? false).toString());
  await saveSetting(db, 'autostart', (settings.autostart ?? false).toString());
  if (settings.adminPassword !== undefined) await saveSetting(db, 'adminPassword', settings.adminPassword);
  if (settings.weekSchedule) await saveSetting(db, 'weekSchedule', JSON.stringify(settings.weekSchedule));
}

// --- DATA MANAGEMENT ---
export async function resetDatabase(db: Database) {
  await db.execute("DELETE FROM logs"); await db.execute("DELETE FROM work_sessions"); await db.execute("DELETE FROM projects"); await db.execute("DELETE FROM app_colors"); await db.execute("DELETE FROM settings");
}

export async function getKnownApps(db: Database): Promise<{ name: string, color: string, icon?: string }[]> {
  const logs = await db.select<any[]>("SELECT DISTINCT title, exe_path FROM logs LIMIT 5000");
  const uniqueNames = new Set<string>();

  logs.forEach(l => {
    // Hier nutzen wir auch die neue Logik für die Settings-Liste
    uniqueNames.add(getAppNameFromPath(l.exe_path, l.title));
  });

  const result = [];
  for (const name of uniqueNames) {
    const configRow = await db.select<any[]>("SELECT color, icon FROM app_colors WHERE name = $1", [name]);
    const color = configRow.length > 0 ? configRow[0].color : stringToColor(name);
    const icon = configRow.length > 0 ? configRow[0].icon : undefined;
    result.push({ name, color, icon });
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveAppConfig(db: Database, appName: string, color: string, icon?: string) {
  const existing = await db.select<any[]>("SELECT * FROM app_colors WHERE name = $1", [appName]);
  let newColor = color; let newIcon = icon;
  if (existing.length > 0) { if (!newColor) newColor = existing[0].color; if (newIcon === undefined) newIcon = existing[0].icon; }
  await db.execute("INSERT OR REPLACE INTO app_colors (name, color, icon) VALUES ($1, $2, $3)", [appName, newColor, newIcon]);
}

// --- PROJECTS ---
export async function loadProjects(db: Database): Promise<Project[]> {
  const rows = await db.select<any[]>("SELECT * FROM projects");
  return rows.map(row => ({ id: row.id, name: row.name, color: row.color, icon: row.icon, iconType: row.icon_type as 'app' | 'image' }));
}
export async function addProject(db: Database, name: string, color: string, icon?: string, iconType?: string) {
  await db.execute("INSERT INTO projects (name, color, icon, icon_type) VALUES ($1, $2, $3, $4)", [name, color, icon || null, iconType || 'app']);
}
export async function updateProject(db: Database, id: number, name: string, color: string, icon?: string, iconType?: string) {
  await db.execute("UPDATE projects SET name = $1, color = $2, icon = $3, icon_type = $4 WHERE id = $5", [name, color, icon || null, iconType || 'app', id]);
}
export async function deleteProject(db: Database, id: number) {
  await db.execute("DELETE FROM projects WHERE id = $1", [id]); await db.execute("UPDATE work_sessions SET project_id = NULL WHERE project_id = $1", [id]);
}

// --- LOGGING & SESSIONS ---
export async function logActiveWindow(db: Database, title: string, path: string) {
  await db.execute("INSERT INTO logs (title, exe_path) VALUES ($1, $2)", [title, path]);
}

export async function saveSession(db: Database, start: Date, end: Date, projectId: string, desc: string, existingId?: number) {
  const startIso = start.toISOString(); const endIso = end.toISOString(); const pId = projectId ? parseInt(projectId) : null;
  if (existingId) await db.execute("DELETE FROM work_sessions WHERE id = $1", [existingId]);
  const conflicts = await db.select<WorkSession[]>("SELECT * FROM work_sessions WHERE start_time < $1 AND end_time > $2", [endIso, startIso]);
  for (const c of conflicts) {
    const cStart = new Date(c.start_time); const cEnd = new Date(c.end_time);
    if (cStart >= start && cEnd <= end) { await db.execute("DELETE FROM work_sessions WHERE id = $1", [c.id]); }
    else if (cStart < start && cEnd > end) { await db.execute("UPDATE work_sessions SET end_time = $1 WHERE id = $2", [startIso, c.id]); await db.execute("INSERT INTO work_sessions (project_id, description, start_time, end_time) VALUES ($1, $2, $3, $4)", [c.project_id, c.description, endIso, cEnd.toISOString()]); }
    else if (cStart < start && cEnd > start) { await db.execute("UPDATE work_sessions SET end_time = $1 WHERE id = $2", [startIso, c.id]); }
    else if (cStart < end && cEnd > end) { await db.execute("UPDATE work_sessions SET start_time = $1 WHERE id = $2", [endIso, c.id]); }
  }
  await db.execute("INSERT INTO work_sessions (project_id, description, start_time, end_time) VALUES ($1, $2, $3, $4)", [pId, desc, startIso, endIso]);
}

export async function deleteSession(db: Database, id: string) {
  const realId = id.replace('manual-', ''); await db.execute("DELETE FROM work_sessions WHERE id = $1", [realId]);
}

// --- LOAD ALL EVENTS ---
export async function loadAllEvents(db: Database, editMode: boolean, groupingThresholdMinutes: number): Promise<any[]> {
  const allEvents = [];

  const appConfigCache = new Map<string, { color: string, icon?: string }>();
  const configs = await db.select<any[]>("SELECT name, color, icon FROM app_colors");
  configs.forEach(c => appConfigCache.set(c.name, { color: c.color, icon: c.icon }));

  async function getAppConfig(name: string) {
    if (appConfigCache.has(name)) return appConfigCache.get(name)!;
    const c = stringToColor(name);
    const config = { color: c, icon: undefined };
    appConfigCache.set(name, config);
    return config;
  }


  const logs = await db.select<LogEntry[]>("SELECT * FROM logs ORDER BY created_at ASC LIMIT 15000");
  if (logs.length > 0) {
    // Sicherstellen, dass das Intervall ein Vielfaches von 5 ist (min. 5)
    const interval = Math.max(5, Math.ceil((groupingThresholdMinutes || 15) / 5) * 5);
    const slotDurationMs = interval * 60 * 1000;
    const slots = new Map<number, Map<string, { appName: string, exePath: string, subEvents: ActivitySubEvent[] }>>();

    for (const log of logs) {
      const logTime = new Date(log.created_at.replace(" ", "T") + "Z");
      // Slot berechnen: Abgerundet auf das Vielfache von slotDurationMs
      const slotTimestamp = Math.floor(logTime.getTime() / slotDurationMs) * slotDurationMs;

      const appName = getAppNameFromPath(log.exe_path, log.title);

      if (!slots.has(slotTimestamp)) {
        slots.set(slotTimestamp, new Map());
      }

      const appsInSlot = slots.get(slotTimestamp)!;
      if (!appsInSlot.has(appName)) {
        appsInSlot.set(appName, {
          appName: appName,
          exePath: log.exe_path,
          subEvents: []
        });
      }

      const appData = appsInSlot.get(appName)!;
      const lastSub = appData.subEvents[appData.subEvents.length - 1];
      if (!lastSub || lastSub.title !== log.title) {
        appData.subEvents.push({
          time: logTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          title: log.title
        });
      }
    }

    // Slots in Events umwandeln
    const sortedSlotTimes = Array.from(slots.keys()).sort((a, b) => a - b);
    for (const slotTime of sortedSlotTimes) {
      const appsInSlot = slots.get(slotTime)!;
      const slotStart = new Date(slotTime);
      const slotEnd = new Date(slotTime + slotDurationMs);
      const appArray = Array.from(appsInSlot.entries());
      const totalInSlot = appArray.length;

      // Für die Anzeige im Kalender nutzen wir eine "visuelle" Dauer, 
      // aber alle Karten eines Slots starten zum gleichen Zeitpunkt.
      for (let i = 0; i < totalInSlot; i++) {
        const [appName, data] = appArray[i];
        const config = await getAppConfig(appName);
        allEvents.push({
          id: `slot-${slotTime}-${appName}`,
          title: appName,
          start: slotStart,
          end: slotEnd, // Die Karte füllt den ganzen Slot visuell
          display: 'block',
          backgroundColor: config.color,
          extendedProps: {
            type: 'auto',
            order: 2,
            simpleName: appName,
            exePath: data.exePath,
            appColor: config.color,
            appIcon: config.icon,
            subEvents: data.subEvents,
            isEditMode: editMode,
            realStart: slotStart,
            realEnd: slotEnd,
            slotRank: i,
            slotCount: totalInSlot
          }
        });
      }
    }
  }

  const sessions = await db.select<WorkSession[]>("SELECT * FROM work_sessions");
  const projects = await loadProjects(db);
  for (const session of sessions) {
    const project = projects.find(p => p.id === session.project_id);
    const color = project ? project.color : '#34495e';
    const name = project ? project.name : 'Ohne Projekt';

    allEvents.push({
      id: 'manual-' + session.id,
      title: session.description || name,
      start: new Date(session.start_time),
      end: new Date(session.end_time),
      display: 'block',
      backgroundColor: 'transparent',
      extendedProps: {
        type: 'manual',
        order: 1,
        dbId: session.id,
        projectId: session.project_id,
        projectName: name,
        projectColor: color,
        projectIcon: project?.icon,
        projectIconType: project?.iconType,
        description: session.description
      }
    });
  }
  return allEvents;
}
