import { FaTrash } from 'react-icons/fa';
import { AppIcon } from './AppIcon';
import { hexToRgba } from '../utils/imageUtils';

/**
 * --- DOKUMENTATION DER LAYOUT-LOGIK (FINALE KORREKTUR) ---
 * 
 * 1. MODUS: ActivityCards (Analyse) [isInputMode = false]
 *    - FOKUS: getrackte Apps (ActivityCards).
 *    - ActivityCards: Deckkraft 1.0. TITEL SICHTBAR (Tagesansicht).
 *    - Arbeitstasks: 10% Breite, transparent (0.4). Ganz links.
 * 
 * 2. MODUS: Arbeitstasks (Planung) [isInputMode = true]
 *    - FOKUS: Projektbuchungen.
 *    - Arbeitstasks: 50% Breite, Deckkraft 1.0. Ganz links.
 *    - ActivityCards: Deckkraft 0.3. KEIN TEXT (nur Icons).
 *    - Anordnung: ActivityCards liegen im 90% Bereich rechts und werden horizontal gestapelt.
 * 
 * 3. HORIZONTALES STACKING:
 *    - Verwendet slotRank um hOffset (right) zu berechnen.
 *    - Wächst von RECHTS nach LINKS (right: 0px, 40px, 80px...).
 */

export const renderEventContent = (eventInfo: any, onDelete?: (id: string) => void, viewMode: 'day' | 'week' = 'day', colWidth?: number, isTaskModeActive?: boolean) => {
    const props = eventInfo.event.extendedProps;
    const { type, simpleName, slotRank } = props;
    // Priorität: Expliziter Parameter vor extendedProps
    const isTaskMode = isTaskModeActive !== undefined ? isTaskModeActive : !!props.isInputMode;

    // --- FALL A: MANUELLE SESSIONS (ARBEITSTASKS) ---
    if (type === 'manual') {
        const baseColor = props.projectColor || '#3b82f6';
        const projectName = props.projectName || 'Projekt';
        const gradient = `linear-gradient(135deg, ${hexToRgba(baseColor, 0.95)} 0%, ${hexToRgba(baseColor, 0.8)} 100%)`;

        const taskWidthPercent = isTaskMode ? 50 : 20; // 20% im Activity-Mode wie gewünscht

        const taskOpacity = isTaskMode ? 1.0 : 0.4;
        // Arbeitstasks liegen immer über den ActivityCards (die haben max 100)
        const taskZIndex = 500;

        return (
            <div style={{
                height: '100%',
                width: `${taskWidthPercent}%`,
                position: 'absolute',
                left: 0,
                padding: '4px 8px',
                background: gradient,
                color: 'white',
                borderRadius: '6px',
                fontSize: '0.82rem',
                border: '1px solid rgba(255,255,255,0.3)',
                overflow: 'hidden',
                boxShadow: isTaskMode ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                zIndex: taskZIndex,
                boxSizing: 'border-box',
                pointerEvents: 'auto',
                opacity: taskOpacity,
                transition: 'all 0.2s ease-out',
                cursor: 'pointer' // ← HINZUFÜGEN: Zeigt an, dass Element klickbar ist
            }}>
                {/* Text immer anzeigen, wird durch overflow hidden abgeschnitten wenn zu klein */}
                <div style={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontSize: isTaskMode ? '0.82rem' : '0.7rem'
                    }}>
                        {projectName} - {props.description}
                    </span>
                    {onDelete && isTaskMode && (
                        <div
                            style={{ cursor: 'pointer', opacity: 0.8, display: 'flex', alignItems: 'center' }}
                            onClick={(e) => { e.stopPropagation(); onDelete(eventInfo.event.id); }}
                        >
                            <FaTrash size={10} />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- FALL B: ACTIVITY CARDS (AUTO) ---
    if (type === 'auto') {
        const iconSize = 32;
        const gap = 8;
        const activityOpacity = isTaskMode ? 0.3 : 1.0;

        // Wir messen die Breite der Spalte. Falls noch nicht gemessen, Fallback auf 200.
        const W = colWidth || 200;
        const usefulWidth = W * 0.9;
        const edgeOffset = 4;

        // --- 1. WOCHE ODER IM ARBEITSTASK-MODUS: Nur Icons (Horizontale Stapelung) ---
        if (viewMode === 'week' || isTaskMode) {
            const maxCols = Math.max(1, Math.floor((usefulWidth - edgeOffset) / (iconSize + gap)));


            // Sichtbarkeitscheck ENTFERNT - User möchte alle Icons sehen
            // const maxVisibleIcons = maxCols * 3; 


            const col = (slotRank || 0) % maxCols;
            const row = Math.floor((slotRank || 0) / maxCols);

            // Von Rechts nach Links wachsen
            const hOffset = edgeOffset + (col * (iconSize + gap));
            const vOffset = 2 + (row * (iconSize + gap));

            return (
                <div style={{
                    position: 'absolute',
                    right: `${hOffset}px`,
                    top: `${vOffset}px`,
                    width: `${iconSize}px`,
                    height: `${iconSize}px`,
                    zIndex: 10 + (slotRank || 0),
                    pointerEvents: 'auto',
                    opacity: activityOpacity,
                    transition: 'all 0.2s ease-out',
                    // NEU: Overflow verstecken entfernt
                    // overflow: 'hidden'
                }}>
                    <div style={{
                        width: '100%',
                        height: '100%',
                        padding: '4px',
                        background: 'rgba(255,255,255,0.98)',
                        borderRadius: '6px',
                        boxSizing: 'border-box',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                        border: '1px solid rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <AppIcon appName={simpleName} path={props.exePath} fallbackColor={props.appColor} />
                    </div>
                </div>
            );
        }

        // --- 2. TAG-ANSICHT (ACTIVITY MODE / ANALYSE): Große Karten MIT NAME ---
        // Hier stapeln wir auch horizontal, falls mehrere Apps im selben Slot sind
        const cardWidth = 180;
        const cardGap = 10;
        const maxCards = Math.max(1, Math.floor((usefulWidth - edgeOffset) / (cardWidth + cardGap)));

        const cardCol = (slotRank || 0) % maxCards;
        const cardRow = Math.floor((slotRank || 0) / maxCards);

        const hOffset = edgeOffset + (cardCol * (cardWidth + cardGap));
        const vOffset = cardRow * 42;

        return (
            <div style={{
                position: 'absolute',
                right: `${hOffset}px`,
                top: `${vOffset}px`,
                width: `${cardWidth}px`,
                height: '38px',
                padding: '0 10px',
                background: 'var(--panel-bg)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: '1px solid var(--border-color)',
                borderRight: `5px solid ${props.appColor || 'var(--primary)'}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                fontSize: '0.85rem',
                color: 'var(--text-color)',
                zIndex: 10 + (slotRank || 0),
                overflow: 'hidden',
                boxSizing: 'border-box',
                pointerEvents: 'auto',
                opacity: activityOpacity,
                transition: 'all 0.2s ease-out'
            }} className="hover-scale">
                <div style={{ width: '28px', height: '28px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AppIcon appName={simpleName} path={props.exePath} fallbackColor={props.appColor} />
                </div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 'bold', flex: 1 }}>
                    {simpleName}
                </div>
            </div>
        );
    }

    return null;
};
