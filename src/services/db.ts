import Database from '@tauri-apps/plugin-sql';
import { LogEntry, Project, ColorEntry, WorkSession, ActivitySubEvent } from '../types';

// --- HELPER ---
function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 85%)`; 
}

function simplifyAppName(title: string): string {
  const t = title.toLowerCase();
  // Mapping auf Haupt-App-Namen
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
  return title.split(' - ')[0].trim() || title; 
}

// --- INIT ---
export async function initDatabase(): Promise<Database> {
  const db = await Database.load("sqlite:tracker.db");
  await db.execute(`CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, exe_path TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS app_colors (name TEXT PRIMARY KEY, color TEXT)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, color TEXT)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS work_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, description TEXT, start_time DATETIME, end_time DATETIME)`);
  try { await db.execute("ALTER TABLE logs ADD COLUMN exe_path TEXT"); } catch (e) {}
  return db;
}

// --- LOGGING ---
export async function logActiveWindow(db: Database, title: string, path: string) {
  await db.execute("INSERT INTO logs (title, exe_path) VALUES ($1, $2)", [title, path]);
}

// --- PROJECTS ---
export async function loadProjects(db: Database): Promise<Project[]> {
  return await db.select<Project[]>("SELECT * FROM projects");
}
export async function addProject(db: Database, name: string, color: string) {
  await db.execute("INSERT INTO projects (name, color) VALUES ($1, $2)", [name, color]);
}
export async function deleteProject(db: Database, id: number) {
  await db.execute("DELETE FROM projects WHERE id = $1", [id]);
  await db.execute("UPDATE work_sessions SET project_id = NULL WHERE project_id = $1", [id]);
}

// --- SESSIONS ---
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

// --- LOAD ALL (DYNAMISCHES CLUSTERING) ---
// NEU: groupingThresholdMinutes Parameter
export async function loadAllEvents(db: Database, editMode: boolean, groupingThresholdMinutes: number): Promise<any[]> {
  const allEvents = [];
  const colorCache = new Map<string, string>();
  const colors = await db.select<ColorEntry[]>("SELECT * FROM app_colors");
  colors.forEach(c => colorCache.set(c.name, c.color));

  async function getColor(name: string) {
    if (colorCache.has(name)) return colorCache.get(name)!;
    const c = stringToColor(name);
    await db.execute("INSERT INTO app_colors (name, color) VALUES ($1, $2)", [name, c]);
    colorCache.set(name, c);
    return c;
  }

  // 1. AUTO LOGS LADEN
  const logs = await db.select<LogEntry[]>("SELECT * FROM logs ORDER BY created_at ASC LIMIT 10000");
  
  if (logs.length > 0) {
    let currentGroup = {
      appName: simplifyAppName(logs[0].title),
      exePath: logs[0].exe_path,
      start: new Date(logs[0].created_at.replace(" ", "T") + "Z"),
      end: new Date(logs[0].created_at.replace(" ", "T") + "Z"),
      subEvents: [] as ActivitySubEvent[]
    };
    
    currentGroup.start.setSeconds(0, 0);
    currentGroup.end = new Date(currentGroup.start.getTime() + 60000); 

    currentGroup.subEvents.push({
        time: currentGroup.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        title: logs[0].title
    });

    for (let i = 1; i < logs.length; i++) {
      const log = logs[i];
      const logTime = new Date(log.created_at.replace(" ", "T") + "Z");
      logTime.setSeconds(0, 0);
      
      const appName = simplifyAppName(log.title);
      
      // DYNAMISCHES CLUSTERING:
      // Wir nutzen den übergebenen Threshold (5 Min für Tag, 60 Min für Woche)
      const gapInMinutes = (logTime.getTime() - currentGroup.end.getTime()) / 60000;
      
      if (appName === currentGroup.appName && gapInMinutes <= groupingThresholdMinutes) {
        // GRUPPE ERWEITERN
        currentGroup.end = new Date(logTime.getTime() + 60000);
        
        const lastSub = currentGroup.subEvents[currentGroup.subEvents.length - 1];
        if (lastSub.title !== log.title) {
            currentGroup.subEvents.push({
                time: logTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                title: log.title
            });
        }
      } else {
        // GRUPPE ABSCHLIESSEN
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

        // NEUE GRUPPE
        currentGroup = {
          appName: appName,
          exePath: log.exe_path,
          start: logTime,
          end: new Date(logTime.getTime() + 60000),
          subEvents: [{
              time: logTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
              title: log.title
          }]
        };
      }
    }
    // Letzte Gruppe
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

  // 2. MANUAL SESSIONS
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
        description: session.description
      }
    });
  }

  return allEvents;
}
