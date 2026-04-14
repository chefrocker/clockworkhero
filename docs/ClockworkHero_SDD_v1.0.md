# Software Design Document (SDD) - ClockworkHero v1.0

## 1. Systemübersicht

### Zweck des Programms
ClockworkHero ist eine Productivity-Tracking-Anwendung, die automatische Zeiterfassung (Tracking) mit manueller Projektplanung verbindet. Das Ziel ist es, dem Nutzer volle Transparenz über seine Zeitnutzung am Computer zu geben und gleichzeitig eine einfache Möglichkeit zu bieten, diese Zeit Projekten zuzuordnen.

### Zielgruppe
- Freelancer und Selbstständige, die ihre Arbeitszeiten für Kunden dokumentieren müssen.
- Wissensarbeiter, die ihre eigene Produktivität analysieren und optimieren möchten.
- Softwareentwickler, die ein leichtgewichtiges, lokales Tool zur Zeiterfassung bevorzugen.

---

## 2. Funktionale Komponenten

### 2.1 Tracking-Service (Backend/Frontend-Bridge)
- **Input**: System-Events (aktives Fenster, Prozessname) via Tauri-Backend.
- **Logik**: Ein Rust-Listener überwacht den Fokuswechsel des Betriebssystems. Bei Änderung wird ein Event (`active-window-change`) an das Frontend gesendet.
- **Output**: Datenbank-Einträge in der Tabelle `logs`.

### 2.2 Kalender-Engine (Frontend)
- **Modul**: `CalendarEngine.tsx` (basierend auf FullCalendar).
- **Views**:
  - **Tagesansicht**: Detaillierte Darstellung der Aktivitäten eines Tages.
  - **Wochenansicht**: Überblick über die gesamte Woche.
- **Modi**:
  - **Activity-Modus**: Fokus auf die Anzeige getrackter Apps.
  - **Eingabe-Modus**: Icons werden geschrumpft, um Platz für das "Zeichnen" von manuellen Buchungen zu schaffen.
- **Verarbeitung**: Rohdaten werden gruppiert (z.B. alle Logs innerhalb von 5-10 Minuten) und als "Slots" an den Renderer übergeben.

### 2.3 Event-Renderer (Visualisierungs-Logik)
- **Modul**: `EventRenderer.tsx`.
- **90/10-Regel**: Jede Kalenderspalte wird horizontal unterteilt.
  - **Linke 10%**: Reservierter Bereich für manuelle "Arbeitstasks".
  - **Rechte 90%**: Dynamisches Grid für getrackte Apps.
- **Algorithmus**:
  - Apps werden nach Häufigkeit/Rang sortiert (`slotRank`).
  - Im Grid werden Icons oder Karten von rechts nach links aufgefüllt.
  - Automatische Zeilenumbrüche verhindern Überlappungen.

### 2.4 Dashboard (Analytics)
- **Modul**: `Dashboard.tsx` & `analyticsService.ts`.
- **Metriken**: Gesamtstunden, Projektverteilung (Pie-Chart), zeitlicher Verlauf (Area-Chart), Aktivitäts-Peaks.
- **Logik**: Aggregation der `logs` und `work_sessions` über SQL-Queries.

---

## 3. Datenlogik & Architektur

### 3.1 Datenbank-Schema (SQLite)
Die Datenhaltung erfolgt lokal in einer SQLite-Datenbank (`tracker.db`):
- `logs`: Speichert jeden Fensterwechsel (`title`, `exe_path`, `created_at`).
- `projects`: Definiert Projekte (`name`, `color`, `icon`).
- `work_sessions`: Manuell erfasste Zeiträume (`project_id`, `start_time`, `end_time`).
- `app_colors`: Customizing von App-Namen zu Farben/Icons.
- `settings`: Key-Value Paare für globale Konfigurationen.

### 3.2 Interaktionsfluss
1. **Erfassung**: Rust Backend erkennt Fokuswechsel -> Sendet Payload an React App.
2. **Speicherung**: React App ruft `logActiveWindow` via SQL-Plugin auf.
3. **Anzeige**: `CalendarEngine` lädt Daten mit einstellbarem Schwellenwert (`groupingThreshold`), berechnet Überlappungen und lässt sie durch den `EventRenderer` zeichnen.

---

## 4. Visualisierung & UI/UX

