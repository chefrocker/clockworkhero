import React from 'react';
import { FaTrash } from 'react-icons/fa';
import { AppIcon } from './AppIcon';
import { hexToRgba } from '../utils/imageUtils';

export const renderEventContent = (eventInfo: any, onDeleteSession: (id: string) => void) => {
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
                <img src={props.projectIcon} alt="" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
            ) : (
                <AppIcon appName={props.projectIcon || props.projectName} fallbackColor="white" className="watermark-icon" />
            )}
        </div>

        <div style={{position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'}}>
            <span style={{fontWeight: '700', fontSize: '0.9rem', textShadow: '0 1px 2px rgba(0,0,0,0.2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
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
  
  // FALL A: EINGEKLAPPT (InputMode ODER Kollision)
  if (isInputMode || isCollapsed) {
      return (
        // WICHTIG: Absolute Positionierung für den rechten Rand
        <div style={{
            position: 'absolute',
            top: 0, bottom: 0, right: 0,
            width: '30px', // Feste Breite für den Icon-Bereich
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 1
        }}>
            <div style={{
                width: '24px', height: '24px', 
                opacity: isCollapsed ? 0.4 : 0.8, 
                filter: 'grayscale(20%)',
                background: 'rgba(255,255,255,0.8)', // Hintergrund damit es sich abhebt
                borderRadius: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}>
                {props.appIcon ? (
                    <img src={props.appIcon} alt="" style={{width: '18px', height: '18px', objectFit: 'contain'}} />
                ) : (
                    <AppIcon path={props.exePath} appName={props.simpleName} fallbackColor={props.appColor} />
                )}
            </div>
        </div>
      );
  }

  // FALL B: ACTIVITY CARDS (Volle Breite)
  const containerStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderLeft: `5px solid ${props.appColor}`,
    height: '100%', 
    width: '80%', 
    marginLeft: 'auto', 
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: '0 8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
    cursor: 'pointer',
    zIndex: 5
  };

  return (
    <div className="auto-event-container" style={containerStyle}>
      <div style={{
          width: '24px', height: '24px', flexShrink: 0, marginRight: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {props.appIcon ? (
            <img src={props.appIcon} alt="" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
        ) : (
            <AppIcon path={props.exePath} appName={props.simpleName} fallbackColor={props.appColor} />
        )}
      </div>
      <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden'
      }}>
          <div style={{
              fontSize: '0.85rem', fontWeight: '700', color: '#334155',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
          }}>
              {props.simpleName}
          </div>
      </div>
    </div>
  );
};
