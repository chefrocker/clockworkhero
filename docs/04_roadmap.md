# ClockworkHero – Roadmap & Entwicklungsplan

> Stand: April 2026 | Version 0.9.5-beta  
> Ziel: Eine stabile, zuverlässige Zeiterfassungsapp, die genau das macht was der Nutzer will.

---

## Vision

ClockworkHero soll der tägliche Begleiter für selbstständige Entwickler, Designer und Wissensarbeiter sein:  
**Alles wird automatisch getrackt. Manuell wird nur bewertet.**  
Am Ende des Tages sieht man auf einen Blick was man wann gemacht hat – und kann es sauber den Projekten zuordnen.

---

## Aktueller Stand

| Bereich | Status | Bewertung |
|---|---|---|
| Automatisches App-Tracking | Funktioniert | ✅ |
| Manuelle Session-Buchung | Funktioniert | ✅ |
| Kalenderansicht (Tag/Woche) | Funktioniert, mit Bugs | ⚠️ |
| Dashboard / Analytics | Funktioniert | ✅ |
| Dark Mode | Funktioniert | ✅ |
| Icon-Rendering in Overlay | Gerade repariert | 🔧 |
| Scroll-Verhalten Kalender | Gerade repariert | 🔧 |
| Export (Excel) | Funktioniert | ✅ |
| Einstellungen (Projekte, Zeiten) | Funktioniert | ✅ |

---

## Phase 1 – Stabilitätsfundament (Jetzt / Kurzfristig)

**Ziel:** Alle bekannten Bugs beheben. Das Programm muss sich täglich zuverlässig verhalten.

### 1.1 – Bereits erledigt (diese Session)
- [x] **Scroll-Bug**: Kalender springt nicht mehr zum aktuellen Zeitpunkt zurück beim Navigieren (`scrollTimeReset: false`)
- [x] **Icon-Clipping**: App-Icons werden nicht mehr abgeschnitten (Scroll-Sync-Overlay statt FC-Portal)
- [x] **slotRank-Algorithmus**: Zeitraumbasierte Kollisionserkennung (keine falschen Überlagerungen mehr)
- [x] **Z-Index-System**: Klares Schichtsystem mit CSS-Variablen (`--z-auto-events: 100`, `--z-manual-events: 300`)
- [x] **Hover-Effekt**: `translateY` statt `scale` (kein Layout-Shift mehr)
- [x] **Dokumentation**: Architektur, Probleme, Features in `/docs`
- [x] **`.gitignore`**: Interne Dokumente nicht im Repo

### 1.2 – Noch offen

- [ ] **Testen im echten Betrieb**: Die Overlay-Änderungen im laufenden Programm validieren
- [ ] **Edge Case: Sehr viele Icons** – Wenn an einem Tag >20 Apps aktiv waren, werden sehr viele Icons gerendert. Hier brauchen wir ein "+X mehr"-Badge
- [ ] **Edge Case: Schmale Spalten** (Wochenansicht, viele Wochentage) – Icon-Layout bei <80px Spaltenbreite testen
- [ ] **Fehlerbehandlung**: Was passiert wenn die DB nicht erreichbar ist? Aktuell: leere Seite. Besser: freundliche Fehlermeldung
- [ ] **Autostart konfigurierbar**: Der Autostart-Pfad muss bei der installierten App passen, nicht bei der Dev-Version

---

## Phase 2 – Kernfunktionen verbessern (Mittelfristig, 1–3 Monate)

**Ziel:** Die wichtigsten Alltagsabläufe deutlich komfortabler machen.

### 2.1 – Kalender & Zeiterfassung

- [ ] **A1: Drag & Drop Activity → Projekt**  
  App-Icon direkt auf einen Projektnamen ziehen → Session-Modal öffnet sich mit vorausgefüllter Zeit  
  *Nutzen: Enorm. Erspart täglich 10–20 Klicks.*

- [ ] **A2: Session-Templates**  
  Häufige Tätigkeiten (z.B. "Daily Standup 15 Min") speichern und per Klick einfügen

- [ ] **A7: Pausen automatisch erkennen**  
  Wenn >X Minuten keine Aktivität: Pause-Block anzeigen. Beim Zurückkommen fragen was war.

- [ ] **A8: Zeitkorrektur-Vorschläge**  
  "Du warst 45 Min in VS Code ohne gebuchte Session – Projekt X zuweisen?"

### 2.2 – UX & Interface

- [ ] **C2: Keyboard Shortcuts**  
  `N` → Neue Session, `T` → Timer Start/Stop, `D/W` → Tag/Woche, `←/→` → Navigation, `Esc` → Schließen  
  *Nutzen: Hoch für Power-User. Aufwand: Niedrig.*

