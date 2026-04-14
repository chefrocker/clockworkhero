# ClockworkHero

> Automatische Zeiterfassung für Windows — sieh auf einen Blick, wann du was gemacht hast.

**Tauri 2 · React 19 · TypeScript · SQLite**

[![Release](https://img.shields.io/github/v/release/chefrocker/ClockworkHero?style=flat-square)](https://github.com/chefrocker/ClockworkHero/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Build](https://img.shields.io/github/actions/workflow/status/chefrocker/ClockworkHero/release.yml?style=flat-square)](https://github.com/chefrocker/ClockworkHero/actions)

---

## Was ist ClockworkHero?

ClockworkHero läuft im Hintergrund im System-Tray und protokolliert automatisch, welche Programme du nutzt. Im Kalender siehst du deine Aktivitäten und kannst sie per Klick Projekten zuweisen. Am Ende des Tages — oder der Woche — weißt du genau, wo deine Zeit geblieben ist.

**Alles wird automatisch getrackt. Manuell wird nur bewertet.**

---

## Features

- **Automatisches App-Tracking** — erkennt aktive Fenster im Hintergrund
- **Kalenderansicht** (Tag/Woche) — manuelle Sessions und App-Aktivitäten überlagert
- **Drag & Drop** — Sessions verschieben und skalieren
- **Analytics Dashboard** — Projektverteilung, Trends, Fokus-Score, Streak, 12-Wochen-Heatmap
- **Excel-Export** — Auswertungen als `.xlsx` exportieren
- **System-Tray** — startet minimiert, zeigt heutige Stunden im Tooltip
- **Auto-Start** — optional mit Windows starten
- **Auto-Update** — neue Versionen per In-App-Toast installieren
- **Dark Mode**

---

## Download

→ **[Neueste Version herunterladen](https://github.com/chefrocker/ClockworkHero/releases/latest)**

Installer für Windows x64 (`.exe` oder `.msi`).  
Das Programm aktualisiert sich danach selbst, wenn neue Versionen erscheinen.

---

## Entwicklung

### Voraussetzungen

- [Node.js 20+](https://nodejs.org/)
- [Rust (stable)](https://rustup.rs/)
- [Tauri CLI](https://tauri.app/start/): `cargo install tauri-cli`

### Setup

```bash
git clone https://github.com/chefrocker/ClockworkHero.git
cd ClockworkHero
npm install
```

### Dev-Server starten

```bash
npm run tauri dev
```

### Production Build

```bash
npm run tauri build
# Installer liegt in: src-tauri/target/release/bundle/
```

---

## Architektur & Dokumentation

Alle technischen Dokumente liegen in [`/docs`](docs/):

| Dokument | Inhalt |
|----------|--------|
| [01_architektur.md](docs/01_architektur.md) | Tech-Stack, Komponentenbaum, DB-Schema |
| [03_feature_ideen.md](docs/03_feature_ideen.md) | Feature-Ideen und Roadmap-Kandidaten |
| [04_roadmap.md](docs/04_roadmap.md) | Entwicklungsplan und Prioritäten |
| [05_auto_update_einrichten.md](docs/05_auto_update_einrichten.md) | Auto-Update Setup (Schlüssel, Secrets, Release) |

---

## Releases veröffentlichen

```bash
# Version in tauri.conf.json + Cargo.toml erhöhen, dann:
git add .
git commit -m "Release v1.1.0"
git tag v1.1.0
git push origin master --tags
```

GitHub Actions baut, signiert und veröffentlicht automatisch.  
Alle laufenden ClockworkHero-Instanzen werden benachrichtigt.

→ Vollständige Anleitung: [docs/05_auto_update_einrichten.md](docs/05_auto_update_einrichten.md)

---

## Lizenz

[MIT](LICENSE) — Copyright (c) 2026 Sandro Ballarini
