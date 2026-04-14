import React, {
    useRef, useEffect, useState, useLayoutEffect, useMemo, useCallback,
    forwardRef, useImperativeHandle
} from 'react';

// Öffentliche Methoden die App.tsx per ref aufrufen kann
export interface CalendarHandle {
    prev:  () => void;
    next:  () => void;
    today: () => void;
}
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import deLocale from '@fullcalendar/core/locales/de';
import { renderEventContent } from './EventRenderer';
import { ActivityOverlay, ColumnInfo } from './ActivityOverlay';
import { FaChevronLeft, FaChevronRight, FaCalendarAlt } from 'react-icons/fa';
import { DaySchedule } from '../types';

/**
 * CalendarEngine – Architektur
 *
 * FullCalendar rendert nur manuelle Sessions.
 * ActivityOverlay ist ein Sibling-Layer (kein Portal) mit Scroll-Sync.
 *
 * Scroll-Probleme behoben:
 *  - scrollTimeReset={false}: FC springt NICHT beim Navigieren zurück zu
 *    "scrollTime". Der Nutzer behält seine manuell gescrollte Position.
 *  - scrollTime wird nur einmalig beim ersten Mount angewendet.
 *  - Bei Daten-Refresh wird die gespeicherte Scroll-Position wiederhergestellt.
 *
 * Icon-Clipping behoben:
 *  - ActivityOverlay ist ein Sibling, kein Portal in FC-Internals.
 *  - Kein overflow:hidden vom FC-Scroller schneidet Icons ab.
 *  - Scroll-Sync: scrollTop des FC-Scrollers wird an ActivityOverlay weitergegeben.
 *
 * Overlap-Algorithmus:
 *  - Zeitraumbasiert (greedy interval scheduling) statt nur Startzeit-Bucket.
 */

interface Props {
    events:          any[];
    isEditMode:      boolean;     // true = Task-Modus, false = Activity-Modus
    viewMode:        'day' | 'week';
    onDateSelect:    (info: any) => void;
    onEventClick:    (info: any) => void;
    onDeleteSession: (id: string) => void;
    onEventDrop:     (info: any) => void;
    onEventResize:   (info: any) => void;
    workStart:       string;
    workEnd:         string;
    scrollTime:      string;
    hiddenDays?:     number[];
    weekSchedule?:   DaySchedule[];
}

// ─── Zeitraumbasierter Overlap-Algorithmus ────────────────────────────────────
const processEventsForOverlaps = (rawEvents: any[]): any[] => {
    const events = rawEvents.map(e => ({
        ...e,
        extendedProps: { ...e.extendedProps },
    }));

    const manualEvents = events.filter(e => e.extendedProps.type === 'manual');
    const autoEvents   = events.filter(e => e.extendedProps.type === 'auto');

    autoEvents.sort((a, b) => {
        const diff = new Date(a.start).getTime() - new Date(b.start).getTime();
        return diff !== 0 ? diff : (a.title ?? '').localeCompare(b.title ?? '');
    });

    // Greedy Interval Scheduling: jeder Rank = eine kollisionsfreie Spalte
    const columnEnds: number[] = [];

    autoEvents.forEach(event => {
        const startMs = new Date(event.start).getTime();
        const endMs   = event.end
            ? new Date(event.end).getTime()
            : startMs + 15 * 60 * 1000;

        let rank = columnEnds.findIndex(endTime => endTime <= startMs);

        if (rank === -1) {
            rank = columnEnds.length;
            columnEnds.push(endMs);
        } else {
            columnEnds[rank] = endMs;
        }

        event.extendedProps.slotRank    = rank;
        event.extendedProps.isCollapsed = false;
    });

    return [...manualEvents, ...autoEvents];
};

