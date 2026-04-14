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
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{width: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column'}}>
        
        {/* Header mit Logo und App Name */}
        <div className="modal-header" style={{background: 'white', borderBottom: '1px solid #eee', color: '#333', padding: '20px'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
              <div style={{
                  background: color, 
                  width: '50px', height: '50px',
                  borderRadius: '12px', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
              }}>
                 {/* WICHTIG: Wir übergeben exePath UND title für bestes Matching */}
                 <AppIcon path={exePath} appName={title} fallbackColor="white" size={36} />
              </div>
              <div>
                  <h2 style={{fontSize: '1.3rem', margin: 0, fontWeight: '800', color: '#2c3e50'}}>{title}</h2>
                  <span style={{fontSize: '0.9rem', color: '#7f8c8d'}}>Aktivitäts-Details</span>
              </div>
          </div>
        </div>

        {/* Scrollbare Liste */}
        <div className="modal-body" style={{flex: 1, overflowY: 'auto', padding: '0', background: '#f8fafc'}}>
          <div style={{padding: '15px 20px', borderBottom: '1px solid #eee', fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase'}}>
            Verlauf ({subEvents.length} Einträge)
          </div>
          
          <div style={{padding: '10px 20px'}}>
            {subEvents.map((event, index) => (
              <div key={index} style={{
                  display: 'flex', gap: '15px', marginBottom: '12px', alignItems: 'flex-start'
              }}>
                {/* Zeitstempel */}
                <div style={{
                    minWidth: '50px', textAlign: 'right', fontSize: '0.8rem', 
                    color: '#94a3b8', fontWeight: '600', paddingTop: '3px'
                }}>
                    {event.time}
                </div>
                
                {/* Timeline Linie & Punkt */}
                <div style={{position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                    <div style={{width: '10px', height: '10px', borderRadius: '50%', background: color, border: '2px solid white', boxShadow: '0 0 0 1px #e2e8f0', zIndex: 2}}></div>
                    {index < subEvents.length - 1 && (
                        <div style={{width: '2px', flex: 1, background: '#e2e8f0', minHeight: '20px', marginTop: '-2px'}}></div>
                    )}
                </div>

                {/* Detail Karte */}
                <div style={{
                    flex: 1, background: 'white', padding: '8px 12px', borderRadius: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9',
                    fontSize: '0.9rem', color: '#334155', lineHeight: '1.4', wordBreak: 'break-word'
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
