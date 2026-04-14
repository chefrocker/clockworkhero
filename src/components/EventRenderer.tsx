import { FaTrash } from 'react-icons/fa';
import { hexToRgba } from '../utils/imageUtils';

/**
 * EventRenderer – Ausschließlich für manuelle Sessions (Arbeitstasks).
 *
 * Auto-Events (ActivityCards) werden nicht mehr hier gerendert.
 * Sie werden vollständig vom ActivityOverlay-Komponenten übernommen,
 * welcher per React-Portal in den FullCalendar-Scroller injiziert wird.
 *
 * Layout manueller Sessions:
 *  - Task-Modus:     50% Breite, volle Deckkraft, links ausgerichtet
 *  - Activity-Modus: 20% Breite, 40% Deckkraft, links ausgerichtet
 *
 * Z-Index: var(--z-manual-events) = 300
 *  → Liegt immer über dem ActivityOverlay (z-index: 100)
 */
export const renderEventContent = (
    eventInfo:          any,
    onDelete?:          (id: string) => void,
    _viewMode:          'day' | 'week' = 'day',  // reserviert für künftige Nutzung
    _colWidth?:         number,                  // reserviert
    isTaskModeActive?:  boolean,
) => {
    const props      = eventInfo.event.extendedProps;
    const isTaskMode = isTaskModeActive !== undefined
        ? isTaskModeActive
        : !!props.isInputMode;

    // Auto-Events werden vom ActivityOverlay gerendert – hier nichts tun
    if (props.type === 'auto') return null;

    // ── Manuelle Session ──────────────────────────────────────────────────────
    if (props.type === 'manual') {
        const baseColor    = props.projectColor ?? '#3b82f6';
        const projectName  = props.projectName  ?? 'Projekt';
        const gradient     = `linear-gradient(135deg,
            ${hexToRgba(baseColor, 0.95)} 0%,
            ${hexToRgba(baseColor, 0.80)} 100%
        )`;
        const widthPercent = isTaskMode ? 50 : 20;
        const opacity      = isTaskMode ? 1.0 : 0.4;

        return (
            <div style={{
                height:         '100%',
                width:          `${widthPercent}%`,
                position:       'absolute',
                left:           0,
                padding:        '4px 8px',
                background:     gradient,
                color:          'white',
                borderRadius:   '6px',
                fontSize:       '0.82rem',
                border:         '1px solid rgba(255,255,255,0.3)',
                overflow:       'hidden',
                boxShadow:      isTaskMode ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                display:        'flex',
                flexDirection:  'column',
                gap:            '2px',
                zIndex:         'var(--z-manual-events)' as any,
                boxSizing:      'border-box',
                pointerEvents:  'auto',
                opacity,
                transition:     'all 0.2s ease-out',
                cursor:         'pointer',
            }}>
                <div style={{
                    fontWeight:  'bold',
                    display:     'flex',
                    justifyContent: 'space-between',
                    alignItems:  'center',
                }}>
                    <span style={{
                        whiteSpace:   'nowrap',
                        overflow:     'hidden',
                        textOverflow: 'ellipsis',
                        fontSize:     isTaskMode ? '0.82rem' : '0.7rem',
                    }}>
                        {projectName} – {props.description}
                    </span>

                    {onDelete && isTaskMode && (
                        <div
                            style={{
                                cursor:      'pointer',
                                opacity:     0.8,
                                display:     'flex',
                                alignItems:  'center',
                                flexShrink:  0,
                                marginLeft:  '4px',
                            }}
                            onClick={e => { e.stopPropagation(); onDelete(eventInfo.event.id); }}
                        >
                            <FaTrash size={10} />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
};
