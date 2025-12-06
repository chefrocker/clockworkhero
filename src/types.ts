export interface LogEntry {
  id: number;
  title: string;
  exe_path?: string; // Optional, falls noch alte Daten ohne Pfad da sind
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  color: string;
}

export interface ColorEntry {
  name: string;
  color: string;
}

export interface WorkSession {
  id: number;
  project_id: number | null;
  description: string;
  start_time: string;
  end_time: string;
}

// Für die Detail-Liste im Modal
export interface ActivitySubEvent {
  time: string;
  title: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  display?: string;
  backgroundColor?: string;
  extendedProps: {
    type: 'auto' | 'manual';
    order: number;
    
    // Für Auto-Events (Gruppiert)
    fullTitle?: string;
    exePath?: string;
    appColor?: string;
    simpleName?: string;
    subEvents?: ActivitySubEvent[]; // Die Liste der Details
    
    // Für Manual-Events
    dbId?: number;
    projectId?: number | null;
    projectName?: string;
    projectColor?: string;
    description?: string;
    
    isEditMode?: boolean;
  };
}
