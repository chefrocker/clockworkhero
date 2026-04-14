# ClockworkHero – Architektur & Projektübersicht

> Version: 1.0.0  
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
| Auto-Update | tauri-plugin-updater | – |
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
│   ├── App.tsx                  # Root-Komponente (~200 Zeilen), verdrahtet nur noch Hooks & JSX
│   ├── App.css                  # Globale Styles, CSS-Variablen, FullCalendar-Overrides
│   ├── main.tsx                 # React-Einstiegspunkt mit ErrorBoundary
│   ├── types.ts                 # TypeScript-Interfaces (LogEntry, Project, WorkSession…)
│   ├── hooks/
│   │   ├── useAppInit.ts        # DB-Init, Einstellungen laden, Tauri-Events registrieren
│   │   ├── useTimer.ts          # Timer-State, Start/Stop, localStorage-Persistenz
│   │   ├── useCalendarData.ts   # loadAllEvents mit Date-Range-Filter, refreshData
│   │   └── useKeyboardShortcuts.ts  # ←→ Navigation, H, D/W/A, N, M, Ctrl+,
│   ├── components/
│   │   ├── CalendarEngine.tsx   # FullCalendar-Wrapper, Zoom, Scroll, Overlap-Ranking, onRangeChange
│   │   ├── EventRenderer.tsx    # Rendert Events (manuell & automatisch) mit Positionslogik
│   │   ├── Dashboard.tsx        # Analyse-Ansicht mit Charts
│   │   ├── SessionModal.tsx     # Modal: Manuelle Session anlegen/bearbeiten
│   │   ├── ActivityDetailModal.tsx  # Modal: Detail-Ansicht einer getracken App
│   │   ├── SettingsModal.tsx    # Modal: Einstellungen, Projekte, Arbeitszeiten
│   │   ├── UpdateChecker.tsx    # Prüft GitHub Releases auf neue Version
│   │   ├── ErrorBoundary.tsx    # React Error Boundary (in main.tsx eingebunden)
│   │   ├── Toast.tsx            # Toast-Benachrichtigungen (ersetzt alert/confirm)
│   │   ├── AppIcon.tsx          # Renders App-Icons (Bild oder Fallback-Farbe)
│   │   ├── ActivityOverlay.tsx  # Overlay-Schicht für automatisch getrackte Events
│   │   └── settings/
│   │       ├── GeneralTab.tsx   # Einstellungen: Allgemein (Theme, Zeiten, Wochentag)
│   │       └── ProjectsTab.tsx  # Einstellungen: Projekte verwalten
│   ├── services/
│   │   ├── db.ts                # Alle SQLite-Operationen, DB-Initialisierung, Performance-Indexes
│   │   ├── analyticsService.ts  # Aggregation von Dashboard-Daten
│   │   └── exportService.ts     # Excel-Export
│   └── utils/
│       └── imageUtils.ts        # hexToRgba, Bild-Crop-Utilities
├── src-tauri/                   # Rust-Backend (Tauri 2)
│   ├── src/main.rs              # Tray-Support, Window-Tracking, Update-Kommandos
│   └── tauri.conf.json          # App-Konfiguration, Update-Endpunkt, Public Key
├── .github/workflows/
│   └── release.yml              # CI/CD: baut & signiert bei git tag v*
├── docs/                        # Diese Dokumentation
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 4. Komponentenbaum

```
main.tsx
└── ErrorBoundary
    └── App.tsx  (verdrahtet Hooks, minimales JSX)
        ├── useAppInit        (Hook: DB, Einstellungen, Tauri-Events)
        ├── useTimer          (Hook: Timer-State)
        ├── useCalendarData   (Hook: Events laden, Datumsbereich)
        ├── useKeyboardShortcuts  (Hook: globale Tastenkürzel)
        │
        ├── Toast             (globales Benachrichtigungssystem)
        ├── Header            (Navigation, Timer-Steuerung, Modus-Wechsel)
        ├── CalendarEngine    (FullCalendar-Wrapper)
        │   └── EventRenderer (pro Event: manuell oder automatisch)
        │       └── AppIcon
        ├── ActivityOverlay   (automatisch getrackte Events als Overlay)
        ├── Dashboard         (Charts & Statistiken)
        ├── SessionModal      (Overlay)
        ├── ActivityDetailModal  (Overlay)
        ├── UpdateChecker     (Auto-Update-Prüfung)
        └── SettingsModal     (Overlay)
            ├── GeneralTab
            └── ProjectsTab
```

---

## 5. Hooks (src/hooks/)

### useAppInit
- Initialisiert die SQLite-Datenbank (Schema, Migrations, Performance-Indexes)
- Lädt alle Einstellungen aus der DB
- Registriert den Tauri-Event-Listener `active-window-change`
- Validiert beim Start die gespeicherte Timer-`projectId` gegen die DB

### useTimer
- Verwaltet Timer-State (laufend, Startzeit, Projekt-ID)
- Persistiert in `localStorage` (überlebt App-Neustart)
- Erstellt bei Stop automatisch eine `work_session`

### useCalendarData
- Lädt Events (`loadAllEvents`) nur für den sichtbaren Datumsbereich (kein Full-Table-Scan mehr)
- Stellt `refreshData(dateRange)` bereit
- `CalendarEngine` ruft `onRangeChange` auf, wenn der Nutzer navigiert

