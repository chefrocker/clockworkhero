import React from 'react';
import { FaTrash } from 'react-icons/fa';
import { AppIcon } from './AppIcon';
import { hexToRgba } from '../utils/imageUtils';

interface Props {
  eventInfo: any;
  onDeleteSession: (id: string) => void;
}

export const EventRenderer: React.FC<Props> = ({ eventInfo, onDeleteSession }) => {
  const props = eventInfo.event.extendedProps;
  const isEditMode = props.isEditMode;

  // --- LAYER 1: SESSIONS (Manuell - Vordergrund) ---
  // NEUES DESIGN: Premium Gradient Card
  if (props.type === 'manual') {
    
    const baseColor = props.projectColor || '#3498db';
    // Wir erstellen einen Verlauf von der Basisfarbe zu einer etwas helleren/transparenteren Version
    const gradient = `linear-gradient(135deg, ${hexToRgba(baseColor, 0.95)} 0%, ${hexToRgba(baseColor, 0.8)} 100%)`;
    
    return (
      <div className="manual-session-block" style={{ 
          background: gradient,
          borderRadius: '10px',
          // Subtiler weißer Rand für "Glass"-Kante
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)',
          color: 'white',
          padding: '6px 10px',
          overflow: 'hidden',
          position: 'relative',
          height: '100%',
          transition: 'transform 0.1s, box-shadow 0.1s'
      }}>
        
        {/* Watermark Icon (Groß & Künstlerisch) */}
        <div style={{
            position: 'absolute', right: '-12px', bottom: '-12px', 
            opacity: 0.15, transform: 'rotate(-15deg)',
            width: '64px', height: '64px', pointerEvents: 'none',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            filter: 'grayscale(100%) brightness(200%)' // Macht das Icon weißlich
        }}>
            {props.projectIconType === 'image' ? (
                <img src={props.projectIcon} alt="" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
            ) : (
                <AppIcon appName={props.projectIcon || props.projectName} fallbackColor="white" className="watermark-icon" />
            )}
        </div>

        <div className="manual-session-header" style={{position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span className="manual-session-title" style={{
                color: 'white', fontWeight: '800', fontSize: '0.9rem',
                textShadow: '0 1px 2px rgba(0,0,0,0.2)', letterSpacing: '0.3px'
            }}>
                {props.projectName}
            </span>
            {isEditMode && (
                <button 
                    className="btn-delete-session" 
                    style={{
                        background: 'rgba(255,255,255,0.2)', color: 'white', 
                        width: '22px', height: '22px', minWidth: '22px',
                        borderRadius: '6px', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    onMouseDown={(e) => { e.stopPropagation(); onDeleteSession(eventInfo.event.id); }}
                >
                    <FaTrash size={10} />
                </button>
            )}
        </div>
        
        <div className="manual-session-desc" style={{
            color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem', fontWeight: '500',
            position: 'relative', zIndex: 2, marginTop: '3px',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          {props.description}
        </div>
      </div>
    );
  }

  // --- LAYER 2: ACTIVITY STREAM (Auto - Hintergrund) ---
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
    borderRadius: '0 4px 4px 0',
    borderTop: '1px solid rgba(0,0,0,0.03)',
    borderBottom: '1px solid rgba(0,0,0,0.03)',
    borderRight: '1px solid rgba(0,0,0,0.03)',
  };

  return (
    <div style={containerStyle}>
      {!isEditMode && (
        <div style={{
            position: 'absolute', top: '2px', left: '4px', zIndex: 2,
            fontSize: '0.7rem', fontWeight: '600', color: '#64748b',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85%'
        }}>
            {props.simpleName}
        </div>
      )}
      <div style={{
          position: 'absolute', right: '5%', bottom: '5%', width: '50%', height: '70%', 
          opacity: 0.8, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', zIndex: 1
      }}>
        <AppIcon path={props.exePath} appName={props.simpleName} fallbackColor={props.appColor} className="watermark-icon" />
      </div>
    </div>
  );
};
