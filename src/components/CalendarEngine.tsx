import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventRenderer } from './EventRenderer';

interface Props {
  events: any[];
  isEditMode: boolean;
  onDateSelect: (info: any) => void;
  onDeleteSession: (id: string) => void;
}

export const CalendarEngine: React.FC<Props> = ({ events, isEditMode, onDateSelect, onDeleteSession }) => {
  return (
    <FullCalendar
      plugins={[ dayGridPlugin, timeGridPlugin, interactionPlugin ]}
      initialView="timeGridDay"
      headerToolbar={false}
      locale="de"
      events={events}
      nowIndicator={true}
      scrollTime="08:00:00"
      height="100%"
      
      // Interaktion
      selectable={isEditMode} // Nur im Edit Mode markieren
      select={onDateSelect}
      editable={false} // Drag & Drop von Events erstmal aus für Stabilität
      
      // Layering
      eventOrder="type" // 'manual' kommt alphabetisch nach 'auto', liegt also oben
      slotEventOverlap={true}
      
      // Optik
      slotDuration="00:15:00" 
      slotLabelInterval="00:15"
      slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false, meridiem: false }}
      allDaySlot={false}
      
      // Custom Rendering
      eventContent={(info) => <EventRenderer eventInfo={info} onDeleteSession={onDeleteSession} />}
    />
  );
};