// ─── Komponente ──────────────────────────────────────────────────────────────
export const CalendarEngine = forwardRef<CalendarHandle, Props>(({
    events, isEditMode, viewMode,
    onDateSelect, onEventClick, onDeleteSession, onEventDrop, onEventResize,
    workStart, workEnd, scrollTime, hiddenDays, weekSchedule,
}, ref) => {
    const calendarRef  = useRef<FullCalendar>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    // Wrapper-Div für FullCalendar + ActivityOverlay (position: relative)
    const fcWrapperRef = useRef<HTMLDivElement>(null);

    // Methoden für App.tsx (Keyboard Shortcuts)
    useImperativeHandle(ref, () => ({
        prev:  () => calendarRef.current?.getApi().prev(),
        next:  () => calendarRef.current?.getApi().next(),
        today: () => calendarRef.current?.getApi().today(),
    }));

    const [slotHeight,     setSlotHeight]     = useState(60);
    const [colWidth,       setColWidth]       = useState(200);
    const [columnOffsets,  setColumnOffsets]  = useState<Map<string, ColumnInfo>>(new Map());
    const [gridTopOffset,  setGridTopOffset]  = useState(0);
    const [calScrollTop,   setCalScrollTop]   = useState(0);

    // scrollTime nur einmalig beim ersten Mount
    const [fcScrollTime, setFcScrollTime] = useState<string | undefined>(scrollTime);
    useEffect(() => {
        const t = setTimeout(() => setFcScrollTime(undefined), 1500);
        return () => clearTimeout(t);
    }, []);

    const scrollPosRef = useRef<number>(0);

    // ── Events aufteilen ─────────────────────────────────────────────────────
    const processedEvents = useMemo(
        () => processEventsForOverlaps(events),
        [events]
    );
    const manualEvents = useMemo(
        () => processedEvents.filter(e => e.extendedProps.type === 'manual'),
        [processedEvents]
    );
    const autoEvents = useMemo(
        () => processedEvents.filter(e => e.extendedProps.type === 'auto'),
        [processedEvents]
    );

    // ── Scroll-Synchronisation ────────────────────────────────────────────────
    // FC-Scroller-Scroll-Events abhören und in State schreiben
    useEffect(() => {
        const wrapper = fcWrapperRef.current;
        if (!wrapper) return;

        // Warte kurz, bis FC gerendert hat
        const attach = () => {
            const scroller = wrapper.querySelector<HTMLElement>('.fc-scroller-liquid-absolute');
            if (!scroller) return false;

            const onScroll = () => {
                const st = scroller.scrollTop;
                setCalScrollTop(st);
                if (st > 0) scrollPosRef.current = st;
            };

            scroller.addEventListener('scroll', onScroll, { passive: true });
            // Initialen Scroll-Wert setzen
            setCalScrollTop(scroller.scrollTop);

            return () => scroller.removeEventListener('scroll', onScroll);
        };

        let cleanup: (() => void) | undefined;
        let result = attach();
        if (!result) {
            // Retry wenn FC noch nicht gerendert
            const t1 = setTimeout(() => { cleanup = attach() || undefined; }, 200);
            const t2 = setTimeout(() => { if (!cleanup) cleanup = attach() || undefined; }, 600);
            return () => { clearTimeout(t1); clearTimeout(t2); cleanup?.(); };
        }
        return result;
    }, [viewMode]);

    // Scroll-Position bei Event/Zoom-Änderungen wiederherstellen
    useLayoutEffect(() => {
        if (scrollPosRef.current <= 0) return;
        const scroller = fcWrapperRef.current?.querySelector<HTMLElement>('.fc-scroller-liquid-absolute');
        if (!scroller) return;
        requestAnimationFrame(() => {
            scroller.scrollTop = scrollPosRef.current;
            setCalScrollTop(scrollPosRef.current);
        });
    }, [processedEvents, slotHeight]);

    // ── Spalten & Header messen ───────────────────────────────────────────────
    const measureLayout = useCallback(() => {
        const wrapper = fcWrapperRef.current;
        if (!wrapper) return;

        // Spalten-Offsets (relativ zum fc-Wrapper)
        const cols = wrapper.querySelectorAll<HTMLElement>('.fc-timegrid-col[data-date]');
        if (cols.length > 0) {
            const wRect   = wrapper.getBoundingClientRect();
            const offsets = new Map<string, ColumnInfo>();
            cols.forEach(col => {
                const date = col.getAttribute('data-date');
                if (date) {
                    const rect = col.getBoundingClientRect();
                    offsets.set(date, {
                        left:  rect.left  - wRect.left,
                        width: rect.width,
                    });
                }
            });
            if (offsets.size > 0) setColumnOffsets(offsets);
        }

        // Grid-Top-Offset (Höhe des FC-Spaltenheaders)
        const header = wrapper.querySelector<HTMLElement>('.fc-col-header');
        if (header) {
            const wRect = wrapper.getBoundingClientRect();
            setGridTopOffset(header.getBoundingClientRect().bottom - wRect.top);
        }

        // colWidth für EventRenderer
        const firstCol = wrapper.querySelector<HTMLElement>('.fc-timegrid-col');
        if (firstCol && firstCol.clientWidth > 20) {
            setColWidth(firstCol.clientWidth);
        }
    }, []);

    const hiddenDaysKey = (hiddenDays ?? []).join(',');

    useLayoutEffect(() => {
        measureLayout();
        const t1 = setTimeout(measureLayout, 120);
        const t2 = setTimeout(measureLayout, 500);

        const observer = new ResizeObserver(measureLayout);
        if (fcWrapperRef.current) observer.observe(fcWrapperRef.current);
        window.addEventListener('resize', measureLayout);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            observer.disconnect();
            window.removeEventListener('resize', measureLayout);
        };
    }, [viewMode, hiddenDaysKey, measureLayout]);

    useEffect(() => {
        calendarRef.current?.getApi().updateSize();
    }, [colWidth]);

    // ── View-Wechsel ──────────────────────────────────────────────────────────
    useEffect(() => {
        const t = setTimeout(() => {
            const api     = calendarRef.current?.getApi();
            const newView = viewMode === 'week' ? 'timeGridWeek' : 'timeGridDay';
            if (api && api.view.type !== newView) api.changeView(newView);
        }, 0);
        return () => clearTimeout(t);
    }, [viewMode]);

    // ── Zoom via Ctrl+Mausrad ─────────────────────────────────────────────────
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onWheel = (e: WheelEvent) => {
            if (!e.ctrlKey) return;
            e.preventDefault();

            const scroller = container.querySelector<HTMLElement>('.fc-scroller-liquid-absolute');
            if (!scroller) return;

            const newHeight = Math.min(200, Math.max(20, slotHeight + (e.deltaY > 0 ? -5 : 5)));
            if (newHeight === slotHeight) return;

            const rect      = scroller.getBoundingClientRect();
            const mouseY    = e.clientY - rect.top;
            const ratio     = (scroller.scrollTop + mouseY) / slotHeight;
            const newScroll = ratio * newHeight - mouseY;

            setSlotHeight(newHeight);
            scrollPosRef.current = newScroll;
            scroller.scrollTop   = newScroll;
        };

        container.addEventListener('wheel', onWheel, { passive: false });
        return () => container.removeEventListener('wheel', onWheel);
    }, [slotHeight]);

    // ── Navigation ────────────────────────────────────────────────────────────
    const handlePrev  = () => calendarRef.current?.getApi().prev();
    const handleNext  = () => calendarRef.current?.getApi().next();
    const handleToday = () => calendarRef.current?.getApi().today();

    const [currentViewDate, setCurrentViewDate] = useState<Date>(new Date());

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) calendarRef.current?.getApi().gotoDate(e.target.value);
    };

    const getCurrentDateLabel = () =>
        currentViewDate.toLocaleDateString('de-DE', {
            weekday: 'short', day: '2-digit', month: '2-digit',
        }).replace(',', '');

    // ── Business Hours ────────────────────────────────────────────────────────
    const businessHours = useMemo(() => {
        if (!weekSchedule || weekSchedule.length === 0) {
            return {
                daysOfWeek: [1, 2, 3, 4, 5],
                startTime:  workStart ?? '08:00',
                endTime:    workEnd   ?? '17:00',
            };
        }
        const hours: any[] = [];
        weekSchedule.forEach((day, idx) => {
            if (day.isWorkday && day.blocks) {
                const fcDay = (idx + 1) % 7;
                day.blocks.forEach(block => {
                    hours.push({ daysOfWeek: [fcDay], startTime: block.start, endTime: block.end });
                });
            }
        });
        return hours;
    }, [weekSchedule, workStart, workEnd]);

    // ── Overlay-Klick (FC-Interface kompatibel halten) ────────────────────────
    const handleOverlayClick = useCallback((props: any) => {
        onEventClick({ event: { extendedProps: props, start: null, end: null } });
    }, [onEventClick]);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div
            ref={containerRef}
            style={{
                height:        '100%',
                display:       'flex',
                flexDirection: 'column',
                width:         viewMode === 'day' ? '90%' : '95%',
                margin:        '0 auto',
                // @ts-ignore
                '--slot-height': `${slotHeight}px`,
            }}
        >
            {/* ── Navigationsleiste ── */}
            <div style={{
                display:        'flex',
                justifyContent: 'space-between',
                alignItems:     'center',
                padding:        '10px 20px',
                background:     'var(--panel-bg)',
                borderBottom:   '1px solid var(--border-color)',
                flexShrink:     0,
            }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={handlePrev}  style={navBtnStyle}><FaChevronLeft /></button>
                        <button onClick={handleToday} style={{ ...navBtnStyle, fontWeight: 'bold', padding: '6px 12px' }}>Heute</button>
                        <button onClick={handleNext}  style={navBtnStyle}><FaChevronRight /></button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                            fontWeight: '700', fontSize: '1rem',
                            color: 'var(--text-color)', minWidth: '100px',
                        }}>
                            {viewMode === 'day' ? getCurrentDateLabel() : 'Wochenansicht'}
                        </span>

                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <label htmlFor="date-jumper" style={{
                                cursor: 'pointer', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', padding: '6px',
                                background: 'var(--panel-bg)', borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-secondary)', boxShadow: 'var(--shadow)',
                            }} title="Datum wählen">
                                <FaCalendarAlt size={16} />
                            </label>
                            <input
                                id="date-jumper"
                                name="date-jumper"
                                type="date"
                                onChange={handleDateChange}
                                style={{
                                    position: 'absolute', opacity: 0,
                                    width: 0, height: 0, border: 'none',
                                    padding: 0, pointerEvents: 'auto', top: 0, left: 0,
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Zoom: {Math.round((slotHeight / 60) * 100)}%&thinsp;(Ctrl+Rad)
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', opacity: 0.7 }}>
                        {[
                            ['←→', 'Navigieren'],
                            ['H', 'Heute'],
                            ['D/W', 'Tag/Woche'],
                            ['N', 'Neue Session'],
                            ['M', 'Modus'],
                        ].map(([key, label]) => (
                            <span key={key} title={label} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <kbd style={{
                                    background: 'var(--bg-color)', border: '1px solid var(--border-color)',
                                    borderRadius: '3px', padding: '0 4px', fontFamily: 'monospace',
                                    fontSize: '0.7rem', lineHeight: '16px',
                                }}>{key}</kbd>
                                <span style={{ fontSize: '0.68rem' }}>{label}</span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── FC-Wrapper: FullCalendar + ActivityOverlay als Siblings ── */}
            <div
                ref={fcWrapperRef}
                style={{ flex: 1, overflow: 'hidden', position: 'relative' }}
            >
                <FullCalendar
                    ref={calendarRef}
                    plugins={[timeGridPlugin, interactionPlugin]}
                    initialView={viewMode === 'week' ? 'timeGridWeek' : 'timeGridDay'}
                    locale={deLocale}
                    headerToolbar={false}

                    // Nur manuelle Sessions → kein Overflow-Problem
                    events={manualEvents}

                    editable
                    eventResizableFromStart
                    selectable
                    selectMirror
                    dayMaxEvents
                    weekends
                    nowIndicator

                    scrollTime={fcScrollTime}
                    // WICHTIG: Verhindert, dass FC beim Navigieren (vor/zurück)
                    // automatisch zur scrollTime zurückspringt. Der Nutzer
                    // behält seine manuell gescrollte Position.
                    scrollTimeReset={false}

                    slotMinTime="00:00:00"
                    slotMaxTime="24:00:00"
                    allDaySlot={false}
                    slotEventOverlap={true}

                    hiddenDays={hiddenDays ?? []}
                    businessHours={businessHours}

                    height="100%"
                    slotDuration="00:15:00"
                    slotLabelInterval="01:00"

                    datesSet={info => {
                        const d = info.view.currentStart;
                        if (currentViewDate.getTime() !== d.getTime()) {
                            setCurrentViewDate(d);
                        }
                        // Nach Datums-Wechsel Layout neu messen
                        setTimeout(measureLayout, 80);
                    }}

                    eventContent={info =>
                        renderEventContent(info, onDeleteSession, viewMode, colWidth, isEditMode)
                    }
                    select={onDateSelect}
                    eventClick={onEventClick}
                    eventDrop={onEventDrop}
                    eventResize={onEventResize}

                    eventClassNames={() => {
                        const cls = ['manual-event'];
                        if (isEditMode) cls.push('mode-input');
                        return cls;
                    }}
                />

                {/* ActivityOverlay als Sibling – kein Portal, scroll-synchronisiert */}
                <ActivityOverlay
                    autoEvents={autoEvents}
                    slotHeight={slotHeight}
                    columnOffsets={columnOffsets}
                    gridTopOffset={gridTopOffset}
                    scrollTop={calScrollTop}
                    viewMode={viewMode}
                    isTaskMode={isEditMode}
                    onEventClick={handleOverlayClick}
                />
            </div>
        </div>
    );
});

CalendarEngine.displayName = 'CalendarEngine';

const navBtnStyle: React.CSSProperties = {
    background:     'var(--panel-bg)',
    border:         '1px solid var(--border-color)',
    borderRadius:   '6px',
    padding:        '8px',
    cursor:         'pointer',
    color:          'var(--text-secondary)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    boxShadow:      'var(--shadow)',
};
