import React from 'react';
import { AppIcon } from './AppIcon';
import { ActivitySubEvent } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  exePath?: string;
  color: string;
  subEvents: ActivitySubEvent[];
}

export const ActivityDetailModal: React.FC<Props> = ({ isOpen, onClose, title, exePath, color, subEvents }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{width: '450px'}}>
        
        {/* Header */}
        <div className="modal-header" style={{background: 'white', borderBottom: '1px solid #eee', color: '#333'}}>
          <div style={{
              background: color, 
              padding: '10px', 
              borderRadius: '12px', 
              display: 'flex',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
             {/* Wir nutzen den Titel für das Mapping */}
             <AppIcon path={title} fallbackColor={color} className="modal-icon-small" />
          </div>
          <div>
              <h2 style={{fontSize: '1.1rem', margin: 0, fontWeight: '800'}}>{title}</h2>
              <span style={{fontSize: '0.8rem', color: '#999'}}>Aktivitäts-Protokoll</span>
          </div>
        </div>

        {/* Timeline Body */}
        <div className="modal-body" style={{maxHeight: '400px', overflowY: 'auto', padding: '20px', background: '#f8fafc'}}>
          
          <div style={{position: 'relative', paddingLeft: '20px'}}>
            {/* Vertikale Linie */}
            <div style={{
                position: 'absolute', left: '7px', top: '10px', bottom: '10px', 
                width: '2px', background: '#e2e8f0'
            }}></div>

            {subEvents.map((event, index) => (
              <div key={index} style={{marginBottom: '15px', position: 'relative'}}>
                {/* Punkt auf der Linie */}
                <div style={{
                    position: 'absolute', left: '-17px', top: '6px',
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: color, border: '2px solid white', boxShadow: '0 0 0 1px #e2e8f0'
                }}></div>
                
                {/* Zeit */}
                <div style={{fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600', marginBottom: '2px'}}>
                    {event.time}
                </div>
                
                {/* Titel Karte */}
                <div style={{
                    background: 'white', padding: '8px 12px', borderRadius: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9',
                    fontSize: '0.85rem', color: '#334155', lineHeight: '1.4'
                }}>
                    {event.title}
                </div>
              </div>
            ))}
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn-close" onClick={onClose}>Schließen</button>
        </div>

      </div>
    </div>
  );
};
