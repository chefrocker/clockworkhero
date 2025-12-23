import React, { useRef, useEffect, useState, useLayoutEffect, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import deLocale from '@fullcalendar/core/locales/de';
import { renderEventContent } from './EventRenderer';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { DaySchedule } from '../types';

interface Props {
  events: any[];
  isEditMode: boolean; // true = InputMode, false = ActivityCards
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
  weekSchedule?: DaySchedule[];
}

// HELPER: Kollisionserkennung
const processEventsForOverlaps = (rawEvents: any[]) => {
    // Deep Copy um Mutation zu vermeiden
    const events = rawEvents.map(e => ({ ...e, extendedProps: { ...e.extendedProps } }));

    const manualEvents = events.filter(e => e.extendedProps.type === 'manual');
    const autoEvents = events.filter(e => e.extendedProps.type === 'auto');

    autoEvents.forEach(auto => {
        const autoStart = auto.start instanceof Date ? auto.start.getTime() : new Date(auto.start).getTime();
        const autoEnd = auto.end instanceof Date ? auto.end.getTime() : new Date(auto.end).getTime();

        // Check: Kollidiert dieses Auto-Event mit IRGENDEINEM manuellen Event?
        const hasOverlap = manualEvents.some(manual => {
            const manualStart = manual.start instanceof Date ? manual.start.getTime() : new Date(manual.start).getTime();
            const manualEnd = manual.end instanceof Date ? manual.end.getTime() : new Date(manual.end).getTime();
            
            // Kollisionsformel: (StartA < EndB) && (EndA > StartB)
            return (autoStart < manualEnd && autoEnd > manualStart);
        });

        // Flag setzen
        auto.extendedProps.isCollapsed = hasOverlap;
    });

    return [...manualEvents, ...autoEvents];
};

export const CalendarEngine: React.FC<Props> = ({ 
    events, isEditMode, viewMode, 
    onDateSelect, onEventClick, onDeleteSession, onEventDrop, onEventResize, 
    workStart, workEnd, scrollTime, hiddenDays, weekSchedule 
}) => {
  
  const calendarRef = useRef<FullCalendar>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [slotHeight, setSlotHeight] = useState(60);
  const scrollPosRef = useRef<number>(0);

  // 1. Events verarbeiten (Memoizen für Performance)
  const processedEvents = useMemo(() => {
      return processEventsForOverlaps(events);
  }, [events]);

  // Scroll Position Logic
  useEffect(() => {
      const scrollContainer = containerRef.current?.querySelector('.fc-scroller-liquid-absolute');
      if (!scrollContainer) return;
      const handleScroll = () => { scrollPosRef.current = scrollContainer.scrollTop; };
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [viewMode]);

  useLayoutEffect(() => {
      const scrollContainer = containerRef.current?.querySelector('.fc-scroller-liquid-absolute');
      if (scrollContainer && scrollPosRef.current > 0) {
          scrollContainer.scrollTop = scrollPosRef.current;
      }
  }, [processedEvents, slotHeight]);

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

  // Zoom Logic
  useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const handleWheel = (e: WheelEvent) => {
          if (e.ctrlKey) {
              e.preventDefault();
              const scrollContainer = container.querySelector('.fc-scroller-liquid-absolute');
              if (!scrollContainer) return;
              const oldHeight = slotHeight;
              const delta = e.deltaY > 0 ? -5 : 5;
              const newHeight = Math.min(Math.max(oldHeight + delta, 20), 200);
              
              if (newHeight !== oldHeight) {
                  const rect = scrollContainer.getBoundingClientRect();
                  const mouseY = e.clientY - rect.top;
                  const absoluteY = scrollContainer.scrollTop + mouseY;
                  const ratio = absoluteY / oldHeight;
                  const newScrollTop = (ratio * newHeight) - mouseY;
                  setSlotHeight(newHeight);
                  scrollPosRef.current = newScrollTop;
                  scrollContainer.scrollTop = newScrollTop;
              }
          }
      };
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
  }, [slotHeight]);

  const handlePrev = () => calendarRef.current?.getApi().prev();
  const handleNext = () => calendarRef.current?.getApi().next();
  const handleToday = () => calendarRef.current?.getApi().today();

  const getBusinessHours = () => {
      if (!weekSchedule || weekSchedule.length === 0) {
          return { daysOfWeek: [1, 2, 3, 4, 5], startTime: workStart || '08:00', endTime: workEnd || '17:00' };
      }
      const hours: { daysOfWeek: number[]; startTime: string; endTime: string; }[] = [];
      weekSchedule.forEach((day, idx) => {
          if (day.isWorkday && day.blocks) {
              const fcDayIndex = (idx + 1) % 7;
              day.blocks.forEach(block => {
                  hours.push({ daysOfWeek: [fcDayIndex], startTime: block.start, endTime: block.end });
              });
          }
      });
      return hours;
  };

  return (
    <div ref={containerRef} style={{ height: '100%', display: 'flex', flexDirection: 'column', 
        // @ts-ignore
        '--slot-height': `${slotHeight}px` 
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', background: 'var(--panel-bg)', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{display: 'flex', gap: '10px'}}>
                <button onClick={handlePrev} style={navBtnStyle}><FaChevronLeft /></button>
                <button onClick={handleToday} style={{...navBtnStyle, fontWeight: 'bold', padding: '6px 12px'}}>Heute</button>
                <button onClick={handleNext} style={navBtnStyle}><FaChevronRight /></button>
            </div>
            <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Zoom: {Math.round((slotHeight / 60) * 100)}% (Ctrl + Mausrad)</div>
        </div>

        <div style={{flex: 1, overflow: 'hidden'}}>
            <FullCalendar
                ref={calendarRef}
                plugins={[timeGridPlugin, interactionPlugin]}
                initialView={viewMode === 'week' ? 'timeGridWeek' : 'timeGridDay'}
                locale={deLocale}
                headerToolbar={false} 
                events={processedEvents} // <-- Hier die verarbeiteten Events nutzen
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
                
                // WICHTIG: Erlaubt Überlappung, damit Manual über Auto liegen kann
                slotEventOverlap={true}
                eventOrder={["order", "start", "-duration", "allDay", "title"]} // Manual hat order 1, Auto order 2 -> Manual zuerst rendern? Nein, Z-Index regelt das.
                
                hiddenDays={hiddenDays || []}
                businessHours={getBusinessHours()}
                
                height="100%"
                slotDuration="00:15:00"
                slotLabelInterval="01:00"
                eventContent={(info) => renderEventContent(info, onDeleteSession)}
                select={onDateSelect}
                eventClick={onEventClick}
                eventDrop={onEventDrop}
                eventResize={onEventResize}
                eventClassNames={(arg) => {
                    const classes = arg.event.extendedProps.type === 'auto' ? ['auto-event'] : ['manual-event'];
                    if (isEditMode) classes.push('mode-input'); 
                    return classes;
                }}
            />
        </div>
    </div>
  );
};

const navBtnStyle: React.CSSProperties = {
    background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '6px',
    padding: '8px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow)'
};
