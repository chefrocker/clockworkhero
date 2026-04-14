# Feature-Ideen & Roadmap

> Gesammelter Ideenkatalog für ClockworkHero  
> Stand: April 2026  
> Status: Konzeptphase – keine Priorisierung oder Commitment

---

## Legende

| Symbol | Bedeutung |
|---|---|
| 🟢 | Niedrige Komplexität – schnell umsetzbar |
| 🟡 | Mittlere Komplexität |
| 🔴 | Hohe Komplexität / größerer Aufwand |
| ⭐ | Besonders hoher Nutzen für Endanwender |

---

## Kategorie A: Kalender & Zeiterfassung

### A1 – Drag & Drop: Activity-Events auf Projekte ziehen ⭐ 🟡
**Idee:** Ein automatisch getrackte App-Aktivität per Drag & Drop auf ein Projekt-Label ziehen, um daraus direkt eine manuelle Session zu erstellen. Spart das manuelle Eintippen von Start/End-Zeiten.

**Ablauf:**
1. User zieht ein Activity-Icon auf die linke Seite (Projekt-Bereich)
2. Ein Modal öffnet sich mit vorausgefüllter Zeit und App-Name als Beschreibung
3. User bestätigt → Session wird angelegt

---

### A2 – Templates für wiederkehrende Aufgaben 🟢
**Idee:** Häufig verwendete Session-Beschreibungen als Templates speichern (z.B. "Daily Standup – 15 Min", "Code Review"). Per Klick einfügen statt Freitext tippen.

---

### A3 – Mehrere Sessions gleichzeitig verschieben 🔴
**Idee:** Mehrere Sessions per Shift+Klick auswählen und gemeinsam verschieben oder löschen.

---

### A4 – Wiederkehrende Sessions (Recurring Events) 🔴
**Idee:** Sessions als "täglich", "wöchentlich" etc. markieren. Z.B. jeden Morgen 15 Minuten "Daily Standup" automatisch im Kalender anlegen.

---

