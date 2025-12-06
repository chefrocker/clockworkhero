import React from 'react';
import { FaTrash } from 'react-icons/fa';

interface Props {
  eventInfo: any;
  onDeleteSession: (id: string) => void;
}

export const EventRenderer: React.FC<Props> = ({ eventInfo, onDeleteSession }) => {
  const props = eventInfo.event.extendedProps;
  const isEditMode = props.isEditMode;

  // --- LAYER 1: ARBEITSSTUNDEN (Manuell) ---
  if (props.type === 'manual') {
    return (
      <div className="manual-session-block" style={{ borderLeftColor: props.projectColor }}>
        <div className="manual-session-header">
            <span className="manual-session-title" style={{color: props.projectColor}}>
            {props.projectName}
            </span>
            {/* Löschen Button nur im Edit Mode */}
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

  // --- LAYER 2: PROGRAMM LAYER (Auto) ---
  // Wenn EditMode an ist: Kleiner, transparenter, im Hintergrund
  const containerStyle: React.CSSProperties = {
    backgroundColor: props.appColor,
    opacity: isEditMode ? 0.3 : 1.0, // Stark transparent im Edit Mode
    transform: isEditMode ? 'scale(0.9)' : 'scale(1)', // Kleiner im Edit Mode
    filter: isEditMode ? 'grayscale(80%)' : 'none', // Grau im Edit Mode
    pointerEvents: isEditMode ? 'none' : 'auto', // Nicht klickbar im Edit Mode (damit man drüber zeichnen kann)
    transition: 'all 0.3s ease',
    zIndex: 0
  };

  return (
    <div className="app-block" style={containerStyle}>
      <div className="block-title" style={{ fontSize: isEditMode ? '0.8rem' : '1rem' }}>
        {props.simpleName}
      </div>
    </div>
  );
};
