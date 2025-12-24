import React from 'react';
import { FaTrash } from 'react-icons/fa';
import { AppIcon } from './AppIcon';
import { hexToRgba } from '../utils/imageUtils';

export const renderEventContent = (eventInfo: any, onDeleteSession: (id: string) => void, viewMode: 'day' | 'week') => {
    const props = eventInfo.event.extendedProps;
    const isInputMode = props.isEditMode;
    const isCollapsed = props.isCollapsed;

    // --- LAYER 1: SESSIONS (Manuell) ---
    if (props.type === 'manual') {
        const baseColor = props.projectColor || '#3498db';
        const gradient = `linear-gradient(135deg, ${hexToRgba(baseColor, 0.95)} 0%, ${hexToRgba(baseColor, 0.8)} 100%)`;

        return (
            <div className="manual-session-block" style={{
                background: gradient,
                borderTop: '1px solid rgba(255,255,255,0.2)',
                borderRight: '1px solid rgba(255,255,255,0.2)',
                borderBottom: '1px solid rgba(255,255,255,0.2)',
                borderLeft: 'none',
                zIndex: 50, position: 'relative'
            }}>
                <div style={{
                    position: 'absolute', right: '5px', bottom: '5px',
                    opacity: 0.2, transform: 'rotate(-10deg)',
                    width: '50px', height: '50px', pointerEvents: 'none',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    filter: 'grayscale(100%) brightness(200%)'
                }}>
                    {props.projectIconType === 'image' ? (
                        <img src={props.projectIcon} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                        <AppIcon appName={props.projectIcon || props.projectName} fallbackColor="white" className="watermark-icon" />
                    )}
                </div>

                <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', textShadow: '0 1px 2px rgba(0,0,0,0.2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {props.projectName}
                    </span>
                    <div
                        style={{
                            background: 'rgba(255,255,255,0.2)', color: 'white',
                            width: '24px', height: '24px', borderRadius: '4px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: '5px'
                        }}
                        onClick={(e) => { e.stopPropagation(); onDeleteSession(eventInfo.event.id); }}
                    >
                        <FaTrash size={12} />
                    </div>
                </div>

                <div style={{
                    color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem', fontWeight: '500',
                    position: 'relative', zIndex: 2, marginTop: '4px',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                    {props.description}
                </div>
            </div>
        );
    }

    // --- LAYER 2: ACTIVITY STREAM (Auto) ---
    const slotRank = props.slotRank || 0;
    const slotCount = props.slotCount || 1;

    // Gemeinsame Icon-Größen
    const iconSizeFull = 34;
    const iconSizeSmall = 24;

    // FALL A: NUR SYMBOLE (Wochenansicht, InputMode, oder Kollision)
    if (isInputMode || isCollapsed || viewMode === 'week') {
        const iconSize = (viewMode === 'week') ? iconSizeSmall : (isInputMode ? iconSizeSmall : iconSizeFull);
        const gap = 6;

        // Raster-Logik: Wie viele Icons passen nebeneinander?
        // In der Wochenansicht (sehr schmal) nur 2, sonst 4-5.
        const maxCols = (viewMode === 'week') ? 2 : 4;
        const col = slotRank % maxCols;
        const row = Math.floor(slotRank / maxCols);

        // Rechts-Reserve: 12% vom Rand Platz lassen für manuelle Klicks
        const horizontalOffset = col * (iconSize + gap);
        const verticalOffset = row * (iconSize + 4);

        return (
            <div style={{
                position: 'absolute',
                top: `${verticalOffset}px`,
                right: `calc(12% + ${horizontalOffset}px)`, // 12% Reserve + Versatz
                width: `${iconSize}px`,
                height: `${iconSize}px`,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                pointerEvents: 'auto',
                zIndex: 10 + slotRank,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
            }}>
                <div style={{
                    width: `${iconSize}px`, height: `${iconSize}px`,
                    opacity: isCollapsed ? 0.5 : 1,
                    background: isCollapsed ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.95)',
                    borderRadius: '5px',
                    boxShadow: isCollapsed ? 'none' : '0 2px 4px rgba(0,0,0,0.12)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    padding: '2px',
                    boxSizing: 'border-box',
                    border: '1px solid rgba(0,0,0,0.08)',
                }}
                    className="hover-scale"
                >
                    {props.appIcon ? (
                        <img src={props.appIcon} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <AppIcon path={props.exePath} appName={props.simpleName} fallbackColor={props.appColor} />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // FALL B: ACTIVITY CARDS (Nur Tagesansicht ohne InputMode)
    // Volle Karten mit Text, rechtsbündig angeordnet.

    // Dynamische Breitenberechnung:
    // Wir lassen 10% Platz auf der linken Seite (für manuelle Zeitblock-Klicks).
    // Wenn viele Karten nebeneinander liegen (slotCount > 3), verkleinern wir sie.
    const maxDayWidth = 0.9; // 90% des Platzes darf genutzt werden
    const defaultCardWidth = 220;
    const cardGap = 8;
    const rightMargin = 8;

    // Wenn mehr als 3 Karten da sind, fangen wir an zu schrumpfen oder zu stapeln
    let currentCardWidth = defaultCardWidth;
    let slotRankInRow = slotRank;
    let rowIndex = 0;

    // Einfache Logik: Wenn die Karten die 90% Marke (ca. 800px) überschreiten würden,
    // fangen wir eine neue Reihe an oder verkleinern sie.
    // FullCalendar Spaltenbreite variiert, aber wir nehmen ca. 900px als Referenz für Desktop.
    const estimatedColWidth = 900;
    const usableWidth = estimatedColWidth * maxDayWidth;

    if (slotCount * (defaultCardWidth + cardGap) > usableWidth) {
        // Option 1: Karten schrumpfen (bis min 140px)
        currentCardWidth = Math.max(140, Math.floor(usableWidth / slotCount) - cardGap);

        // Option 2: Wenn immer noch zu breit, zweite Reihe (bei sehr vielen Slots)
        if (currentCardWidth === 140 && (slotCount * (140 + cardGap) > usableWidth)) {
            const cardsPerRow = Math.floor(usableWidth / (140 + cardGap));
            slotRankInRow = slotRank % cardsPerRow;
            rowIndex = Math.floor(slotRank / cardsPerRow);
        }
    }

    const horizontalOffset = rightMargin + (slotRankInRow * (currentCardWidth + cardGap));
    const verticalOffset = rowIndex * 40; // Versatz falls mehrere Reihen (selten)

    const containerStyle: React.CSSProperties = {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRight: `5px solid ${props.appColor}`,
        borderLeft: 'none',
        height: rowIndex > 0 ? '35px' : '100%', // Kleinere Höhe für untere Reihen
        width: `${currentCardWidth}px`,
        position: 'absolute',
        right: `${horizontalOffset}px`,
        top: rowIndex > 0 ? `${verticalOffset}px` : '0',
        display: 'flex',
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: '0 8px',
        boxShadow: '-2px 2px 6px rgba(0,0,0,0.08)',
        borderRadius: '6px 0 0 6px',
        overflow: 'hidden',
        cursor: 'pointer',
        zIndex: 5 + slotRank,
        boxSizing: 'border-box',
        pointerEvents: 'auto',
        transition: 'all 0.3s ease'
    };

    return (
        <div className="auto-event-container" style={containerStyle}>
            <div style={{
                width: rowIndex > 0 ? '24px' : `${iconSizeFull}px`,
                height: rowIndex > 0 ? '24px' : `${iconSizeFull}px`,
                flexShrink: 0, marginLeft: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(241, 245, 249, 0.9)',
                borderRadius: '6px',
                padding: '2px',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.08)',
                boxSizing: 'border-box'
            }}>
                {props.appIcon ? (
                    <img src={props.appIcon} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AppIcon path={props.exePath} appName={props.simpleName} fallbackColor={props.appColor} />
                    </div>
                )}
            </div>
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden',
                textAlign: 'right'
            }}>
                <div style={{
                    fontSize: rowIndex > 0 ? '0.75rem' : '0.85rem',
                    fontWeight: '700', color: '#0f172a',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    lineHeight: '1.2'
                }}>
                    {props.simpleName}
                </div>
            </div>
        </div>
    );
};
