import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid'; // Für Monatsansicht
import timeGridPlugin from '@fullcalendar/timegrid'; // Für Wochen/Tagesansicht (Wichtig!)
import interactionPlugin from '@fullcalendar/interaction'; // Für Klicks & Drag-and-Drop
import './App.css';

function App() {

  // Diese Funktion wird gefeuert, wenn du in den Kalender klickst
  const handleDateClick = (arg: any) => {
    // Später öffnen wir hier ein Fenster zum Eintragen
    console.log('Datum angeklickt: ' + arg.dateStr);
    alert('Du hast auf ' + arg.dateStr + ' geklickt!');
  }

  return (
    <div style={{ height: '100vh', padding: '10px', boxSizing: 'border-box' }}>
      <FullCalendar
        plugins={[ dayGridPlugin, timeGridPlugin, interactionPlugin ]}
        
        // Start-Ansicht: Wochenansicht mit Uhrzeiten
        initialView="timeGridWeek"
        
        // Kopfzeile konfigurieren
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}

        // Einstellungen für Deutschland/Schweiz
        locale="de"
        firstDay={1} // Woche startet am Montag
        slotMinTime="06:00:00" // Kalender startet visuell um 6 Uhr morgens
        slotMaxTime="22:00:00" // Geht bis 22 Uhr
        allDaySlot={false} // Zeile für ganztägige Termine ausblenden (optional)
        
        // Interaktion aktivieren
        selectable={true}
        dateClick={handleDateClick}
        
        // Wichtig damit er die Höhe füllt
        height="100%"
      />
    </div>
  );
}

export default App;
