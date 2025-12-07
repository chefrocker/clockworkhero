export interface LogEntry {
  id: number;
  title: string;
  exe_path?: string;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  color: string;
  icon?: string; // NEU: Kann ein App-Name ("Code") oder Base64-Bild sein
  iconType?: 'app' | 'image'; // NEU: Zur Unterscheidung
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

export interface ActivitySubEvent {
  time: string;
  title: string;
}

export interface AppSettings {
  workStart: string;      // "08:00"
  workEnd: string;        // "17:00"
  dailyTarget: number;    // NEU: Stunden pro Tag (z.B. 8)
  theme: string;          // "light"
  groupingThreshold: number; 
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
    
    // Auto
    fullTitle?: string;
    exePath?: string;
    appColor?: string;
    simpleName?: string;
    subEvents?: ActivitySubEvent[];
    
    // Manual
    dbId?: number;
    projectId?: number | null;
    projectName?: string;
    projectColor?: string;
    projectIcon?: string; // NEU
    projectIconType?: 'app' | 'image'; // NEU
    description?: string;
    
    isEditMode?: boolean;
  };
}
