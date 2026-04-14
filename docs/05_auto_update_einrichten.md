# Auto-Update einrichten (Tauri 2 + GitHub Releases)

> Einmalige Einrichtung – danach reicht ein `git tag v1.x.x && git push --tags`

---

## Wie es funktioniert

```
Entwickler                   GitHub                        Nutzer
─────────                   ────────                       ──────
git tag v1.1.0        →     GitHub Actions baut .msi  →   Programm prüft beim
git push --tags       →     signiert es                →   Start auf Updates
                      →     erstellt Release           →   Toast erscheint
                      →     lädt latest.json hoch      →   1 Klick installiert
```

---

## Schritt 1: Signatur-Schlüsselpaar erstellen

Einmalig auf deinem Entwicklungsrechner:

```bash
# Tauri CLI installieren (falls nicht vorhanden)
cargo install tauri-cli

# Schlüsselpaar generieren
cargo tauri signer generate -w ~/.tauri/clockworkhero.key
```

Das gibt aus:
```
Private key:  [langer String]
Public key:   [kürzerer String]
```

**Wichtig:** Den privaten Schlüssel NIEMALS ins Repository committen.

---

## Schritt 2: Public Key in tauri.conf.json eintragen

In `src-tauri/tauri.conf.json`:
```json
"plugins": {
  "updater": {
    "pubkey": "HIER_DEN_PUBLIC_KEY_EINFÜGEN",
    "endpoints": [
      "https://github.com/DEIN-USER/ClockworkHero/releases/latest/download/latest.json"
    ]
  }
}
```

**DEIN-USER** durch deinen GitHub-Benutzernamen ersetzen.

---

## Schritt 3: GitHub Repository einrichten

1. Neues Repo auf GitHub erstellen: `github.com/DEIN-USER/ClockworkHero`
2. Repository als Remote hinzufügen:
   ```bash
   git remote add origin https://github.com/DEIN-USER/ClockworkHero.git
   git push -u origin master
   ```

---

## Schritt 4: GitHub Secrets hinterlegen

Im GitHub Repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret-Name                        | Wert                                      |
|------------------------------------|-------------------------------------------|
| `TAURI_SIGNING_PRIVATE_KEY`        | Den privaten Schlüssel aus Schritt 1      |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Das Passwort (leer lassen = leerer String) |

---

## Schritt 5: Erstes Release veröffentlichen

```bash
# Version in Cargo.toml und tauri.conf.json auf z.B. "1.0.0" setzen
git add .
git commit -m "Release v1.0.0"
git tag v1.0.0
git push origin master --tags
```

→ GitHub Actions startet automatisch, baut das Programm für Windows,
  signiert es und erstellt ein GitHub Release mit:
  - `ClockworkHero_1.0.0_x64-setup.exe`
  - `ClockworkHero_1.0.0_x64_en-US.msi`
  - `latest.json` (für den automatischen Updater)

---

## Schritt 6: Zukünftige Updates

```bash
# Version erhöhen (in tauri.conf.json und Cargo.toml)
# z.B. "1.0.0" → "1.1.0"

git add .
git commit -m "Version 1.1.0: Neue Features XYZ"
git tag v1.1.0
git push origin master --tags
```

Alle laufenden ClockworkHero-Instanzen prüfen beim nächsten Start
auf Updates und zeigen einen Toast an.

---

## Lokaler Build-Test (ohne CI)

```bash
# Im Projektverzeichnis
npm run tauri build

# Installer liegt dann in:
# src-tauri/target/release/bundle/nsis/
# src-tauri/target/release/bundle/msi/
```

---

## Troubleshooting

**"pubkey is empty"** → Public Key in tauri.conf.json nicht eingetragen  
**"signature mismatch"** → Falsches Schlüsselpaar in den Secrets  
**"download failed"** → GitHub Repo ist privat + kein Token konfiguriert  
**Updates kommen nicht an** → Versionsnummer wurde nicht erhöht (Tauri vergleicht semver)
