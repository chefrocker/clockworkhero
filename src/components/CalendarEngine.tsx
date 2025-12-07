import React, { useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import deLocale from '@fullcalendar/core/locales/de';
import { renderEventContent } from './EventRenderer';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface Props {
  events: any[];
  isEditMode: boolean;
  viewMode: 'day' | 'week';
  onDateSelect: (info: any) => void;
  onEventClick: (info: any) => void;
  onDeleteSession: (id: string) => void;
  onEventDrop: (info: any) => void;
  onEventResize: (info: any) => void;
  workStart: string;
  workEnd: string;
  scrollTime: string;
}

export const CalendarEngine: React.FC<Props> = ({ 
    events, isEditMode, viewMode, 
    onDateSelect, onEventClick, onDeleteSession, onEventDrop, onEventResize, 
    workStart, workEnd, scrollTime 
}) => {
  
  const calendarRef = useRef<FullCalendar>(null);

  // View Mode umschalten
  useEffect(() => {
    const timer = setTimeout(() => {
        if (calendarRef.current) {
            const api = calendarRef.current.getApi();
            const newView = viewMode === 'week' ? 'timeGridWeek' : 'timeGridDay';
            if (api.view.type !== newView) api.changeView(newView);
        }
    }, 0);
    return () => clearTimeout(timer);
  }, [viewMode]);

  const handlePrev = () => calendarRef.current?.getApi().prev();
  const handleNext = () => calendarRef.current?.getApi().next();
  const handleToday = () => calendarRef.current?.getApi().today();

  // Berechne Scroll-Startzeit (1 Stunde vor Arbeitsbeginn)
  const getScrollTime = () => {
      if (!workStart) return "07:00:00";
      const [h, m] = workStart.split(':').map(Number);
      const newH = Math.max(0, h - 1);
      return `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
  };

  return (
    <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
        
        {/* NAVIGATION */}
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
            padding: '10px 20px', background: 'white', borderBottom: '1px solid #e2e8f0'
        }}>
            <div style={{display: 'flex', gap: '10px'}}>
                <button onClick={handlePrev} style={navBtnStyle}><FaChevronLeft /></button>
                <button onClick={handleToday} style={{...navBtnStyle, fontWeight: 'bold', padding: '6px 12px'}}>Heute</button>
                <button onClick={handleNext} style={navBtnStyle}><FaChevronRight /></button>
            </div>
            <div style={{fontWeight: 'bold', color: '#64748b'}}>
                {/* Titel wird im Kalender angezeigt */}
            </div>
        </div>

        <div style={{flex: 1, overflow: 'hidden'}}>
            <FullCalendar
                ref={calendarRef}
                plugins={[timeGridPlugin, interactionPlugin]}
                initialView={viewMode === 'week' ? 'timeGridWeek' : 'timeGridDay'}
                locale={deLocale}
                headerToolbar={{ left: 'title', center: '', right: '' }}
                events={events}
                editable={true}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={true}
                weekends={true}
                nowIndicator={true}
                
                // ARBEITSZEITEN LOGIK
                scrollTime={getScrollTime()} // Startet Ansicht bei Arbeitsbeginn (gescrollt)
                slotMinTime="00:00:00" // FIX: Erlaubt Zeiten ab Mitternacht
                slotMaxTime="24:00:00" // Bis Mitternacht
                allDaySlot={false}
                
                // Business Hours (Gelb markiert via CSS)
                businessHours={{
                    daysOfWeek: [1, 2, 3, 4, 5], // Mo - Fr
                    startTime: workStart || '08:00',
                    endTime: workEnd || '17:00',
                }}
                
                height="100%"
                slotDuration="00:15:00"
                slotLabelInterval="01:00"
                eventContent={(info) => renderEventContent(info, onDeleteSession)}
                select={onDateSelect}
                eventClick={onEventClick}
                eventDrop={onEventDrop}
                eventResize={onEventResize}
                eventClassNames={(arg) => arg.event.extendedProps.type === 'auto' ? ['auto-event'] : ['manual-event']}
            />
        </div>
    </div>
  );
};

const navBtnStyle: React.CSSProperties = {
    background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px',
    padding: '8px', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
};
