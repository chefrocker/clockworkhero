# ClockworkHero – Dokumentation

> Stand: April 2026 | Version 1.0.0

---

## Inhalt

| Dokument | Beschreibung |
|---|---|
| [01_architektur.md](01_architektur.md) | Projektübersicht, Technologie-Stack, Hooks, Komponentenbaum, Datenbankschema, Datenfluss |
| [03_feature_ideen.md](03_feature_ideen.md) | Umfangreicher Ideenkatalog für neue Features – kategorisiert nach Aufwand und Nutzen |
| [04_roadmap.md](04_roadmap.md) | Entwicklungsplan: Was ist fertig, was kommt als nächstes, Changelog |
| [05_auto_update_einrichten.md](05_auto_update_einrichten.md) | Auto-Update via GitHub Releases einrichten, Release-Prozess, Node.js 24 Fix |
| [ClockworkHero_SDD_v1.0.md](ClockworkHero_SDD_v1.0.md) | Software Design Document (ursprüngliche Spezifikation) |

---

## Kurzübersicht

**ClockworkHero** ist eine Desktop-Zeiterfassungsapp (Tauri 2 + React + TypeScript), die:
- **Automatisch** aktive Anwendungen/Fenster trackt
- **Manuelle** Projektbuchungen mit Timer und Session-Modal erlaubt
- Beides in einer **Kalenderansicht** (Tag/Woche) überlagert
- Ein **Analytics-Dashboard** mit Charts und Excel-Export bietet
- **Auto-Updates** via GitHub Releases ausliefert
- **Keyboard Shortcuts** für effiziente Navigation bietet

### Architektur auf einen Blick

- `App.tsx` (~200 Zeilen) verdrahtet nur noch 4 Hooks und JSX
- `src/hooks/`: `useAppInit`, `useTimer`, `useCalendarData`, `useKeyboardShortcuts`
- `src/components/`: CalendarEngine, Toast, UpdateChecker, ErrorBoundary und weitere
- `src/services/`: db.ts (mit Performance-Indexes), analyticsService, exportService
- Kein globaler State-Manager – nur React-Hooks

### Top-Prioritäten für v1.1.0

1. **Drag & Drop Activity → Projekt** (größter Alltagsnutzen)
2. **Unit-Tests** für kritische Services
3. **PDF-Export** Wochenbericht
4. **App-Kategorisierung** für bessere Analytics
