# ClockworkHero – Architektur & Projektübersicht

> Version: 0.9.5-beta  
> Stand: April 2026  
> Plattform: Desktop (Windows/macOS/Linux) via Tauri 2

---

## 1. Was ist ClockworkHero?

ClockworkHero ist eine **Desktop-Zeiterfassungsanwendung**, die zwei Hauptaufgaben vereint:

1. **Automatisches Activity-Tracking** – Das Programm überwacht im Hintergrund, welche Fenster/Anwendungen aktiv sind, und protokolliert diese automatisch in einer lokalen SQLite-Datenbank.
2. **Manuelle Zeitbuchung** – Benutzer können Projekte anlegen und manuell Arbeitssessions (mit Start/End-Zeit) auf diese buchen.

Beide Datenquellen werden in einer **Kalenderansicht** (Tag / Woche) überlagert dargestellt sowie in einem **Analytics-Dashboard** ausgewertet.

---

## 2. Technologie-Stack

| Schicht | Technologie | Version |
|---|---|---|
| UI-Framework | React | 19.1.0 |
| Sprache | TypeScript | 5.8.3 |
| Build-Tool | Vite | 7.0.4 |
| Desktop-Shell | Tauri | 2.x |
| Kalender | FullCalendar (TimeGrid) | 6.1.19 |
| Charts | Recharts | 3.5.1 |
| Datenbank | SQLite via @tauri-apps/plugin-sql | – |
| Icons | react-icons | 5.5.0 |
| Bildbearbeitung | react-easy-crop | 5.5.6 |
| Export | xlsx | – |
| Styling | Reines CSS mit CSS-Variablen | – |

**Kein** globaler State-Manager (kein Redux, Zustand, etc.) – ausschließlich React-Hooks (`useState`, `useEffect`, `useMemo`, `useRef`).

---

## 3. Ordnerstruktur

```
ClockworkHero/
├── src/
│   ├── App.tsx                  # Root-Komponente, zentrales State-Management
│   ├── App.css                  # Globale Styles, CSS-Variablen, FullCalendar-Overrides
│   ├── main.tsx                 # React-Einstiegspunkt
│   ├── types.ts                 # TypeScript-Interfaces (LogEntry, Project, WorkSession…)
│   ├── components/
│   │   ├── CalendarEngine.tsx   # FullCalendar-Wrapper, Zoom, Scroll, Overlap-Ranking
│   │   ├── EventRenderer.tsx    # Rendert Events (manuell & automatisch) mit Positionslogik
│   │   ├── Dashboard.tsx        # Analyse-Ansicht mit Charts
│   │   ├── SessionModal.tsx     # Modal: Manuelle Session anlegen/bearbeiten
│   │   ├── ActivityDetailModal.tsx # Modal: Detail-Ansicht einer getracken App
│   │   ├── SettingsModal.tsx    # Modal: Einstellungen, Projekte, Arbeitszeiten
│   │   ├── WorkScheduleEditor.tsx  # Sub-Komponente: Wochenplan-Editor
│   │   └── AppIcon.tsx          # Renders App-Icons (Bild oder Fallback-Farbe)
│   ├── services/
│   │   ├── db.ts                # Alle SQLite-Operationen, DB-Initialisierung
│   │   ├── analyticsService.ts  # Aggregation von Dashboard-Daten
│   │   └── exportService.ts     # Excel-Export
│   └── utils/
│       └── imageUtils.ts        # hexToRgba, Bild-Crop-Utilities
├── src-tauri/                   # Rust-Backend (Tauri)
│   └── …
├── docs/                        # Diese Dokumentation
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 4. Komponentenbaum

```
App.tsx  (Root-State)
├── Header  (Navigation, Timer-Steuerung)
├── CalendarEngine  (FullCalendar-Wrapper)
│   └── EventRenderer  (pro Event: manuell oder automatisch)
│       └── AppIcon
├── Dashboard  (Charts & Statistiken)
├── SessionModal  (Overlay)
├── ActivityDetailModal  (Overlay)
└── SettingsModal  (Overlay)
    ├── GeneralTab
    ├── ProjectsTab
    └── WorkScheduleEditor
