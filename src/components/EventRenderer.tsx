import React from 'react';
import { FaTrash } from 'react-icons/fa';
import { AppIcon } from './AppIcon';

interface Props {
  eventInfo: any;
  onDeleteSession: (id: string) => void;
}

export const EventRenderer: React.FC<Props> = ({ eventInfo, onDeleteSession }) => {
  const props = eventInfo.event.extendedProps;
  const isEditMode = props.isEditMode;

  // --- LAYER 1: SESSIONS (Manuell) ---
  if (props.type === 'manual') {
    return (
      <div className="manual-session-block" style={{ borderLeftColor: props.projectColor }}>
        <div className="manual-session-header">
            <span className="manual-session-title" style={{color: props.projectColor}}>
            {props.projectName}
            </span>
            {isEditMode && (
                <button 
                    className="btn-delete-session" 
                    onMouseDown={(e) => { e.stopPropagation(); onDeleteSession(eventInfo.event.id); }}
                >
                    <FaTrash size={10} />
                </button>
            )}
        </div>
        <div className="manual-session-desc">
          {props.description}
        </div>
      </div>
    );
  }

  // --- LAYER 2: ACTIVITY STREAM (Auto) ---
  // WATERMARK DESIGN
  const containerStyle: React.CSSProperties = {
    backgroundColor: props.appColor,
    opacity: isEditMode ? 0.2 : 0.8, 
    filter: isEditMode ? 'grayscale(100%)' : 'none',
    pointerEvents: isEditMode ? 'none' : 'auto', 
    transition: 'all 0.3s ease',
    zIndex: 0,
    position: 'relative',
    overflow: 'hidden', // Wichtig, damit das große Icon nicht rausragt
    height: '100%',
    borderRadius: '4px',
    border: '1px solid rgba(0,0,0,0.05)'
  };

  return (
    <div style={containerStyle}>
      
      {/* 1. Titel (Klein oben links, optional ausblendbar in Wochenansicht via CSS) */}
      <div className="activity-title-overlay" style={{
          position: 'absolute', top: '2px', left: '4px', zIndex: 2,
          fontSize: '0.75rem', fontWeight: '700', color: 'white',
          textShadow: '0 1px 2px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90%'
      }}>
          {props.simpleName}
      </div>

      {/* 2. Das Watermark Icon (Groß im Hintergrund) */}
      <div style={{
          position: 'absolute',
          right: '-10%', 
          bottom: '-10%',
          width: '60%', // Nimmt 60% der Breite ein
          height: '80%', // Nimmt 80% der Höhe ein
          opacity: 0.3, // Transparent
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
          zIndex: 1
      }}>
        <AppIcon 
            path={props.exePath} 
            appName={props.simpleName} 
            fallbackColor="white" 
            className="watermark-icon" 
        />
      </div>
    </div>
  );
};
