import React from 'react';
import { AppIcon } from './AppIcon';

/**
 * ActivityOverlay – Scroll-synchronisierter Sibling-Layer
 *
 * Statt eines React-Portals (das in den FC-Scroller injiziert und durch
 * dessen overflow:hidden-x geclippt wird) rendert dieser Overlay als
 * position:absolute-Sibling neben FullCalendar, innerhalb desselben
 * fc-Wrapper-Containers.
 *
 * Scroll-Synchronisation:
 *  - CalendarEngine misst den scrollTop des FC-Scrollers
 *  - Dieser Wert wird als Prop übergeben
 *  - Icons werden mit `top = gridTopOffset + baseTop - scrollTop` positioniert
 *  - Der Container hat overflow:hidden → Icons außerhalb des sichtbaren
 *    Bereichs werden sauber abgeschnitten (genau wie der Kalender selbst)
 *
 * Keine Portale, kein overflow:visible-Hack, kein Clipping durch FC-Internals.
 */

// ─── Konstanten ──────────────────────────────────────────────────────────────
const ICON_SIZE   = 32;
const ICON_GAP    = 8;
const CARD_WIDTH  = 180;
const CARD_HEIGHT = 38;
const CARD_GAP    = 10;
const EDGE_OFFSET = 6;

// ─── Typen ───────────────────────────────────────────────────────────────────
export interface ColumnInfo {
    left:  number;
    width: number;
}

interface Props {
    autoEvents:     any[];
    slotHeight:     number;                     // px pro 15-Min-Slot
    columnOffsets:  Map<string, ColumnInfo>;    // "YYYY-MM-DD" → {left, width}
    gridTopOffset:  number;                     // Pixel-Höhe des FC-Spaltenheaders
    scrollTop:      number;                     // Aktueller scrollTop des FC-Scrollers
    viewMode:       'day' | 'week';
    isTaskMode:     boolean;
    onEventClick:   (extendedProps: any) => void;
}

// ─── Hilfsfunktion ───────────────────────────────────────────────────────────
const minutesToPx = (minutes: number, slotHeight: number): number =>
    minutes * (slotHeight / 15);

// ─── Komponente ──────────────────────────────────────────────────────────────
export const ActivityOverlay: React.FC<Props> = ({
    autoEvents,
    slotHeight,
    columnOffsets,
    gridTopOffset,
    scrollTop,
    viewMode,
    isTaskMode,
    onEventClick,
}) => {
    if (autoEvents.length === 0 || columnOffsets.size === 0) return null;

    const activityOpacity = isTaskMode ? 0.3 : 1.0;
    const useIcons        = viewMode === 'week' || isTaskMode;

    const renderedItems = autoEvents.map((event, idx) => {
        const startDate = new Date(event.start);
        const dateStr   = startDate.toISOString().split('T')[0];
        const col       = columnOffsets.get(dateStr);
        if (!col) return null;

        const minutesSinceMidnight = startDate.getHours() * 60 + startDate.getMinutes();
        // Absolute Position im Gesamt-Zeitgrid (Pixel ab 00:00)
        const baseTop  = minutesToPx(minutesSinceMidnight, slotHeight);
        const slotRank = event.extendedProps.slotRank ?? 0;
        const props    = event.extendedProps;
        const key      = `overlay-${event.id ?? idx}-${dateStr}`;

        // ── Icons (Woche / Task-Modus) ───────────────────────────────────────
        if (useIcons) {
            const maxCols = Math.max(1, Math.floor(
                (col.width * 0.9 - EDGE_OFFSET) / (ICON_SIZE + ICON_GAP)
            ));
            const iconCol = slotRank % maxCols;
            const iconRow = Math.floor(slotRank / maxCols);

            // Von rechts nach links wachsend (innerhalb der Spalte)
            const left = col.left + col.width
                - EDGE_OFFSET
                - ICON_SIZE
                - iconCol * (ICON_SIZE + ICON_GAP);

            // Sichtbare Position = Header-Offset + Absolute-Zeit-Position − Scroll
            const top = gridTopOffset + baseTop - scrollTop
                + 2
                + iconRow * (ICON_SIZE + ICON_GAP);

            return (
                <div
                    key={key}
                    className="activity-overlay-icon"
                    style={{
                        position:       'absolute',
                        top:            `${top}px`,
                        left:           `${left}px`,
                        width:          `${ICON_SIZE}px`,
                        height:         `${ICON_SIZE}px`,
                        pointerEvents:  'auto',
                        opacity:        activityOpacity,
                        cursor:         'pointer',
                        borderRadius:   '6px',
                        padding:        '4px',
                        boxSizing:      'border-box',
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                    }}
                    onClick={e => { e.stopPropagation(); onEventClick(props); }}
                    title={props.simpleName}
                >
                    <AppIcon
                        appName={props.simpleName}
                        path={props.exePath}
                        fallbackColor={props.appColor}
                    />
                </div>
            );
        }

        // ── Große Karten (Tag / Activity-Modus) ──────────────────────────────
        const maxCols = Math.max(1, Math.floor(
            (col.width * 0.9 - EDGE_OFFSET) / (CARD_WIDTH + CARD_GAP)
        ));
        const cardCol = slotRank % maxCols;
        const cardRow = Math.floor(slotRank / maxCols);

        const left = col.left + col.width
            - EDGE_OFFSET
            - CARD_WIDTH
            - cardCol * (CARD_WIDTH + CARD_GAP);

        const top = gridTopOffset + baseTop - scrollTop
            + cardRow * (CARD_HEIGHT + 4);

        return (
            <div
                key={key}
                className="activity-overlay-card"
                style={{
                    position:       'absolute',
                    top:            `${top}px`,
                    left:           `${left}px`,
                    width:          `${CARD_WIDTH}px`,
                    height:         `${CARD_HEIGHT}px`,
                    pointerEvents:  'auto',
                    opacity:        activityOpacity,
                    cursor:         'pointer',
                    borderRadius:   '8px',
                    display:        'flex',
                    alignItems:     'center',
                    gap:            '12px',
                    padding:        '0 10px',
                    border:         '1px solid var(--border-color)',
                    borderRight:    `5px solid ${props.appColor ?? 'var(--primary)'}`,
                    boxShadow:      '0 2px 8px rgba(0,0,0,0.12)',
                    fontSize:       '0.85rem',
                    color:          'var(--text-color)',
                    boxSizing:      'border-box',
                }}
                onClick={e => { e.stopPropagation(); onEventClick(props); }}
            >
                <div style={{
                    width:          '28px',
                    height:         '28px',
                    flexShrink:     0,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                }}>
                    <AppIcon
                        appName={props.simpleName}
                        path={props.exePath}
                        fallbackColor={props.appColor}
                    />
                </div>
                <div style={{
                    overflow:       'hidden',
                    textOverflow:   'ellipsis',
                    whiteSpace:     'nowrap',
                    fontWeight:     'bold',
                    flex:           1,
                }}>
                    {props.simpleName}
                </div>
            </div>
        );
    });

    // Der Container sitzt als position:absolute über dem gesamten fc-Wrapper.
    // overflow:hidden schneidet Icons am selben Rand ab wie der Kalender selbst.
    // pointer-events:none lässt Klicks auf den Kalender-Hintergrund durch.
    return (
        <div style={{
            position:       'absolute',
            top:            0,
            left:           0,
            right:          0,
            bottom:         0,
            overflow:       'hidden',
            pointerEvents:  'none',
            zIndex:         'var(--z-auto-events)' as any,
        }}>
            {renderedItems}
        </div>
    );
};
