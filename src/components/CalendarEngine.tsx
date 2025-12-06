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
  onEventDrop: (info: any) => void;
  onEventResize: (info: any) => void;
  scrollTime?: string;
}

export const CalendarEngine: React.FC<Props> = ({ 
    events, isEditMode, viewMode, onDateSelect, onEventClick, 
    onDeleteSession, onEventDrop, onEventResize,
    scrollTime = "08:00:00"
}) => {
  const calendarRef = useRef<FullCalendar>(null);

  // FIX: Wir nutzen setTimeout, um den "flushSync" Fehler zu verhindern.
  // Das stellt sicher, dass changeView erst ausgeführt wird, WENN React fertig gerendert hat.
  useEffect(() => {
    const timer = setTimeout(() => {
        if (calendarRef.current) {
            const api = calendarRef.current.getApi();
            if (viewMode === 'day') {
                api.changeView('timeGridDay');
            } else {
                api.changeView('timeGridWeek');
            }
        }
    }, 0); // 0ms Verzögerung reicht, um aus dem Render-Zyklus auszubrechen

    return () => clearTimeout(timer);
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
      scrollTime={scrollTime}
      height="100%"
      
      selectable={isEditMode}
      select={onDateSelect}
      eventClick={onEventClick}
      
      editable={true}
      eventStartEditable={isEditMode}
      eventDurationEditable={isEditMode}
      
      eventAllow={(dropInfo, draggedEvent) => {
          return draggedEvent.extendedProps.type === 'manual';
      }}

      eventDrop={onEventDrop}
      eventResize={onEventResize}
      
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
