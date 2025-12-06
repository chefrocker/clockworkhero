import React, { useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventRenderer } from './EventRenderer';

interface Props {
  events: any[];
  isEditMode: boolean;
  viewMode: 'day' | 'week';
  onDateSelect: (info: any) => void;
  onEventClick: (info: any) => void;
  onDeleteSession: (id: string) => void;
  onEventDrop: (info: any) => void; // NEU: Drag & Drop Handler
  onEventResize: (info: any) => void; // NEU: Resize Handler
}

export const CalendarEngine: React.FC<Props> = ({ events, isEditMode, viewMode, onDateSelect, onEventClick, onDeleteSession, onEventDrop, onEventResize }) => {
  const calendarRef = useRef<FullCalendar>(null);

  useEffect(() => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      if (viewMode === 'day') api.changeView('timeGridDay');
      else api.changeView('timeGridWeek');
    }
  }, [viewMode]);

  return (
    <FullCalendar
      ref={calendarRef}
      plugins={[ dayGridPlugin, timeGridPlugin, interactionPlugin ]}
      initialView="timeGridDay"
      headerToolbar={false}
      locale="de"
      events={events}
      nowIndicator={true}
      scrollTime="08:00:00"
      height="100%"
      
      // INTERAKTION
      selectable={isEditMode}
      select={onDateSelect}
      eventClick={onEventClick}
      
      // EDITIERBARKEIT (Nur Sessions!)
      editable={true} // Generell an, aber wir filtern unten
      eventStartEditable={isEditMode} // Verschieben nur im Edit Mode
      eventDurationEditable={isEditMode} // Resizen nur im Edit Mode
      
      // Verhindern, dass Auto-Events bewegt werden
      eventAllow={(dropInfo, draggedEvent) => {
          return draggedEvent.extendedProps.type === 'manual';
      }}

      // Handler für Änderungen
      eventDrop={onEventDrop}
      eventResize={onEventResize}
      
      // LAYOUT
      eventOrder={["extendedProps.order", "start"]} 
      slotEventOverlap={true}
      slotDuration="00:15:00" 
      slotLabelInterval="00:15"
      slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false, meridiem: false }}
      allDaySlot={false}
      
      eventContent={(info) => <EventRenderer eventInfo={info} onDeleteSession={onDeleteSession} />}
    />
  );
};
