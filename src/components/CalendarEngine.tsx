import React, { useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import deLocale from '@fullcalendar/core/locales/de';
import { renderEventContent } from './EventRenderer';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { DaySchedule } from '../types';

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
  hiddenDays?: number[];
  weekSchedule?: DaySchedule[]; // NEU
}

export const CalendarEngine: React.FC<Props> = ({ 
    events, isEditMode, viewMode, 
    onDateSelect, onEventClick, onDeleteSession, onEventDrop, onEventResize, 
    workStart, workEnd, scrollTime, hiddenDays, weekSchedule 
}) => {
  
  const calendarRef = useRef<FullCalendar>(null);

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

  // Generiere Business Hours aus WeekSchedule
  const getBusinessHours = () => {
      if (!weekSchedule || weekSchedule.length === 0) {
          // Fallback auf alte Settings
          return {
              daysOfWeek: [1, 2, 3, 4, 5],
              startTime: workStart || '08:00',
              endTime: workEnd || '17:00',
          };
      }

      const hours = [];
      // FullCalendar: 0=Sun, 1=Mon...
      // Unser Array: 0=Mon, 1=Tue... 6=Sun
      weekSchedule.forEach((day, idx) => {
          if (day.isWorkday && day.blocks) {
              // Mapping: Unser Index (0=Mon) -> FullCalendar (1=Mon)
              // 0->1, 1->2, ..., 5->6, 6->0
              const fcDayIndex = (idx + 1) % 7;
              
              day.blocks.forEach(block => {
                  hours.push({
                      daysOfWeek: [fcDayIndex],
                      startTime: block.start,
                      endTime: block.end
                  });
              });
          }
      });
      return hours;
  };

  return (
    <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
        
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
            padding: '10px 20px', background: 'var(--panel-bg)', borderBottom: '1px solid var(--border-color)'
        }}>
            <div style={{display: 'flex', gap: '10px'}}>
                <button onClick={handlePrev} style={navBtnStyle}><FaChevronLeft /></button>
                <button onClick={handleToday} style={{...navBtnStyle, fontWeight: 'bold', padding: '6px 12px'}}>Heute</button>
                <button onClick={handleNext} style={navBtnStyle}><FaChevronRight /></button>
            </div>
        </div>

        <div style={{flex: 1, overflow: 'hidden'}}>
            <FullCalendar
                ref={calendarRef}
                plugins={[timeGridPlugin, interactionPlugin]}
                initialView={viewMode === 'week' ? 'timeGridWeek' : 'timeGridDay'}
                locale={deLocale}
                headerToolbar={false} 
                events={events}
                editable={true}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={true}
                weekends={true}
                nowIndicator={true}
                
                scrollTime={scrollTime}
                slotMinTime="00:00:00"
                slotMaxTime="24:00:00"
                allDaySlot={false}
                
                hiddenDays={hiddenDays || []}
                businessHours={getBusinessHours()} // NEU: Dynamisch
                
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
    background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '6px',
    padding: '8px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: 'var(--shadow)'
};
