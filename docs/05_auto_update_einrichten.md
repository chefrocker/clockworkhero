# Auto-Update & Release-Prozess

> GitHub: `https://github.com/chefrocker/clockworkhero`

---

## Sicherheitsfragen vorab

### Ist der Public Key in tauri.conf.json ein Problem für Git?

**Nein. Der Public Key gehört ins Repository** — er ist wie ein Schloss, das jeder sehen darf.
Der private Schlüssel (das Gegenstück) liegt ausschliesslich als GitHub Secret und niemals im Code.

```
tauri.conf.json  →  enthält PUBLIC KEY   ✅ committen & pushen ist korrekt
GitHub Secret    →  enthält PRIVATE KEY  🔒 niemals im Code
```

### Gehen meine Daten beim Update verloren?

**Nein. Niemals.** Tauri installiert die App in:
```
C:\Program Files\ClockworkHero\      ← wird beim Update ersetzt (nur Programmdateien)
```

Die Datenbank liegt in einem völlig anderen Ordner:
```
C:\Users\[Name]\AppData\Roaming\com.chefrocker.clockworkhero\   ← wird NICHT angefasst
    └── clockworkhero.db   ← deine gesamten Zeitdaten, sicher
```

Das ist Tauri-Architektur — Updates ersetzen nur den Programm-Code, nie die Nutzerdaten.

---

## Wie funktioniert ein Update? (Ablauf)

```
Du                          GitHub Actions              Nutzer-PC
──                          ──────────────              ─────────
git tag v1.1.0
git push --tags      →      baut .exe/.msi
                     →      signiert mit Private Key
                     →      erstellt GitHub Release
                     →      lädt latest.json hoch   →  ClockworkHero prüft beim Start
                                                     →  findet neue Version
                                                     →  zeigt Toast: "Update v1.1.0 verfügbar"
                                                     →  Nutzer klickt "Installieren"
                                                     →  Download + Installation
                                                     →  Neustart → neue Version läuft
```

### Manuell auf Updates prüfen

Zusätzlich zur automatischen Prüfung beim Start kann der Nutzer jederzeit manuell prüfen:

```
Einstellungen (Ctrl+,) → Über → "Nach Updates suchen"
```

Ein Toast zeigt das Ergebnis: entweder "Neue Version verfügbar" (mit Installieren-Button)
oder "Bereits aktuell".

---

## Einmalige Einrichtung

### Schritt 1 — GitHub Secrets hinterlegen

**Im Browser:**
```
https://github.com/chefrocker/clockworkhero
→ Settings (oben im Repo)
→ Secrets and variables
→ Actions
→ New repository secret
```

Zwei Secrets anlegen:

| Name | Wert |
|------|------|
| `TAURI_SIGNING_PRIVATE_KEY` | Den langen privaten Schlüssel (aus `~/.tauri/clockworkhero.key`) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Das Passwort dazu (bei leerem Passwort: einfach ein Leerzeichen eingeben) |

> **Wo ist der Private Key?**  
> Er wurde beim Ausführen von `cargo tauri signer generate` ausgegeben und sollte in
> `C:\Users\chefr\.tauri\clockworkhero.key` gespeichert sein.
> Öffne die Datei mit Notepad — der lange String darin ist der Private Key.

---

### Schritt 2 — Erstes Release erstellen

```powershell
# Im Projektordner:
git add .
git commit -m "Auto-Update Konfiguration fertiggestellt"
git push origin master

# Das erste Release-Tag setzen:
git tag v1.0.0
git push origin master --tags
```

Dann unter `https://github.com/chefrocker/clockworkhero/actions` beobachten wie die
Pipeline läuft (ca. 10–15 Minuten). Am Ende findest du unter
`https://github.com/chefrocker/clockworkhero/releases` den fertigen Installer.

---

## Zukünftige Updates veröffentlichen

### 1. Version erhöhen

In **zwei Dateien** die Versionsnummer anpassen:

**`src-tauri/tauri.conf.json`**:
```json
"version": "1.1.0"
```

**`src-tauri/Cargo.toml`**:
```toml
version = "1.1.0"
```

> **Regel:** Immer beide Dateien synchron halten. Semantic Versioning:
> - Bugfix: `1.0.0` → `1.0.1`
> - Neues Feature: `1.0.0` → `1.1.0`
> - Breaking Change: `1.0.0` → `2.0.0`

### 2. Committen und taggen

```powershell
git add .
git commit -m "Version 1.1.0: Kurze Beschreibung der Änderungen"
git tag v1.1.0
git push origin master --tags
```

### 3. Fertig

GitHub Actions übernimmt alles weitere. Nach ~15 Minuten ist das Release online
und alle laufenden ClockworkHero-Instanzen werden beim nächsten Start benachrichtigt.

---

## Lokaler Test-Build (ohne Release)

```powershell
npm run tauri build
```

Installer liegt danach in:
```
src-tauri/target/release/bundle/nsis/ClockworkHero_x.x.x_x64-setup.exe
src-tauri/target/release/bundle/msi/ClockworkHero_x.x.x_x64_en-US.msi
```

---

## Node.js 24 – bekanntes Problem mit OpenSSL

Die GitHub Actions Pipeline verwendet Node.js 24. Diese Version hat eine Inkompatibilität
mit älteren OpenSSL-Konfigurationen, die zu Build-Fehlern führen kann:

```
Error: error:0308010C:digital envelope routines::unsupported
```

**Fix** – in `.github/workflows/release.yml` die Environment-Variable setzen:

```yaml
env:
  NODE_OPTIONS: --openssl-legacy-provider
```

Alternativ in der Pipeline explizit Node.js 20 LTS verwenden, wenn das Problem persistiert.

---

## Fehlerdiagnose

| Problem | Ursache | Lösung |
|---------|---------|--------|
| Pipeline schlägt fehl mit "signature error" | Falscher Private Key in Secrets | Secrets prüfen, Key neu kopieren |
| Pipeline schlägt fehl mit "pubkey empty" | Public Key fehlt in tauri.conf.json | Public Key eintragen |
| OpenSSL-Fehler im Build | Node.js 24 Inkompatibilität | `NODE_OPTIONS=--openssl-legacy-provider` setzen |
| Nutzer sieht kein Update | Versionsnummer nicht erhöht | Beide Dateien prüfen |
| "Nach Updates suchen" zeigt nichts | Repo ist privat oder Release fehlt | Repo auf Public setzen, Release prüfen |
| Download schlägt fehl | Repo ist privat | Repo auf Public setzen oder Token konfigurieren |
| "latest.json not found" | Pipeline ist noch nicht fertig | 15 Min warten, dann nochmal |

---

## Kurzreferenz: Update-Checkliste

```
□ Änderungen programmiert und getestet
□ Version in tauri.conf.json erhöht
□ Version in Cargo.toml erhöht (gleiche Nummer!)
□ git add . && git commit -m "Version x.x.x: ..."
□ git tag vx.x.x
□ git push origin master --tags
□ Unter Actions prüfen ob Build erfolgreich
□ Unter Releases prüfen ob Installer vorhanden
```
