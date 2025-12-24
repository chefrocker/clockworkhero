
# Wochenplan-Feature für ClockworkHero

Ein flexibles Zeitmanagement-System zur Verwaltung individueller Arbeitszeiten pro Wochentag mit Unterstützung für mehrere Zeitblöcke.

---

## 📥 Aktuelle Version & Download

**[ClockworkHero Installer herunterladen](file:///C:/Gitlab/ClockworkHero/ClockworkHero/src-tauri/target/release/bundle/msi/clockworkhero_0.9.5_x64_en-US.msi)**  
*(Hinweis: Kompiliert für Windows x64)*

---

## 📋 Übersicht

Dieses Feature ermöglicht es Benutzern, ihre Arbeitszeiten für jeden Wochentag individuell zu konfigurieren. Pro Tag können beliebig viele Zeitblöcke hinzugefügt werden, um komplexe Arbeitszeitmodelle abzubilden (z.B. geteilte Dienste mit Mittagspausen).

### Beispiel-Anwendungsfall

**Montag:**
- 08:00 - 12:00 Uhr (Vormittag)
- 13:00 - 17:00 Uhr (Nachmittag)
- **Summe: 8 Stunden**

**Dienstag:**
- 07:30 - 12:00 Uhr
- 13:00 - 17:15 Uhr  
- **Summe: 8,75 Stunden**

---

## ✨ Features

- ✅ **Individuelle Arbeitszeiten pro Wochentag** - Jeder Tag kann eigene Start- und Endzeiten haben
- ✅ **Mehrere Zeitblöcke pro Tag** - Unterstützt Split-Shifts und Pausen
- ✅ **Automatische Stundenberechnung** - Tages- und Wochensummen werden live berechnet
- ✅ **Dynamisches Hinzufügen/Entfernen** - Zeitblöcke können per Klick hinzugefügt oder gelöscht werden
- ✅ **Arbeitstag Toggle** - Schnelles Aktivieren/Deaktivieren einzelner Wochentage
- ✅ **Moderne UI** - Intuitive Benutzeroberfläche mit professionellem Styling
- ✅ **Responsive Design** - Funktioniert auf Desktop, Tablet und Mobile

---

## 🏗️ Technische Architektur

### Datenstruktur

```typescript
interface WorkTimeBlock {
  id: string;
  start: string;  // Format: "HH:MM"
  end: string;    // Format: "HH:MM"
}

interface DaySchedule {
  dayName: string;        // z.B. "Montag"
  dayShort: string;       // z.B. "Mo"
  isWorkday: boolean;
  blocks: WorkTimeBlock[];
  totalHours: number;     // Automatisch berechnet
}

interface AppSettings {
  // Bestehende Felder...
  workStart?: string;           // ⚠️ DEPRECATED
  workEnd?: string;             // ⚠️ DEPRECATED
  weekSchedule?: DaySchedule[]; // ✅ NEU
  dailyTarget?: number;
  // ... weitere Felder
}
```

### Komponenten-Hierarchie

```
SettingsModal (Main Container)
│
├── GeneralTab
│   └── WorkScheduleEditor
│       └── DayCard (7x, einer pro Wochentag)
│           └── TimeBlockInput (mehrfach pro Tag)
│
├── TrackingTab
├── ProjectsTab
├── ColorsTab
├── DatabaseTab
└── AboutTab
```

---

## 📦 Installation & Integration

### Schritt 1: Types erweitern (`src/types.ts`)

```typescript
export interface WorkTimeBlock {
  id: string;
  start: string;
  end: string;
}

export interface DaySchedule {
  dayName: string;
  dayShort: string;
  isWorkday: boolean;
  blocks: WorkTimeBlock[];
  totalHours: number;
}

export interface AppSettings {
  // Bestehende Felder...
  workStart?: string;     // ⚠️ DEPRECATED - nur für Migration
  workEnd?: string;       // ⚠️ DEPRECATED - nur für Migration
  weekSchedule?: DaySchedule[];  // ✅ NEU
  dailyTarget?: number;
  groupingThreshold?: number;
  theme?: string;
  adminPassword?: string;
}
```

### Schritt 2: Komponente erstellen (`src/components/WorkScheduleEditor.tsx`)

Die neue `WorkScheduleEditor`-Komponente übernimmt die gesamte Logik für:
- Anzeige des Wochenplans
- Hinzufügen/Entfernen von Zeitblöcken
- Berechnung der Arbeitsstunden
- Validierung der Eingaben

**Wichtige Funktionen:**

```typescript
// Zeitblöcke hinzufügen
const addBlock = (dayIndex: number) => { /* ... */ };

// Zeitblöcke entfernen
const removeBlock = (dayIndex: number, blockId: string) => { /* ... */ };

// Zeitblöcke aktualisieren
const updateBlock = (dayIndex: number, blockId: string, field, value) => { /* ... */ };

// Arbeitsstunden berechnen
function calculateDayHours(day: DaySchedule): DaySchedule { /* ... */ };
```

Siehe vollständige Implementierung im Abschnitt "Code-Beispiele".

### Schritt 3: Settings Modal anpassen

Die `SettingsModal.tsx` wird um das neue Feature erweitert:

```typescript
{activeTab === 'general' && (
  <div>
    <WorkScheduleEditor
      weekSchedule={localSettings.weekSchedule || getDefaultWeekSchedule()}
      onChange={(schedule) => setLocalSettings({ ...localSettings, weekSchedule: schedule })}
    />
    
    <h3 className="settings-h3" style={{ marginTop: '40px' }}>Ziele</h3>
    <div className="input-group">
      <label className="input-label">Tagesziel (Stunden)</label>
      <input
        type="number"
        className="input-number"
        value={localSettings.dailyTarget || 0}
        onChange={e => setLocalSettings({ ...localSettings, dailyTarget: parseFloat(e.target.value) })}
      />
    </div>
  </div>
)}
```

---

## ⚠️ Code-Refactoring Empfehlung

### Problem

Die `SettingsModal.tsx` ist mit **über 600 Zeilen** zu groß geworden. Dies führt zu:
- ❌ Schwieriger Wartbarkeit
- ❌ Verlangsamtem Rendering
- ❌ Erhöhter Fehleranfälligkeit
- ❌ Merge-Konflikten bei mehreren Entwicklern
- ❌ Unübersichtlichem Code

### Lösung: Komponenten-Aufteilung

**Empfohlene Struktur:**

```
src/components/settings/
├── SettingsModal.tsx          (~150 Zeilen - Hauptcontainer)
├── GeneralTab.tsx             (Arbeitszeiten & Ziele)
├── TrackingTab.tsx            (Activity Stream & Design)
├── ProjectsTab.tsx            (Projektverwaltung)
├── ColorsTab.tsx              (Activity Farben)
├── DatabaseTab.tsx            (Backup/Restore/Security)
├── AboutTab.tsx               (Über-Seite)
├── WorkScheduleEditor.tsx     (Wochenplan - NEU)
├── ProjectEditor.tsx          (Projekt bearbeiten)
└── ImageCropper.tsx           (Cropper Modal)
```

### Vorteile der Aufteilung

1. **Bessere Übersichtlichkeit** - Jede Datei hat eine klare Verantwortlichkeit (Single Responsibility Principle)
2. **Einfacheres Testen** - Komponenten können isoliert getestet werden
3. **Wiederverwendbarkeit** - Tabs können in anderen Kontexten genutzt werden
4. **Paralleles Arbeiten** - Mehrere Entwickler können gleichzeitig arbeiten ohne Konflikte
5. **Schnelleres Rendering** - React rendert nur veränderte Tabs neu
6. **Bessere Code-Organisation** - Logisch zusammenhängende Features sind gruppiert
7. **Einfachere Fehlersuche** - Bugs lassen sich schneller lokalisieren

### Migrations-Beispiel

**Vorher:**
```typescript
// SettingsModal.tsx (600+ Zeilen)
export const SettingsModal: React.FC<Props> = (props) => {
  // Alle 6 Tabs hier drin...
  return (
    <div className="modal-content">
      {activeTab === 'general' && <div>{/* 100+ Zeilen */}</div>}
      {activeTab === 'tracking' && <div>{/* 80+ Zeilen */}</div>}
      {activeTab === 'projects' && <div>{/* 150+ Zeilen */}</div>}
      {/* ... mehr Code ... */}
    </div>
  );
};
```

**Nachher:**
```typescript
// SettingsModal.tsx (150 Zeilen)
import { GeneralTab } from './settings/GeneralTab';
import { TrackingTab } from './settings/TrackingTab';
import { ProjectsTab } from './settings/ProjectsTab';
// ... weitere Imports

export const SettingsModal: React.FC<Props> = (props) => {
  return (
    <div className="modal-content">
      {activeTab === 'general' && (
        <GeneralTab settings={localSettings} onChange={setLocalSettings} />
      )}
      {activeTab === 'tracking' && (
        <TrackingTab settings={localSettings} onChange={setLocalSettings} />
      )}
      {activeTab === 'projects' && (
        <ProjectsTab 
          projects={projects}
          onUpdate={onUpdateProject}
          onDelete={onDeleteProject}
          onAdd={onAddProject}
        />
      )}
      {/* ... weitere Tabs ... */}
    </div>
  );
};
```

---

## 🎨 UI/UX Details

### Visuelle Hierarchie

- **Header:** Wochentag mit Checkbox und Stundensumme in Badge
- **Zeitblöcke:** Liste mit Start-/Endzeit-Inputs und Löschen-Button
- **Actions:** Plus-Button zum Hinzufügen weiterer Blöcke
- **Footer:** Wochensumme wird prominent angezeigt

### Interaktionsmuster

1. **Checkbox aktivieren** → Standard-Zeitblock wird erstellt (08:00 - 17:00)
2. **Plus-Button klicken** → Neuer Zeitblock erscheint unterhalb
3. **Zeit ändern** → Stunden werden automatisch neu berechnet
4. **Trash-Icon klicken** → Block wird entfernt (min. 1 Block bleibt)
5. **Checkbox deaktivieren** → Alle Blöcke werden gelöscht, totalHours = 0

### Farbschema

- **Primärfarbe:** `#3498db` (Blau)
- **Hintergrund Arbeitstag:** `#ffffff` (Weiß)
- **Hintergrund kein Arbeitstag:** `#f8fafc` (Hellgrau, opacity: 0.6)
- **Border:** `#e2e8f0`
- **Zeitblock-Hintergrund:** `#f1f5f9`
- **Badge-Hintergrund:** `#dbeafe`
- **Badge-Text:** `#1e40af`

### Responsive Design

Die Komponente passt sich automatisch an verschiedene Bildschirmgrößen an:
- **Desktop (>1024px):** Volle Breite mit großzügigem Spacing
- **Tablet (768-1024px):** Reduzierte Abstände
- **Mobile (<768px):** Stapelbare Eingabefelder, vertikales Layout

---

## 🚀 Implementierungs-Roadmap

### Phase 1: Basis-Struktur ✅
- [x] Types in `types.ts` hinzufügen
- [x] `WorkScheduleEditor` Komponente erstellen
- [x] `DayCard` Sub-Komponente implementieren
- [x] Helper-Funktion `calculateDayHours` entwickeln

### Phase 2: Integration ✅
- [x] SettingsModal anpassen (General Tab)
- [x] Default-Wochenplan-Generator implementieren
- [x] CSS-Styles in `App.css` hinzufügen
- [x] Testen der Benutzerinteraktionen

### Phase 3: Persistenz 📝
- [ ] Datenbank-Service erweitern (`db.ts`)
- [ ] `weekSchedule` in Settings speichern
- [ ] Migration von alten `workStart/workEnd` Werten
- [ ] Datenbank-Schema aktualisieren

### Phase 4: Refactoring ✅
- [x] Settings-Tabs in separate Dateien auslagern (`GeneralTab.tsx`, `ProjectsTab.tsx`, etc.)
- [x] Gemeinsame Types/Utils extrahieren
- [ ] Unit Tests schreiben
- [ ] Integration Tests durchführen

---

## 🧪 Testing

### Unit Tests

```typescript
describe('calculateDayHours', () => {
  it('should calculate single block correctly', () => {
    const day: DaySchedule = {
      dayName: 'Montag',
      dayShort: 'Mo',
      isWorkday: true,
      blocks: [{ id: '1', start: '08:00', end: '17:00' }],
      totalHours: 0
    };
    
    const result = calculateDayHours(day);
    expect(result.totalHours).toBe(9);
  });

  it('should handle multiple blocks', () => {
    const day: DaySchedule = {
      dayName: 'Montag',
      dayShort: 'Mo',
      isWorkday: true,
      blocks: [
        { id: '1', start: '08:00', end: '12:00' },
        { id: '2', start: '13:00', end: '17:00' }
      ],
      totalHours: 0
    };
    
    const result = calculateDayHours(day);
    expect(result.totalHours).toBe(8);
  });

  it('should return 0 hours for non-workday', () => {
    const day: DaySchedule = {
      dayName: 'Samstag',
      dayShort: 'Sa',
      isWorkday: false,
      blocks: [],
      totalHours: 0
    };
    
    const result = calculateDayHours(day);
    expect(result.totalHours).toBe(0);
  });
});
```

### Integrations-Tests

```typescript
describe('WorkScheduleEditor Integration', () => {
  it('should add new time block when plus button is clicked', () => {
    // Test implementation
  });

  it('should remove time block when trash icon is clicked', () => {
    // Test implementation
  });

  it('should update total hours when time is changed', () => {
    // Test implementation
  });
});
```

---

## 📝 Best Practices

### Performance-Optimierung

```typescript
// ✅ Nutze useCallback für Event-Handler
const addBlock = useCallback((dayIndex: number) => {
  // Implementation
}, [weekSchedule, onChange]);

// ✅ Nutze useMemo für berechnete Werte
const totalWeekHours = useMemo(() => 
  weekSchedule.reduce((sum, d) => sum + d.totalHours, 0)
, [weekSchedule]);

// ✅ Vermeide unnötige Re-Renders durch React.memo
export const DayCard = React.memo<DayCardProps>(({ day, dayIndex, ... }) => {
  // Component implementation
});
```

### Code-Qualität

- ✅ Verwende TypeScript für Type-Safety
- ✅ Schreibe aussagekräftige Kommentare für komplexe Logik
- ✅ Halte Komponenten unter 300 Zeilen
- ✅ Folge dem Single-Responsibility-Prinzip
- ✅ Verwende konstante Werte statt Magic Numbers
- ✅ Implementiere Error Boundaries für Fehlerbehandlung

### Accessibility (A11y)

```typescript
// ✅ Semantisches HTML
<button aria-label="Zeitblock hinzufügen" onClick={addBlock}>
  <FaPlus />
</button>

// ✅ Keyboard-Navigation
<input
  type="time"
  onKeyDown={(e) => {
    if (e.key === 'Enter') handleSave();
  }}
/>

// ✅ Screen Reader Support
<label htmlFor="monday-start-time">Montag Startzeit</label>
<input id="monday-start-time" type="time" />

// ✅ Ausreichende Kontraste (WCAG AA Standard)
// Textfarbe #2c3e50 auf Weiß = 12.63:1 (✅ AAA)
```

---

## 🐛 Troubleshooting

### Problem: Zeitblöcke überschneiden sich
**Symptom:** Benutzer kann 08:00-12:00 und 10:00-14:00 am selben Tag eintragen  
**Lösung:** Implementiere Validierung in `updateBlock`:

```typescript
const validateTimeBlocks = (blocks: WorkTimeBlock[]): boolean => {
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const block1 = blocks[i];
      const block2 = blocks[j];
      
      const start1 = timeToMinutes(block1.start);
      const end1 = timeToMinutes(block1.end);
      const start2 = timeToMinutes(block2.start);
      const end2 = timeToMinutes(block2.end);
      
      if (start1 < end2 && start2 < end1) {
        alert('Zeitblöcke dürfen sich nicht überschneiden!');
        return false;
      }
    }
  }
  return true;
};
```

### Problem: Negative Stunden berechnet
**Symptom:** Endzeit vor Startzeit zeigt negative Stunden  
**Lösung:** Validiere in `calculateDayHours`:

```typescript
const startMins = startH * 60 + startM;
const endMins = endH * 60 + endM;

if (endMins <= startMins) {
  console.warn(`Invalid time block: ${block.start} - ${block.end}`);
  continue; // Skip this block
}

totalMinutes += Math.max(0, endMins - startMins);
```

### Problem: Performance-Probleme bei vielen Blöcken
**Symptom:** UI wird langsam bei mehr als 20 Zeitblöcken pro Woche  
**Lösung:** Implementiere Virtualisierung mit `react-window`:

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={weekSchedule.length}
  itemSize={150}
>
  {({ index, style }) => (
    <div style={style}>
      <DayCard day={weekSchedule[index]} />
    </div>
  )}
</FixedSizeList>
```

---

## 📚 Code-Beispiele

### Vollständige WorkScheduleEditor.tsx

Siehe separate Datei: `WorkScheduleEditor.tsx` (zu groß für README)

### CSS-Styles (`App.css`)

```css
.input-time {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.95rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  transition: all 0.2s;
}

.input-time:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.settings-h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e2e8f0;
}
```

---

## 🔗 Weiterführende Links

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tauri Documentation](https://tauri.app/)
- [FullCalendar API](https://fullcalendar.io/)

---

## 📄 Lizenz

MIT License - Copyright (c) 2025 Sandro Ballarini

---

## 👥 Mitwirkende

- **Sandro Ballarini** - Initial work & Maintenance
- **Community Contributors** - Feature Requests & Bug Reports

---

## 📞 Support

Bei Fragen oder Problemen:
1. Erstelle ein Issue auf GitHub
2. Kontaktiere den Entwickler
3. Prüfe die Troubleshooting-Sektion

---

**Entwickelt mit ❤️ für ClockworkHero**

*Last updated: Dezember 2025*
