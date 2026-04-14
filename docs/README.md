# ClockworkHero – Dokumentation

> Stand: April 2026 | Version 0.9.5-beta

---

## Inhalt

| Dokument | Beschreibung |
|---|---|
| [01_architektur.md](01_architektur.md) | Projektübersicht, Technologie-Stack, Komponentenbaum, Datenbankschema, Datenfluss |
| [03_feature_ideen.md](03_feature_ideen.md) | Umfangreicher Ideenkatalog für neue Features – kategorisiert nach Aufwand und Nutzen |
| [04_roadmap.md](04_roadmap.md) | Entwicklungsplan: Was wurde gemacht, was kommt als nächstes, Priorisierungsmatrix |
| [ClockworkHero_SDD_v1.0.md](ClockworkHero_SDD_v1.0.md) | Software Design Document (ursprüngliche Spezifikation) |

---

## Kurzübersicht

**ClockworkHero** ist eine Desktop-Zeiterfassungsapp (Tauri + React + TypeScript), die:
- **Automatisch** aktive Anwendungen/Fenster trackt
- **Manuelle** Projektbuchungen mit Drag & Drop erlaubt
- Beides in einer **Kalenderansicht** (Tag/Woche) überlagert
- Ein **Analytics-Dashboard** mit Charts und Export bietet

### Wichtigste bekannte Probleme
1. `slotRank`-Algorithmus erkennt zeitliche Überlappungen nicht korrekt → Icons überlagern sich
2. Z-Index-System zwischen manuellen Sessions und Activity-Icons ist unklar definiert
3. Auto-Zoom kann Layout-Sprünge verursachen

→ Details und Fixes: [02_visuelle_probleme_und_handlungsempfehlungen.md](02_visuelle_probleme_und_handlungsempfehlungen.md)

### Top Feature-Empfehlungen
1. **Keyboard Shortcuts** (schnell, hoher Nutzen)
2. **Drag & Drop Activity auf Projekt** (mittlerer Aufwand, sehr nützlich)
3. **App-Kategorisierung** für bessere Analytics
4. **Pomodoro-Modus** für Produktivitäts-Nutzer
5. **Command Palette** (Ctrl+K) für Power-User

→ Alle Ideen: [03_feature_ideen.md](03_feature_ideen.md)
