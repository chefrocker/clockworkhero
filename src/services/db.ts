import Database from '@tauri-apps/plugin-sql';
import { LogEntry, Project, ColorEntry, WorkSession, AppSettings, ActivitySubEvent } from '../types';
// RE-EXPORTIEREN DAMIT SETTINGS MODAL SIE FINDET
import { exportSessionsToExcel, exportAllLogsToExcel, backupDatabase, restoreDatabase } from './exportService';
import { getDashboardStats, DashboardStats } from './analyticsService';

// WICHTIG: AppSettings muss exportiert werden!
export { exportSessionsToExcel, exportAllLogsToExcel, backupDatabase, restoreDatabase, getDashboardStats };
export type { DashboardStats, AppSettings }; 

// --- HELPER ---
function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 85%)`; 
}

function simplifyAppName(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('chrome')) return 'Google Chrome';
  if (t.includes('firefox')) return 'Firefox';
  if (t.includes('edge')) return 'Edge';
  if (t.includes('code') || t.includes('visual studio')) return 'VS Code';
  if (t.includes('word')) return 'Word';
  if (t.includes('excel')) return 'Excel';
  if (t.includes('powerpoint')) return 'PowerPoint';
  if (t.includes('spotify')) return 'Spotify';
  if (t.includes('discord')) return 'Discord';
  if (t.includes('teams')) return 'Microsoft Teams';
  if (t.includes('explorer')) return 'Explorer';
  
  const parts = title.split('\\');
  const lastPart = parts[parts.length - 1];
  return lastPart.replace('.exe', '').split(' - ')[0].trim() || title; 
}

// --- INIT ---
export async function initDatabase(): Promise<Database> {
  const db = await Database.load("sqlite:tracker.db");
  
  await db.execute(`CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, exe_path TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS app_colors (name TEXT PRIMARY KEY, color TEXT)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, color TEXT, icon TEXT, icon_type TEXT)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS work_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, description TEXT, start_time DATETIME, end_time DATETIME)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
  
  try { await db.execute("ALTER TABLE logs ADD COLUMN exe_path TEXT"); } catch (e) {}
  try { await db.execute("ALTER TABLE projects ADD COLUMN icon TEXT"); } catch (e) {}
  try { await db.execute("ALTER TABLE projects ADD COLUMN icon_type TEXT"); } catch (e) {}
  
  return db;
}

// --- SETTINGS ---
const DEFAULT_SETTINGS: AppSettings = {
  workStart: "08:00",
  workEnd: "17:00",
  dailyTarget: 8,
  theme: "light",
  groupingThreshold: 5
};

