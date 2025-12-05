import React, { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import Database from '@tauri-apps/plugin-sql'; 
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import './App.css';

function App() {
  const [currentWindow, setCurrentWindow] = useState("Warte auf Tracking...");
  const [dbStatus, setDbStatus] = useState("Datenbank wird geladen..."); // Neuer Status für UI
  const [db, setDb] = useState<Database | null>(null);
  const lastSavedTitle = useRef<string>("");

  // 1. Datenbank verbinden
  useEffect(() => {
    async function initDb() {
      try {
        console.log("DEBUG: Starte Datenbank-Verbindung...");
        
        // Schritt 1: Laden
        const database = await Database.load("sqlite:tracker.db");
        console.log("DEBUG: Database.load erfolgreich!");

        // Schritt 2: Tabelle erstellen
        console.log("DEBUG: Erstelle Tabelle...");
        await database.execute(
          `CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            title TEXT, 
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`
        );
        console.log("DEBUG: Tabelle 'logs' existiert oder wurde erstellt.");
        
        setDb(database);
        setDbStatus("Datenbank: Verbunden ✅");
      } catch (e) {
        console.error("DEBUG ERROR (Init):", e);
        setDbStatus("Datenbank: FEHLER ❌ (Siehe Konsole)");
      }
    }
    initDb();
  }, []);

  // 2. Tracking & Speichern
  useEffect(() => {
    const unlistenPromise = listen('active-window-change', async (event) => {
      const newTitle = event.payload as string;
      setCurrentWindow(newTitle);

      if (db && newTitle !== lastSavedTitle.current && newTitle !== "Unbekannt") {
        try {
          console.log(`DEBUG: Versuche zu speichern: "${newTitle}"`);
          
          // Schritt 3: Insert
          const result = await db.execute(
            "INSERT INTO logs (title) VALUES ($1)", 
            [newTitle]
          );
          
          console.log("DEBUG: Gespeichert! Result:", result);
          lastSavedTitle.current = newTitle;
        } catch (e) {
          console.error("DEBUG ERROR (Insert):", e);
        }
      }
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, [db]);

  const handleDateClick = (arg: any) => {
    console.log('Datum angeklickt: ' + arg.dateStr);
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Statusleiste */}
      <div style={{ 
        background: '#2c3e50', 
        color: 'white', 
        padding: '10px', 
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'monospace',
        borderBottom: '2px solid #34495e'
      }}>
        <span>Fenster: <b>{currentWindow}</b></span>
        <span>{dbStatus}</span>
      </div>

      <div style={{ flex: 1, padding: '10px', boxSizing: 'border-box', overflow: 'hidden' }}>
        <FullCalendar
          plugins={[ dayGridPlugin, timeGridPlugin, interactionPlugin ]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          locale="de"
          firstDay={1}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          selectable={true}
          dateClick={handleDateClick}
          height="100%"
        />
      </div>
    </div>
  );
}

export default App;
