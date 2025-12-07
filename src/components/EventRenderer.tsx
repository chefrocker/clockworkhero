import React from 'react';
import { FaTrash } from 'react-icons/fa';
import { AppIcon } from './AppIcon';
import { hexToRgba } from '../utils/imageUtils';

export const renderEventContent = (eventInfo: any, onDeleteSession: (id: string) => void) => {
  const props = eventInfo.event.extendedProps;
  const isEditMode = props.isEditMode;

  // ============================================================
  // LAYER 1: MANUELLE SESSIONS (Arbeitsblöcke)
  // ============================================================
  if (props.type === 'manual') {
    const baseColor = props.projectColor || '#3498db';
    const gradient = `linear-gradient(135deg, ${hexToRgba(baseColor, 0.95)} 0%, ${hexToRgba(baseColor, 0.8)} 100%)`;
    
    return (
      <div className="manual-session-block" style={{ 
          background: gradient,
          borderRadius: '6px',
          // FIX: Border Konflikt gelöst - Einzelne Seiten statt "border"
          borderTop: '1px solid rgba(255,255,255,0.2)',
          borderRight: '1px solid rgba(255,255,255,0.2)',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          // borderLeft wird dynamisch gesetzt (durch FullCalendar), daher hier 'none'
          borderLeft: 'none', 
          
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          color: 'white',
          padding: '4px 8px',
          overflow: 'hidden',
          position: 'relative',
          height: '100%',
          transition: 'transform 0.1s',
          pointerEvents: 'auto'
      }}>
        {/* HINTERGRUND ICON (Watermark) */}
        <div style={{
            position: 'absolute', right: '-10px', bottom: '-10px', 
            opacity: 0.15, transform: 'rotate(-15deg)',
            width: '50px', height: '50px', pointerEvents: 'none',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            filter: 'grayscale(100%) brightness(200%)'
        }}>
            {props.projectIconType === 'image' ? (
                <img src={props.projectIcon} alt="" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
            ) : (
                <AppIcon appName={props.projectIcon || props.projectName} fallbackColor="white" className="watermark-icon" />
            )}
        </div>

        {/* INHALT OBEN: Titel & Löschen Button */}
        <div style={{position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span style={{fontWeight: '700', fontSize: '0.85rem', textShadow: '0 1px 2px rgba(0,0,0,0.2)'}}>
                {props.projectName}
            </span>
            
            {/* Löschen Button nur im Edit Mode */}
            {isEditMode && (
                <div 
                    style={{
                        background: 'rgba(255,255,255,0.2)', color: 'white', 
                        width: '20px', height: '20px', borderRadius: '4px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginLeft: '5px'
                    }}
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        onDeleteSession(eventInfo.event.id); 
                    }}
                    title="Eintrag löschen"
                >
                    <FaTrash size={9} />
                </div>
            )}
        </div>
        
        {/* INHALT UNTEN: Beschreibung */}
        <div style={{
            color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem', fontWeight: '500',
            position: 'relative', zIndex: 2, marginTop: '2px',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          {props.description}
        </div>
      </div>
    );
  }

  // ============================================================
  // LAYER 2: ACTIVITY STREAM (Automatisch erfasst)
  // ============================================================
  const containerStyle: React.CSSProperties = {
    backgroundColor: isEditMode ? 'rgba(245, 245, 245, 0.5)' : 'rgba(255, 255, 255, 0.6)',
    borderLeft: `3px solid ${props.appColor}`,
    opacity: isEditMode ? 0.3 : 1.0, 
    filter: isEditMode ? 'grayscale(100%)' : 'none',
    pointerEvents: isEditMode ? 'none' : 'auto', 
    transition: 'all 0.3s ease',
    zIndex: 0,
    position: 'relative',
    overflow: 'hidden',
    height: '100%',
    borderRadius: '6px',
    // FIX: Auch hier Border Konflikt vermeiden
    borderTop: '1px solid rgba(0,0,0,0.05)',
    borderRight: '1px solid rgba(0,0,0,0.05)',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
  };

  return (
    <div style={containerStyle}>
      {/* Titel nur anzeigen, wenn nicht im Edit Mode (sonst zu unruhig) */}
      {!isEditMode && (
        <div style={{
            position: 'absolute', top: '4px', left: '6px', zIndex: 2,
            fontSize: '0.75rem', fontWeight: '600', color: '#475569',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90%'
        }}>
            {props.simpleName}
        </div>
      )}

      {/* Watermark Icon unten rechts */}
      <div style={{
          position: 'absolute', right: '5px', bottom: '5px', 
          opacity: 0.15, transform: 'rotate(-10deg)',
          width: '32px', height: '32px', pointerEvents: 'none',
          display: 'flex', justifyContent: 'center', alignItems: 'center'
      }}>
        {/* NEU: Hier prüfen wir auf Custom App Icon (props.appIcon) */}
        {props.appIcon ? (
             <img src={props.appIcon} alt="" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
        ) : (
             <AppIcon path={props.exePath} appName={props.simpleName} fallbackColor={props.appColor} />
        )}
      </div>
    </div>
  );
};