### 4.1 Layout & Farben
- **Design-System**: Modernes Dark/Light-Mode Design basierend auf Slate (Slate-50 bis Slate-900).
- **Akzentfarben**: Primärblau (#3b82f6) für Systemelemente, Projektfarben sind nutzerdefiniert.
- **Glassmorphism**: Subtile Transparenzen und Unschärfe-Effekte bei Modals.

### 4.2 Screens & Interaktionen
- **Header**: Permanente Statusanzeige (Tracking aktiv/inaktiv), Schnell-Timer für Projektbuchungen.
- **Kalender**:
  - **Klick**: Öffnet Detailansicht oder Edit-Modal.
  - **Drag & Drop**: Erlaubt das Verschieben von Sessions (direktes DB-Update).
  - **Resize**: Ändert die Dauer einer manuellen Session.
- **Responsive Messung**: Ein `ResizeObserver` misst permanent die Spaltenbreiten, um das 90/10-Layout flüssig anzupassen.

---

## 5. Technische Randbedingungen

### Tech-Stack
- **Framework**: Tauri (für native Performance und Sicherheit).
- **Frontend**: React 18 mit TypeScript & Vite.
- **Kalender**: FullCalendar (leistungsstarke Grid-Darstellung).
- **Charts**: Recharts (SVG-basierte Visualisierung).
- **Datenbank**: SQLite (via `@tauri-apps/plugin-sql`).
- **Icons**: React-Icons (Font-Awesome & Simple-Icons).

### Begründung der Wahl
- **Tauri** wurde gewählt, weil es deutlich speichereffizienter als Electron ist und direkten Zugriff auf System-APIs (Fenstertracking) ermöglicht.
- **SQLite** garantiert, dass alle Daten lokal beim Nutzer bleiben (Datenschutz/Privacy-by-Design).
- **React** ermöglicht eine hochdynamische UI für die Echtzeit-Positionierung im Kalender.

---

## 6. Detaillierte Layout- & Rendering-Logik

### 6.1 Die 50/10-Priorisierungs-Regel
Um eine klare Trennung und visuelle Priorisierung zwischen automatischer Erfassung und manueller Planung zu ermöglichen, passt das System die Spaltenaufteilung dynamisch an den gewählten Modus an:

- **Im Modus "ActivityCards" (Analyse-Fokus)**: 
  - Der Fokus liegt auf den automatisch getrackten Apps (ActivityStream).
  - Arbeitstasks werden auf eine Breite von **10%** der Spalte reduziert und **transparent** (ca. 0.4 Opacity) dargestellt.
  - Die ActivityCards nutzen die restlichen 90% der Breite in voller Deckkraft.

- **Im Modus "Arbeitstasks" (Planungs-Fokus)**: 
  - Der Fokus liegt auf der manuellen Projektarbeit. 
  - Arbeitstasks werden prominent mit **50% der Spaltenbreite** und voller Deckkraft angezeigt.
  - ActivityCards rücken in den Hintergrund, werden stark **transparent** (ca. 0.3 Opacity) und zeigen **keinen Text** mehr (nur Icons). Sie können von den breiteren Arbeitstasks überdeckt werden.

### 6.2 Grid-Logik & 5-Minuten-Aggregation
Das System sorgt für ein ruhiges und geordnetes Kalenderbild durch strikte mathematische Ausrichtung:

1. **5-Minuten-Aggregation**: Alle automatisch getrackten Logs werden im `loadAllEvents`-Service auf das nächste 5-Minuten-Intervall gruppiert. Start- und Endzeiten im Kalender sind somit immer Vielfache von 5 Minuten (z. B. 08:00, 08:05, 08:10). Dies verhindert "zerfledderte" Anzeigen bei kurzen App-Wechseln.
2. **Horizontaler Fluss & Grid**: Innerhalb eines Zeit-Slots werden ActivityCards von **rechts nach links** aufgefüllt.
3. **Kollisionsschutz**: Jede Karte erhält einen festen Platz im Grid (basierend auf `slotRank`). Überlappungen innerhalb der ActivityCards sind durch die dynamische Berechnung der Spaltenkapazität (`maxCols`) ausgeschlossen.
4. **Optimierte Icons**: Die minimale Symbolgröße beträgt **32px**, um eine hohe Erkennbarkeit auch bei vielen gleichzeitig aktiven Apps zu gewährleisten.

### 6.3 Interaktion & Klickverhalten
Das System bleibt in jedem Modus voll interaktiv:
- **Arbeitstasks**: Ein Klick auf einen Task öffnet in jedem Modus das Fenster zum Editieren oder Löschen. Hier werden die aktuell hinterlegten Projektdaten und Beschreibungen angezeigt.
- **Neuanlage**: Das Erstellen neuer Arbeitstasks durch Klicken und Ziehen ist in beiden Modi permanent möglich.