```

---

## 5. Datenbankschema (SQLite)

```sql
-- Automatisch getracktes Fenster/App-Ereignis
CREATE TABLE logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT,      -- Fenstertitel
  exe_path   TEXT,      -- Pfad zur .exe / App
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Farb- und Icon-Einstellungen pro App
CREATE TABLE app_colors (
  name  TEXT PRIMARY KEY,
  color TEXT,
  icon  TEXT
);

-- Manuell angelegte Projekte
CREATE TABLE projects (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT,
  color     TEXT,
  icon      TEXT,
  icon_type TEXT   -- 'emoji' | 'image' | 'letter'
);

-- Manuelle Arbeitssessions
CREATE TABLE work_sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  INTEGER REFERENCES projects(id),
  description TEXT,
  start_time  DATETIME,
  end_time    DATETIME
);

-- Key-Value Einstellungen
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
```

---

## 6. Datenfluss – Von der Aktivität zur Kalenderanzeige

```
[Rust-Backend: Active Window Tracker]
        │  Tauri-Event: 'active-window-change'
        ▼
[App.tsx: listen('active-window-change')]
        │  logActiveWindow(db, title, path)
        ▼
[db.ts: INSERT INTO logs]
        │
        ▼
[App.tsx: refreshData() → loadAllEvents()]
        │  Gruppiert Logs in Slots (groupingThreshold, z.B. 10 Min)
        ▼
[CalendarEngine.tsx: processEventsForOverlaps()]
        │  Weist jedem auto-Event einen slotRank zu
        ▼
[FullCalendar: eventContent Callback]
        │
        ▼
[EventRenderer.tsx: renderEventContent()]
        │  Berechnet absolute Position per slotRank & colWidth
        ▼
[Browser-DOM: Positioniertes Icon / Karte]
```

---

## 7. Zwei Modi

Die App hat zwei Hauptmodi, gesteuert über `isEditMode` in `App.tsx`:

| Eigenschaft | Arbeitstask-Modus (`isEditMode = true`) | Activity-Modus (`isEditMode = false`) |
|---|---|---|
| **Fokus** | Manuelle Zeitbuchungen | Automatisch getrackte Apps |
| **Manuelle Sessions** | 50% Breite, volle Deckkraft, links | 20% Breite, 40% Deckkraft, links |
| **Activity-Cards** | Nur Icons, 30% Deckkraft, rechts gestapelt | Große Karten mit Name, volle Deckkraft |
| **Kalenderansicht** | Tag & Woche | Tag & Woche |

---

## 8. Timer-Funktion

- Separater Timer (Start/Stop) im Header
- State in `localStorage` gespeichert (überlebt App-Neustart)
- Bei Stop: Automatische Session-Erstellung im ausgewählten Projekt
- Anzeige: `HH:MM:SS` im Header

---

## 9. Einstellungen & Konfiguration

| Einstellung | Beschreibung |
|---|---|
| `workStart` / `workEnd` | Tägliche Kernarbeitszeit (für Business-Hours-Hervorhebung) |
| `groupingThreshold` | Minuten-Schwelle, ab der Aktivitäten zusammengefasst werden (5–30 Min) |
| `dailyTarget` | Tägliches Stunden-Ziel (für Dashboard) |
| `theme` | `light` / `dark` |
| `darkMode` | Boolean (Legacy-Kompatibilität) |
| `weekSchedule` | Array von `DaySchedule` – individueller Wochenplan |
| `hiddenDays` | Array von FullCalendar-Wochentag-Indizes (z.B. `[0, 6]` = Sa/So) |

---

## 10. Export

- **Excel-Export** über `exportService.ts` mit der `xlsx`-Bibliothek
- Exportierbare Daten: Work-Sessions (pro Projekt, mit Datum/Zeit/Beschreibung)
- Dashboard-Daten können ebenfalls exportiert werden