export async function loadSettings(db: Database): Promise<AppSettings> {
  const rows = await db.select<{key: string, value: string}[]>("SELECT * FROM settings");
  const settings: any = { ...DEFAULT_SETTINGS };
  
  rows.forEach(row => {
    if (row.key === 'workStart') settings.workStart = row.value;
    if (row.key === 'workEnd') settings.workEnd = row.value;
    if (row.key === 'dailyTarget') settings.dailyTarget = parseFloat(row.value);
    if (row.key === 'theme') settings.theme = row.value;
    if (row.key === 'groupingThreshold') settings.groupingThreshold = parseInt(row.value);
    if (row.key === 'adminPassword') settings.adminPassword = row.value;
    if (row.key === 'weekSchedule') {
        try {
            settings.weekSchedule = JSON.parse(row.value);
        } catch (e) {
            console.error("Fehler beim Laden des Wochenplans:", e);
        }
    }
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
    await saveSetting(db, 'groupingThreshold', (settings.groupingThreshold || 5).toString());
    if (settings.adminPassword !== undefined) await saveSetting(db, 'adminPassword', settings.adminPassword);
    
    if (settings.weekSchedule) {
        await saveSetting(db, 'weekSchedule', JSON.stringify(settings.weekSchedule));
    }
}

// --- DATA MANAGEMENT ---
export async function resetDatabase(db: Database) {
  await db.execute("DELETE FROM logs");
  await db.execute("DELETE FROM work_sessions");
  await db.execute("DELETE FROM projects");
  await db.execute("DELETE FROM app_colors");
  await db.execute("DELETE FROM settings");
}

export async function getKnownApps(db: Database): Promise<{name: string, color: string}[]> {
    const logs = await db.select<any[]>("SELECT DISTINCT title, exe_path FROM logs LIMIT 5000");
    const uniqueNames = new Set<string>();
    
    logs.forEach(l => {
        uniqueNames.add(simplifyAppName(l.title || l.exe_path));
    });

    const result = [];
    for (const name of uniqueNames) {
        const colorRow = await db.select<any[]>("SELECT color FROM app_colors WHERE name = $1", [name]);
        const color = colorRow.length > 0 ? colorRow[0].color : stringToColor(name);
        result.push({ name, color });
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveAppColor(db: Database, appName: string, color: string) {
    await db.execute("INSERT OR REPLACE INTO app_colors (name, color) VALUES ($1, $2)", [appName, color]);
}

// --- PROJECTS ---
export async function loadProjects(db: Database): Promise<Project[]> {
  // WICHTIG: Mapping von DB (snake_case) zu TS (camelCase)
  const rows = await db.select<any[]>("SELECT * FROM projects");
  return rows.map(row => ({
      id: row.id,
      name: row.name,
      color: row.color,
      icon: row.icon,
      iconType: row.icon_type as 'app' | 'image' // Mapping hier!
  }));
}

export async function addProject(db: Database, name: string, color: string, icon?: string, iconType?: string) {
  await db.execute("INSERT INTO projects (name, color, icon, icon_type) VALUES ($1, $2, $3, $4)", [name, color, icon || null, iconType || 'app']);
}
export async function updateProject(db: Database, id: number, name: string, color: string, icon?: string, iconType?: string) {
  await db.execute("UPDATE projects SET name = $1, color = $2, icon = $3, icon_type = $4 WHERE id = $5", [name, color, icon || null, iconType || 'app', id]);
}
export async function deleteProject(db: Database, id: number) {
  await db.execute("DELETE FROM projects WHERE id = $1", [id]);
  await db.execute("UPDATE work_sessions SET project_id = NULL WHERE project_id = $1", [id]);
}

// --- LOGGING & SESSIONS ---
export async function logActiveWindow(db: Database, title: string, path: string) {
  await db.execute("INSERT INTO logs (title, exe_path) VALUES ($1, $2)", [title, path]);
}

export async function saveSession(db: Database, start: Date, end: Date, projectId: string, desc: string, existingId?: number) {
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const pId = projectId ? parseInt(projectId) : null;

  if (existingId) await db.execute("DELETE FROM work_sessions WHERE id = $1", [existingId]);

  const conflicts = await db.select<WorkSession[]>("SELECT * FROM work_sessions WHERE start_time < $1 AND end_time > $2", [endIso, startIso]);
  for (const c of conflicts) {
    const cStart = new Date(c.start_time);
    const cEnd = new Date(c.end_time);
    if (cStart >= start && cEnd <= end) {
      await db.execute("DELETE FROM work_sessions WHERE id = $1", [c.id]);
    } else if (cStart < start && cEnd > end) {
      await db.execute("UPDATE work_sessions SET end_time = $1 WHERE id = $2", [startIso, c.id]);
      await db.execute("INSERT INTO work_sessions (project_id, description, start_time, end_time) VALUES ($1, $2, $3, $4)", [c.project_id, c.description, endIso, cEnd.toISOString()]);
    } else if (cStart < start && cEnd > start) {
      await db.execute("UPDATE work_sessions SET end_time = $1 WHERE id = $2", [startIso, c.id]);
    } else if (cStart < end && cEnd > end) {
      await db.execute("UPDATE work_sessions SET start_time = $1 WHERE id = $2", [endIso, c.id]);
    }
  }
  await db.execute("INSERT INTO work_sessions (project_id, description, start_time, end_time) VALUES ($1, $2, $3, $4)", [pId, desc, startIso, endIso]);
}

export async function deleteSession(db: Database, id: string) {
  const realId = id.replace('manual-', '');
  await db.execute("DELETE FROM work_sessions WHERE id = $1", [realId]);
}

// --- LOAD ALL EVENTS ---
export async function loadAllEvents(db: Database, editMode: boolean, groupingThresholdMinutes: number): Promise<any[]> {
  const allEvents = [];
  const colorCache = new Map<string, string>();
  const colors = await db.select<ColorEntry[]>("SELECT * FROM app_colors");
  colors.forEach(c => colorCache.set(c.name, c.color));

  async function getColor(name: string) {
    if (colorCache.has(name)) return colorCache.get(name)!;
    const c = stringToColor(name);
    colorCache.set(name, c);
    return c;
  }

  const logs = await db.select<LogEntry[]>("SELECT * FROM logs ORDER BY created_at ASC LIMIT 15000");
  if (logs.length > 0) {
    let currentGroup = {
      appName: simplifyAppName(logs[0].title || logs[0].exe_path),
      exePath: logs[0].exe_path,
      start: new Date(logs[0].created_at.replace(" ", "T") + "Z"),
      end: new Date(logs[0].created_at.replace(" ", "T") + "Z"),
      subEvents: [] as ActivitySubEvent[]
    };
    currentGroup.start.setSeconds(0, 0);
    currentGroup.end = new Date(currentGroup.start.getTime() + 60000); 
    currentGroup.subEvents.push({ time: currentGroup.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), title: logs[0].title });

    for (let i = 1; i < logs.length; i++) {
      const log = logs[i];
      const logTime = new Date(log.created_at.replace(" ", "T") + "Z");
      logTime.setSeconds(0, 0);
      const appName = simplifyAppName(log.title || log.exe_path);
      const gapInMinutes = (logTime.getTime() - currentGroup.end.getTime()) / 60000;
      
      if (appName === currentGroup.appName && gapInMinutes <= groupingThresholdMinutes) {
        currentGroup.end = new Date(logTime.getTime() + 60000);
        const lastSub = currentGroup.subEvents[currentGroup.subEvents.length - 1];
        if (lastSub.title !== log.title) {
            currentGroup.subEvents.push({ time: logTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), title: log.title });
        }
      } else {
        const color = await getColor(currentGroup.appName);
        if (currentGroup.end > currentGroup.start) {
            allEvents.push({
              id: 'auto-group-' + i,
              title: currentGroup.appName,
              start: currentGroup.start,
              end: currentGroup.end,
              display: 'block',
              backgroundColor: color,
              extendedProps: {
                type: 'auto',
                order: 2,
                simpleName: currentGroup.appName,
                exePath: currentGroup.exePath,
                appColor: color,
                subEvents: currentGroup.subEvents,
                isEditMode: editMode
              }
            });
        }
        currentGroup = {
          appName: appName,
          exePath: log.exe_path,
          start: logTime,
          end: new Date(logTime.getTime() + 60000),
          subEvents: [{ time: logTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), title: log.title }]
        };
      }
    }
    const color = await getColor(currentGroup.appName);
    allEvents.push({
        id: 'auto-group-last',
        title: currentGroup.appName,
        start: currentGroup.start,
        end: currentGroup.end,
        display: 'block',
        backgroundColor: color,
        extendedProps: {
          type: 'auto',
          order: 2,
          simpleName: currentGroup.appName,
          exePath: currentGroup.exePath,
          appColor: color,
          subEvents: currentGroup.subEvents,
          isEditMode: editMode
        }
    });
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
        // FIX: Hier greifen wir auf das bereits gemappte iconType zu
        projectIconType: project?.iconType,
        description: session.description
      }
    });
  }
  return allEvents;
}
