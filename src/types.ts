export interface LogEntry {
    id: number;
    title: string;
    exe_path: string;
    created_at: string;
}

export interface Project {
    id: number;
    name: string;
    color: string;
    icon?: string;
    iconType?: 'app' | 'image';
}

export interface ColorEntry {
    name: string;
    color: string;
}

export interface WorkSession {
    id: number;
    project_id: number;
    description: string;
    start_time: string;
    end_time: string;
}

// NEU: Zeitblock für Arbeitszeiten
export interface WorkTimeBlock {
  id: string;
  start: string;  // z.B. "08:00"
  end: string;    // z.B. "12:00"
}

// NEU: Arbeitszeiten pro Wochentag
export interface DaySchedule {
  dayName: string;        // "Montag", "Dienstag", etc.
  dayShort: string;       // "Mo", "Di", etc.
  isWorkday: boolean;     // Ist ein Arbeitstag?
  blocks: WorkTimeBlock[];
  totalHours: number;     // Wird berechnet
}

export interface AppSettings {
    workStart: string; // Legacy, wird aber noch gebraucht bis Migration durch ist
    workEnd: string;   // Legacy
    
    // NEU: Wochenplan
    weekSchedule?: DaySchedule[];

    dailyTarget?: number;
    theme: string;
    groupingThreshold: number;
    adminPassword?: string;
}

export interface ActivitySubEvent {
    time: string;
    title: string;
}
