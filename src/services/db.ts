import Database from '@tauri-apps/plugin-sql';
import { LogEntry, Project, ColorEntry, WorkSession } from '../types';

// Hilfsfunktion für Farben
function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 45%)`; 
}

function simplifyAppName(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('chrome')) return 'Google Chrome';
  if (t.includes('firefox')) return 'Firefox';
  if (t.includes('edge')) return 'Edge';
  if (t.includes('code') || t.includes('visual studio')) return 'VS Code';
  if (t.includes('word')) return 'Word';
  if (t.includes('excel')) return 'Excel';
  if (t.includes('spotify')) return 'Spotify';
  return title.split(' - ')[0] || title; 
}

export async function initDatabase(): Promise<Database> {
  const db = await Database.load("sqlite:tracker.db");
  await db.execute(`CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS app_colors (name TEXT PRIMARY KEY, color TEXT)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, color TEXT)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS work_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, description TEXT, start_time DATETIME, end_time DATETIME)`);
  return db;
}

export async function logActiveWindow(db: Database, title: string) {
  await db.execute("INSERT INTO logs (title) VALUES ($1)", [title]);
}

export async function loadProjects(db: Database): Promise<Project[]> {
  return await db.select<Project[]>("SELECT * FROM projects");
}

export async function addProject(db: Database, name: string, color: string) {
  await db.execute("INSERT INTO projects (name, color) VALUES ($1, $2)", [name, color]);
}

export async function deleteProject(db: Database, id: number) {
  await db.execute("DELETE FROM projects WHERE id = $1", [id]);
}

export async function saveSession(db: Database, start: Date, end: Date, projectId: string, desc: string) {
  await db.execute(
    "INSERT INTO work_sessions (project_id, description, start_time, end_time) VALUES ($1, $2, $3, $4)",
    [projectId ? parseInt(projectId) : null, desc, start.toISOString(), end.toISOString()]
  );
}

export async function deleteSession(db: Database, id: string) {
  const realId = id.replace('manual-', '');
  await db.execute("DELETE FROM work_sessions WHERE id = $1", [realId]);
}

// Die komplexe Lade-Logik
export async function loadAllEvents(db: Database, editMode: boolean): Promise<any[]> {
  const allEvents = [];
  const colorCache = new Map<string, string>();

  // 1. Farben cachen
  const colors = await db.select<ColorEntry[]>("SELECT * FROM app_colors");
  colors.forEach(c => colorCache.set(c.name, c.color));

  async function getColor(name: string) {
    if (colorCache.has(name)) return colorCache.get(name)!;
    const c = stringToColor(name);
    await db.execute("INSERT INTO app_colors (name, color) VALUES ($1, $2)", [name, c]);
    colorCache.set(name, c);
    return c;
  }

  // 2. Auto Logs
  const logs = await db.select<LogEntry[]>("SELECT * FROM logs ORDER BY created_at ASC LIMIT 3000");
  for (let i = 0; i < logs.length; i++) {
    const current = logs[i];
    const next = logs[i + 1];
    const start = new Date(current.created_at.replace(" ", "T") + "Z");
    start.setSeconds(0, 0);
    let end = next ? new Date(next.created_at.replace(" ", "T") + "Z") : new Date(start.getTime() + 60000);
    end.setSeconds(0, 0);
    if (start.getTime() === end.getTime()) end = new Date(start.getTime() + 60000);

    const simpleName = simplifyAppName(current.title);
    const color = await getColor(simpleName);

    allEvents.push({
      id: 'auto-' + current.id,
      title: current.title,
      start: start,
      end: end,
      display: 'block', // Wir steuern das Aussehen via CSS/Renderer
      backgroundColor: color,
      extendedProps: {
        type: 'auto',
        fullTitle: current.title,
        appColor: color,
        simpleName: simpleName,
        isEditMode: editMode
      }
    });
  }

  // 3. Manuelle Sessions
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
        projectId: session.project_id,
        projectName: name,
        projectColor: color,
        description: session.description
      }
    });
  }

  return allEvents;
}