### A5 – Session-Notizen & Rich Text 🟡
**Idee:** Zu jeder Session können längere Notizen (z.B. was wurde erledigt, Links, To-Do's) erfasst werden. Darstellung als kompaktes Tooltip beim Hover.

---

### A6 – Kalender-Sync (iCal Export/Import) 🔴
**Idee:** Export der Work-Sessions als `.ics`-Datei zum Import in Google Calendar, Outlook, Apple Calendar. Optional: Automatischer Import von Terminen aus dem Kalender als "geplante Blöcke".

---

### A7 – Pausen automatisch erkennen & markieren 🟡
**Idee:** Wenn über X Minuten keine App-Aktivität erfasst wird (Schwelle konfigurierbar), wird automatisch ein "Pause"-Block in der Ansicht angezeigt. Hilfreich für die Stundenzettel-Auswertung.

---

### A8 – Zeitkorrektur-Vorschläge 🟡
**Idee:** Das System vergleicht getrackte Aktivitäten mit manuellen Sessions und schlägt vor, zeitliche Lücken zu füllen oder überlappende Sessions anzupassen. Z.B. "Du warst 45 Minuten in VS Code ohne gebuchte Session – möchtest du diese Zeit Projekt X zuweisen?"

---

## Kategorie B: Dashboard & Analytics

### B1 – Wochenbericht als PDF exportieren ⭐ 🟡
**Idee:** Automatisch generierten Wochenbericht als PDF exportieren. Enthält: gebuchte Stunden pro Projekt, meist genutzte Apps, Vergleich mit Zielstunden, Kommentar-Feld.

---

### B2 – Trend-Analyse: Stunden über mehrere Wochen 🟡
**Idee:** Dashboard-Erweiterung mit einem Linien- oder Balkendiagramm, das die täglich/wöchentlich gearbeiteten Stunden über einen gewählten Zeitraum (1 Monat, 3 Monate, Jahr) darstellt. Zeigt Trends wie "du arbeitest freitags weniger" oder "letzte Woche Überstunden".

---

### B3 – Fokus-Score 🟡
**Idee:** Eine Kennzahl, die angibt wie fokussiert ein Arbeitstag war. Berechnung basierend auf: Anzahl App-Wechsel, längste ununterbrochene Aktivität in einer App, Verhältnis Produktiv-Apps zu Ablenkern. Als Tages-Score (0–100) im Dashboard.

---

### B4 – App-Kategorisierung ⭐ 🟡
**Idee:** Apps in Kategorien einteilen (z.B. "Entwicklung", "Kommunikation", "Browser", "Ablenkung"). Dashboard zeigt Zeitanteile pro Kategorie als Sunburst- oder gestapeltes Balkendiagramm.

**Konfiguration:** User weist Apps Kategorien manuell zu (einmalig). Neue unbekannte Apps werden als "Unkategorisiert" markiert mit Aufforderung zuzuweisen.

---

### B5 – Vergleich mit Zielzeiten 🟢
**Idee:** Im Dashboard: Soll/Ist-Vergleich pro Wochentag. Die Zielzeiten kommen aus dem konfigurierten Wochenplan. Darstellung als horizontale Balken (Ziel grau, Ist farbig).

---

### B6 – Heatmap-Kalender (GitHub-Stil) 🟡
**Idee:** Jahresübersicht als Heatmap (365 Tage). Je dunkler die Farbe, desto mehr Stunden gearbeitet. Schneller Überblick über Arbeitsmuster, Urlaube, intensive Phasen.

---

### B7 – App-Nutzungs-Ranking 🟢
**Idee:** Rangliste der meist genutzten Apps über den gewählten Zeitraum (Tag/Woche/Monat) mit prozentualer Zeitanteilen und Trend-Pfeil (+/-).

---

### B8 – Projektvergleich über Zeit 🟡
**Idee:** Balkendiagramm, das zeigt wie sich die Zeit-Verteilung zwischen Projekten über die letzten Wochen/Monate entwickelt hat. Hilfreich um festzustellen ob ein Projekt mehr/weniger Aufwand als geplant kostet.

---

## Kategorie C: UX & Interface

### C1 – Command Palette (Cmd/Ctrl+K) ⭐ 🟡
**Idee:** Eine schnelle Suchleiste (wie in VS Code), die mit Ctrl+K öffnet. Ermöglicht:
- Schnell zu einem Datum springen
- Session anlegen ("Neue Session für Projekt X")
- Timer starten
- Einstellungen öffnen
- Projekt suchen

---

### C2 – Keyboard Shortcuts ⭐ 🟢
**Idee:** Vollständige Tastatursteuerung:
- `N` → Neue Session
- `T` → Timer Start/Stop
- `D` / `W` → Tag / Woche wechseln
- `←` / `→` → Vorheriger / Nächster Tag
- `Heute` → `H`
- `Escape` → Modal schließen

---

### C3 – Onboarding-Flow für Erstnutzer 🟢
**Idee:** Beim ersten Start eine kurze interaktive Tour: "Hier siehst du getrackte Apps. Hier kannst du Projekte anlegen. So buchst du Zeit." Mit 3–4 Schritten und Skip-Option.

---

### C4 – Mini-Widget / System-Tray Popup 🔴
**Idee:** Ein kleines Popup direkt vom System-Tray aus, das:
- Den aktuellen Timer zeigt
- Schnell einen Timer starten/stoppen erlaubt
- Die letzten 3 Sessions anzeigt
Ohne die Hauptapp öffnen zu müssen.

---

### C5 – Farbthemen & Akzentfarben 🟢
**Idee:** Neben Hell/Dunkel auch weitere Farbthemen anbieten (z.B. "Blau", "Lila", "Grün", "Hochkontrast"). Oder: Freie Wahl der Primärfarbe (`--primary`) über einen Colorpicker.

---

### C6 – Kalender-Minimap 🟡
**Idee:** Eine kleine Monatsübersicht als Seitenleiste (wie in Outlook), über die man schnell zu einem anderen Datum navigieren kann, ohne das Datumsfeld zu benutzen.

---

### C7 – Responsive Wochenansicht: Kompakt-Modus 🟡
**Idee:** Bei kleinen Fenstern (z.B. halber Monitor) automatisch in einen Kompakt-Modus wechseln, bei dem die Wochenansicht nur die aktuellen 3 Tage zeigt statt 7.

---

### C8 – Undo/Redo für Session-Operationen 🔴
**Idee:** Ctrl+Z macht die letzte Session-Erstellung/Löschung/Verschiebung rückgängig. Wichtig wenn man versehentlich eine Session löscht oder falsch verschiebt.

---

## Kategorie D: Daten & Integration

### D1 – Jira / Linear Integration 🔴
**Idee:** Tickets aus Jira oder Linear als Buchungsziele anzeigen. Beim Anlegen einer Session direkt ein Ticket auswählen und die gebuchte Zeit an die API übermitteln (Time-Tracking in Jira).

---

### D2 – Automatische Kategorisierung per Fenstertitel 🟡
**Idee:** Regex-Regeln definieren die auf Fenstertitel matchen und automatisch eine App einem Projekt zuordnen. Z.B.: Fenstertitel enthält "PROJ-123" → Projekt "Kunde XYZ". Die Aktivität wird dann als "verknüpft" markiert.

---

### D3 – Cloud-Sync / Backup 🔴
**Idee:** Optionaler Sync der SQLite-Datenbank in die Cloud (z.B. iCloud Drive, Dropbox, Google Drive). Ermöglicht Nutzung auf mehreren Geräten. Erfordert Konfliktlösung bei gleichzeitiger Nutzung.

---

### D4 – CSV-Import für historische Daten 🟡
**Idee:** Bereits vorhandene Zeiterfassungsdaten (z.B. aus Toggl, Clockify) als CSV importieren und als manuelle Sessions darstellen. Erleichtert die Migration zu ClockworkHero.

---

### D5 – Mehrsprachigkeit (i18n) 🟡
**Idee:** Die Benutzeroberfläche in weiteren Sprachen anbieten. Aktuell ist die UI auf Deutsch, aber Englisch als weitere Sprache würde die Zielgruppe erheblich erweitern. Nutzung von `react-i18next`.

---

### D6 – Daten-Aufbewahrungsrichtlinie 🟢
**Idee:** In den Einstellungen konfigurieren: "Log-Daten älter als X Tage automatisch löschen." Verhindert unbegrenztes Datenbankwachstum und schützt die Privatsphäre.

---

## Kategorie E: Produktivitäts-Features

### E1 – Pomodoro-Modus ⭐ 🟡
**Idee:** Integrierter Pomodoro-Timer: 25 Minuten Arbeit, 5 Minuten Pause (konfigurierbar). Visueller Countdown im Header. Nach jeder Session wird automatisch eine Zeitbuchung auf das aktive Projekt erstellt.

---

### E2 – Ziele & Meilensteine 🔴
**Idee:** Pro Projekt ein Stunden-Budget setzen (z.B. "Kunde X: 80 Stunden/Monat"). Dashboard zeigt den aktuellen Verbrauch als Fortschrittsbalken. Benachrichtigung wenn 80% erreicht.

---

### E3 – Fokus-Modus 🟡
**Idee:** "Fokus starten"-Funktion: Aktiviert Do-Not-Disturb über Tauri (Systembenchrichtigung stummschalten), startet einen Timer, blendet alle nicht relevanten UI-Elemente aus. Nur das aktive Projekt und der Countdown sind sichtbar.

---

### E4 – Automatischer Tagesabschluss-Report 🟢
**Idee:** Am Ende des Arbeitstages (konfigurierbare Zeit, z.B. 18:00 Uhr) eine Desktop-Benachrichtigung mit einer kurzen Zusammenfassung: "Du hast heute 7h 20min gearbeitet. Projekte: A 4h, B 3h. Ziel: 8h."

---

### E5 – Idle-Detection verbessern 🟡
**Idee:** Erkennen wenn der Computer gesperrt ist oder der Nutzer längere Zeit inaktiv war (keine Maus/Tastatur-Aktivität). Beim "Zurückkommen" fragen: "Du warst 45 Minuten weg – was hast du gemacht?" Mit Optionen: "Pause", "Meeting", "Anderes" (→ direkt als Session buchen).

---

### E6 – Wochenplanung / Time-Blocking 🔴
**Idee:** Zukünftige Sessions als "geplant" markieren (eigene Farbe/Stil im Kalender). Am Anfang der Woche Zeit-Blöcke für Projekte einplanen. Am Ende der Woche: Vergleich geplant vs. tatsächlich.

---

## Kategorie F: Technische Verbesserungen (nicht sichtbar, aber wichtig)

### F1 – Paginierung für `loadAllEvents` 🟡
**Idee:** Aktuell werden alle Events aus der Datenbank für den sichtbaren Zeitraum geladen. Bei jahrelanger Nutzung kann das langsam werden. Lösung: Events nur für den aktuell sichtbaren Datumsbereich +/- 1 Woche laden.

---

### F2 – Automatische DB-Migrations 🟡
**Idee:** Beim Update der App kann sich das Datenbankschema ändern. Aktuell keine formale Migration. Einführung eines einfachen Migrations-Systems (Version-Nummer in der DB, Migration-Scripts).

---

### F3 – Unit-Tests für Kernlogik 🟡
**Idee:** Tests für:
- `processEventsForOverlaps` (Overlap-Algorithmus)
- `renderEventContent` (Positionsberechnung)
- `analyticsService` (Aggregations-Berechnungen)
- `db.ts` (SQL-Operationen mit Test-Datenbank)

---

### F4 – Error Boundary & Crash Reporting 🟢
**Idee:** React Error Boundary um den Kalender und das Dashboard setzen. Bei einem Render-Fehler (z.B. durch unerwartete Daten) einen freundlichen Fehlerbildschirm zeigen statt einer leeren Seite.

---

## Feature-Übersicht nach Aufwand/Nutzen

### Schnell umsetzbar & hoher Nutzen (Quick Wins)
- C2 – Keyboard Shortcuts
- B7 – App-Nutzungs-Ranking
- D6 – Daten-Aufbewahrungsrichtlinie
- E4 – Automatischer Tagesabschluss-Report
- F4 – Error Boundary

### Mittlerer Aufwand, großer Nutzen
- A1 – Drag & Drop Activity auf Projekt
- B1 – PDF-Wochenbericht
- B4 – App-Kategorisierung
- C1 – Command Palette
- E1 – Pomodoro-Modus
- A8 – Zeitkorrektur-Vorschläge

### Grosse Features (langfristig)
- D1 – Jira/Linear Integration
- A6 – iCal Sync
- E6 – Wochenplanung / Time-Blocking
- D3 – Cloud-Sync
- C4 – System-Tray Widget