- [ ] **C1: Command Palette (Ctrl+K)**  
  Schneller Zugang zu allen Funktionen ohne Maus

- [ ] **C3: Onboarding-Flow**  
  3-Schritt-Tour beim Erststart

### 2.3 – Analytics Dashboard

- [ ] **B4: App-Kategorisierung**  
  Apps in "Entwicklung", "Kommunikation", "Browser" etc. einteilen  
  Dashboard zeigt Zeitanteile pro Kategorie

- [ ] **B1: Wochenbericht PDF**  
  Automatisch generierter Bericht: Stunden pro Projekt, Vergleich mit Ziel, Export

- [ ] **B2: Trend-Analyse**  
  Wöchentliche Stunden als Liniendiagramm über mehrere Monate

---

## Phase 3 – Produktivitäts-Features (Langfristig, 3–6 Monate)

**Ziel:** ClockworkHero wird nicht nur Zeiterfassung, sondern aktive Produktivitätshilfe.

- [ ] **E1: Pomodoro-Modus** – Integrierter Timer 25/5 Min, auto-Buchung auf Projekt
- [ ] **E5: Idle-Detection verbessern** – Bildschirmsperre/Inaktivität erkennen, bei Rückkehr fragen
- [ ] **E4: Tagesabschluss-Notification** – "Du hast heute 7h 20min gearbeitet. Ziel: 8h."
- [ ] **E6: Wochenplanung / Time-Blocking** – Zukünftige Blöcke planen, am Wochenende vergleichen
- [ ] **B6: GitHub-Heatmap** – Jahresübersicht der Arbeitstage
- [ ] **D1: Jira / Linear Integration** – Direkt auf Tickets buchen

---

## Phase 4 – Plattform & Distribution (Langfristig)

- [ ] **E2: Projekt-Budgets** – Stunden-Kontingent pro Projekt, Benachrichtigung bei 80%
- [ ] **D3: Cloud-Sync** – Optional: SQLite in iCloud/Dropbox synchronisieren
- [ ] **C4: System-Tray Widget** – Mini-UI direkt aus dem Tray
- [ ] **D5: Mehrsprachigkeit (i18n)** – Englisch als zweite Sprache
- [ ] **F1: DB-Paginierung** – Events nur für sichtbaren Zeitraum laden (wichtig nach 1+ Jahr Nutzung)

---

## Technische Schulden (parallel abbauen)

- [ ] **F3: Unit-Tests** für `processEventsForOverlaps`, `renderEventContent`, `analyticsService`
- [ ] **F4: React Error Boundary** um Kalender und Dashboard
- [ ] **F2: DB-Migrations-System** für Schema-Änderungen bei Updates
- [ ] **App.tsx aufteilen**: 440 Zeilen ist zu viel für eine Datei. Aufteilen in `useCalendar`, `useTimer`, `useSettings` Hooks
- [ ] **D6: Daten-Aufbewahrung** – Alte Logs nach X Tagen auto-löschen (Einstellung)

---

## Priorisierungsmatrix

```
Aufwand →    niedrig        mittel         hoch
                │              │              │
Nutzen         │              │              │
   hoch    ────┼──────────────┼──────────────┼────
              C2             A1            E6
         Keyboard          Drag&Drop    Wochenplan
         Shortcuts         Activity→    (Phase 3)
                           Projekt
   mittel  ────┼──────────────┼──────────────┼────
              E4             B4           D3
         Tagesabschluss  Kategorien   Cloud-Sync
         Notification     für Apps    (Phase 4)
   niedrig ────┼──────────────┼──────────────┼────
              D6             B1           D1
         Daten-Aufbew.    PDF-Bericht  Jira-Int.
         (einfach)        (mittel)     (komplex)
```

---

## Nächste konkrete Schritte

1. **Sofort**: Im laufenden Programm testen ob Icons korrekt erscheinen und nicht mehr geclippt werden
2. **Sofort**: Scroll-Verhalten beim Navigieren zwischen Tagen/Wochen testen
3. **Diese Woche**: Keyboard Shortcuts (C2) implementieren – größter Nutzen/Aufwand-Ratio
4. **Diese Woche**: "+X mehr"-Badge für zu viele Icons in einem Slot
5. **Nächste Woche**: Drag & Drop Activity → Projekt (A1) als nächstes größeres Feature

---

## Changelog

| Version | Datum | Änderungen |
|---|---|---|
| 0.9.5-beta | April 2026 | Overlay-Architektur, Z-Index-System, Scroll-Fixes, Docs |
| 0.9.4 | – | ActivityCard-Layout, Uniformität |
| 0.9.3 | – | PowerShell-Grouping, Calendar-Layout-Optimierung |
| 0.9.2 | – | EventRenderer-Lint-Fixes |
| 0.9.1 | – | Fehlerbehebungen |
