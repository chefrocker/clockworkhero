# ClockworkHero – Roadmap & Entwicklungsplan

> Stand: April 2026 | Version 1.0.0  
> Ziel: Eine stabile, zuverlässige Zeiterfassungsapp, die genau das macht was der Nutzer will.

---

## Vision

ClockworkHero soll der tägliche Begleiter für selbstständige Entwickler, Designer und Wissensarbeiter sein:  
**Alles wird automatisch getrackt. Manuell wird nur bewertet.**  
Am Ende des Tages sieht man auf einen Blick was man wann gemacht hat – und kann es sauber den Projekten zuordnen.

---

## Aktueller Stand (v1.0.0)

### Was funktioniert zuverlässig

| Bereich | Status |
|---|---|
| Automatisches App-Tracking | ✅ |
| Manuelle Session-Buchung | ✅ |
| Kalenderansicht (Tag/Woche) | ✅ |
| Dashboard / Analytics | ✅ |
| Dark Mode | ✅ |
| Icon-Rendering (overflow:visible überall) | ✅ |
| Export (Excel) | ✅ |
| Einstellungen (Projekte, Zeiten, Wochentag) | ✅ |
| Keyboard Shortcuts | ✅ |
| Auto-Update via GitHub Releases | ✅ |
| Toast-Benachrichtigungen (kein alert/confirm mehr) | ✅ |
| DB-Performance-Indexes | ✅ |
| Date-Range-Filter in loadAllEvents | ✅ |
| App-Architektur (4 Hooks, ~200 Zeilen App.tsx) | ✅ |
| Projekt-Icon bei Erstellung setzen | ✅ |
| firstDayOfWeek konfigurierbar | ✅ |
| Timer-ProjectId DB-Validierung beim Start | ✅ |
| ErrorBoundary in main.tsx | ✅ |

### Bekannte Lücken

- Keine automatisierten Tests (Unit- oder Integrationstests)
- Nur Deutsch (keine i18n)
- Kein PDF-Export
- Kein Drag & Drop Activity → Projekt
- Kein Autostart-Management in der UI

---

## Phase 2 – Kernfunktionen verbessern (Mittelfristig, 1–3 Monate)

**Ziel:** Die wichtigsten Alltagsabläufe deutlich komfortabler machen.

### Kalender & Zeiterfassung

- [ ] **Drag & Drop Activity → Projekt**  
  App-Icon direkt auf einen Projektnamen ziehen → Session-Modal öffnet sich mit vorausgefüllter Zeit  
  *Nutzen: Enorm. Erspart täglich 10–20 Klicks.*

- [ ] **Session-Templates**  
  Häufige Tätigkeiten (z.B. "Daily Standup 15 Min") speichern und per Klick einfügen

- [ ] **Pausen automatisch erkennen**  
  Wenn >X Minuten keine Aktivität: Pause-Block anzeigen. Beim Zurückkommen fragen was war.

- [ ] **"+X mehr"-Badge**  
  Wenn an einem Tag >20 Apps aktiv waren, werden zu viele Icons gerendert. Badge statt endloser Liste.

### Analytics Dashboard

- [ ] **App-Kategorisierung**  
  Apps in "Entwicklung", "Kommunikation", "Browser" etc. einteilen  
  Dashboard zeigt Zeitanteile pro Kategorie

- [ ] **Wochenbericht PDF**  
  Automatisch generierter Bericht: Stunden pro Projekt, Vergleich mit Ziel, Export als PDF

- [ ] **Trend-Analyse**  
  Wöchentliche Stunden als Liniendiagramm über mehrere Monate

### UX

- [ ] **Command Palette (Ctrl+K)**  
  Schneller Zugang zu allen Funktionen ohne Maus

- [ ] **Onboarding-Flow**  
  3-Schritt-Tour beim Erststart

---

## Phase 3 – Produktivitäts-Features (Langfristig, 3–6 Monate)

- [ ] **Pomodoro-Modus** – Integrierter Timer 25/5 Min, auto-Buchung auf Projekt
- [ ] **Idle-Detection verbessern** – Bildschirmsperre/Inaktivität erkennen, bei Rückkehr fragen
- [ ] **Tagesabschluss-Notification** – "Du hast heute 7h 20min gearbeitet. Ziel: 8h."
- [ ] **Wochenplanung / Time-Blocking** – Zukünftige Blöcke planen, am Wochenende vergleichen
- [ ] **GitHub-Heatmap** – Jahresübersicht der Arbeitstage

---

## Phase 4 – Plattform & Distribution (Langfristig)

- [ ] **Mehrsprachigkeit (i18n)** – Englisch als zweite Sprache (aktuell nur Deutsch)
- [ ] **Projekt-Budgets** – Stunden-Kontingent pro Projekt, Benachrichtigung bei 80%
- [ ] **Cloud-Sync** – Optional: SQLite in iCloud/Dropbox synchronisieren
- [ ] **Jira / Linear Integration** – Direkt auf Tickets buchen
- [ ] **Daten-Aufbewahrung** – Alte Logs nach X Tagen auto-löschen (Einstellung)

---

## Technische Schulden (parallel abbauen)

- [ ] **Unit-Tests** für `processEventsForOverlaps`, `analyticsService`, `db.ts`
- [ ] **Integrationstests** für kritische Abläufe (Timer-Stop → Session-Erstellung)
- [ ] **DB-Migrations-System** für Schema-Änderungen bei künftigen Updates (aktuell: CREATE IF NOT EXISTS)
- [ ] **Autostart konfigurierbar** – In der UI steuerbar statt nur über Systemeinstellungen

---

## Changelog

| Version | Datum | Änderungen |
|---|---|---|
| 1.0.0 | April 2026 | App.tsx → 4 Hooks, Auto-Update, Keyboard Shortcuts, firstDayOfWeek, Toast-System, DB-Indexes, Date-Range-Filter, 2-Klick-Confirm, Icon bei Projekt-Erstellung, ErrorBoundary, Projekt-Icon-Fix |
| 0.9.9 | April 2026 | Erster Wochentag konfigurierbar |
| 0.9.8 | April 2026 | Auto-Update-Button, Programm-Beenden, Node.js 24 Fix |
| 0.9.7 | April 2026 | Robustheit, Performance, Refactoring |
| 0.9.6 | April 2026 | Toast-System, Session-Validierung, Icon-Fix, DB-Fehlerbehandlung |
| 0.9.5-beta | April 2026 | Overlay-Architektur, Z-Index-System, Scroll-Fixes, Docs |