### useKeyboardShortcuts
| Kürzel | Aktion |
|---|---|
| `←` / `→` | Vorherige / nächste Periode |
| `H` | Heute |
| `D` | Tagesansicht |
| `W` | Wochenansicht |
| `A` | Monatsansicht (Agenda) |
| `N` | Neue Session |
| `M` | Modus wechseln (Arbeitszeit / Aktivität) |
| `Ctrl+,` | Einstellungen öffnen |

---

## 6. Datenbankschema (SQLite)

```sql
-- Automatisch getracktes Fenster/App-Ereignis
CREATE TABLE logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT,
  exe_path   TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_logs_created_at ON logs(created_at);  -- Performance

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
CREATE INDEX idx_ws_start ON work_sessions(start_time);
CREATE INDEX idx_ws_end   ON work_sessions(end_time);

-- Key-Value Einstellungen
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
```

---

## 7. Datenfluss – Von der Aktivität zur Kalenderanzeige

```
[Rust-Backend: Active Window Tracker]
        │  Tauri-Event: 'active-window-change'
        ▼
[useAppInit: listen('active-window-change')]
        │  logActiveWindow(db, title, path)
        ▼
[db.ts: INSERT INTO logs]
        │
        ▼
[useCalendarData: refreshData(currentRange)]
        │  loadAllEvents(db, rangeStart, rangeEnd)  ← nur sichtbarer Bereich
        ▼
[CalendarEngine: processEventsForOverlaps()]
        │  Weist jedem auto-Event einen slotRank zu
        ▼
[FullCalendar: eventContent Callback]
        │
        ▼
[EventRenderer: renderEventContent()]
        │  Berechnet absolute Position per slotRank & colWidth
        ▼
[Browser-DOM: Positioniertes Icon / Karte]
```

---

## 8. Zwei Modi

Die App hat zwei Hauptmodi, gesteuert über `isEditMode` in `App.tsx`:

| Eigenschaft | Arbeitstask-Modus (`isEditMode = true`) | Activity-Modus (`isEditMode = false`) |
|---|---|---|
| **Fokus** | Manuelle Zeitbuchungen | Automatisch getrackte Apps |
| **Manuelle Sessions** | 50% Breite, volle Deckkraft, links | 20% Breite, 40% Deckkraft, links |
| **Activity-Cards** | Nur Icons, 30% Deckkraft, rechts gestapelt | Große Karten mit Name, volle Deckkraft |
| **Tastenkürzel** | `M` wechselt zwischen den Modi | |

---

## 9. Timer-Funktion

- Separater Timer (Start/Stop) im Header
- State in `localStorage` gespeichert (überlebt App-Neustart)
- `projectId` wird beim Start gegen die DB validiert – verhindert Buchungen auf gelöschte Projekte
- Bei Stop: Automatische Session-Erstellung im ausgewählten Projekt
- Anzeige: `HH:MM:SS` im Header

---

## 10. Einstellungen & Konfiguration

| Einstellung | Beschreibung |
|---|---|
| `workStart` / `workEnd` | Tägliche Kernarbeitszeit (für Business-Hours-Hervorhebung) |
| `groupingThreshold` | Minuten-Schwelle, ab der Aktivitäten zusammengefasst werden (5–30 Min) |
| `dailyTarget` | Tägliches Stunden-Ziel (für Dashboard) |
| `theme` | `light` / `dark` |
| `firstDayOfWeek` | Erster Wochentag: `0` = Sonntag, `1` = Montag, `6` = Samstag |
| `weekSchedule` | Array von `DaySchedule` – individueller Wochenplan |
| `hiddenDays` | Array von FullCalendar-Wochentag-Indizes (z.B. `[0, 6]` = Sa/So) |

### Settings > Über
- **"Nach Updates suchen"** – löst manuell eine Update-Prüfung gegen GitHub Releases aus
- **"Programm beenden"** – beendet die App sauber (nützlich wenn im Tray minimiert)

---

## 11. Toast-System

`src/components/Toast.tsx` ersetzt alle `alert()` und `window.confirm()` Aufrufe.

- Fehler aus der DB werden als Toast angezeigt statt still zu scheitern
- Alle destruktiven Aktionen (Session löschen, Projekt löschen) nutzen einen **2-Klick-Bestätigungsflow** im Modal statt `window.confirm()`
- Toast-Typen: `info`, `success`, `warning`, `error`

---

## 12. Auto-Update

- `tauri-plugin-updater` prüft beim Start gegen `https://github.com/chefrocker/clockworkhero/releases/latest`
- `UpdateChecker`-Komponente zeigt Toast wenn Update verfügbar
- Manuell auslösbar: Einstellungen → Über → "Nach Updates suchen"
- Release-Pipeline: `.github/workflows/release.yml` baut und signiert bei `git tag v*`

---

## 13. Export

- **Excel-Export** über `exportService.ts` mit der `xlsx`-Bibliothek
- Exportierbare Daten: Work-Sessions (pro Projekt, mit Datum/Zeit/Beschreibung)
- Dashboard-Daten können ebenfalls exportiert werden
