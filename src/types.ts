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
    // WICHTIG: Exakte Typisierung für TypeScript
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

export interface WorkTimeBlock {
  id: string;
  start: string;
  end: string;
}

export interface DaySchedule {
  dayName: string;
  dayShort: string;
  isWorkday: boolean;
  blocks: WorkTimeBlock[];
  totalHours: number;
}

export interface AppSettings {
    workStart: string;
    workEnd: string;
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
