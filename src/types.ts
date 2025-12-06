export interface LogEntry {
  id: number;
  title: string;
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

// Das Format, das der Kalender versteht
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  display?: string;
  backgroundColor?: string;
  extendedProps: {
    type: 'auto' | 'manual'; // Layer Unterscheidung
    fullTitle?: string;
    appColor?: string;
    simpleName?: string;
    projectId?: number | null;
    projectName?: string;
    projectColor?: string;
    description?: string;
    isEditMode?: boolean; // Wird durchgereicht für Styling
  };
}
